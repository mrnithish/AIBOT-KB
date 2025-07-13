import os
import uuid
import json
import gzip
import base64
import time
import logging
import nltk
from pathlib import Path
import aiofiles
from fastapi import UploadFile, File, HTTPException, APIRouter
from llama_cloud_services import LlamaParse
from retry import retry
from fastapi.responses import JSONResponse
from app.config import settings, embed_model, index, gemini_model

router = APIRouter()
logger = logging.getLogger("ingestion")


# Gemini API usage tracker
gemini_request_count = 0
GEMINI_DAILY_QUOTA = 250
GEMINI_MINUTE_QUOTA = 10

@retry(tries=3, delay=17, backoff=2, exceptions=(Exception,))
async def generate_tags_and_summary(text: str):
    global gemini_request_count
    try:
        prompt = f"""
        You are an intelligent document assistant. Given the following content chunk, extract 3-5 relevant tags (keywords) and a concise summary (max 50 words).

        Content:
        {text[:5000]}

        Respond in JSON format:
        {{
            "tags": ["tag1", "tag2"],
            "summary": "A single, concise sentence summarizing the content in less than 50 words."
        }}
        """
        logger.info(f"Sending Gemini API request #{gemini_request_count + 1}")
        response = gemini_model.generate_content(prompt)
        gemini_request_count += 1
        time.sleep(15)
        result = json.loads(response.text.strip("```json\n").strip("```"))
        return result
    except json.JSONDecodeError as e:
        logger.warning(f"Gemini response not valid JSON: {str(e)}")
        return {"tags": [], "summary": ""}
    except Exception as e:
        logger.warning(f"Gemini failed to summarize chunk: {str(e)}")
        raise

def chunk_text(text: str, max_chunk_size: int = 1000):
    try:
        if not text or not isinstance(text, str):
            return [""]
        sentences = nltk.sent_tokenize(text)
        chunks = []
        current_chunk = []
        current_length = 0
        for sentence in sentences:
            if current_length + len(sentence.split()) > max_chunk_size:
                if current_chunk:
                    chunks.append(" ".join(current_chunk))
                    current_chunk = []
                    current_length = 0
            current_chunk.append(sentence)
            current_length += len(sentence.split())
        if current_chunk:
            chunks.append(" ".join(current_chunk))
        return chunks or [""]
    except Exception:
        return [text[i:i+max_chunk_size] for i in range(0, len(text), max_chunk_size)]

def safe_compress_text(text: str) -> str:
    try:
        compressed = gzip.compress(text.encode("utf-8"))
        encoded = base64.b64encode(compressed).decode("utf-8")
        return encoded
    except Exception as e:
        logger.warning(f"Compression error: {e}")
        return ""

@router.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    if file.size > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 10MB")

    temp_path = Path("temp_uploads") / f"{uuid.uuid4()}_{file.filename}"
    Path("temp_uploads").mkdir(exist_ok=True)
    Path("stored_pdfs").mkdir(exist_ok=True)
    stored_path = Path("stored_pdfs") / file.filename

    async with aiofiles.open(temp_path, "wb") as f:
        await f.write(file.file.read())
    async with aiofiles.open(stored_path, "wb") as f:
        async with aiofiles.open(temp_path, "rb") as temp_file:
            await f.write(await temp_file.read())

    @retry(tries=2, delay=2, backoff=2, exceptions=(Exception,))
    async def parse_pdf(path, num_workers=4, max_timeout=120):
        parser = LlamaParse(api_key=settings.LLAMA_PARSE_API_KEY, num_workers=num_workers, verbose=True, language="en", max_timeout=max_timeout)
        result = await parser.aparse(str(path))
        return result.get_text_documents(split_by_page=True)

    try:
        documents = await parse_pdf(temp_path)
    except:
        documents = await parse_pdf(temp_path, num_workers=1, max_timeout=180)

    all_vectors = []
    global_chunk_index = 0
    page_group_size = 5

    for group_start in range(0, len(documents), page_group_size):
        group_end = min(group_start + page_group_size, len(documents))
        page_range = f"{group_start + 1}-{group_end}"
        group_text = "\n".join(f"Page {group_start + i + 1}:\n{doc.text.strip()}" for i, doc in enumerate(documents[group_start:group_end]) if doc.text.strip())
        if not group_text.strip():
            continue
        compressed_group_text = safe_compress_text(group_text)
        chunks = chunk_text(group_text)
        for i, chunk in enumerate(chunks):
            chunk = chunk[:10000]
            vector = embed_model.encode(chunk, show_progress_bar=False)
            enrichment = await generate_tags_and_summary(chunk) if gemini_request_count < GEMINI_DAILY_QUOTA else {"tags": [], "summary": ""}
            compressed_chunk_text = safe_compress_text(chunk)
            if not compressed_chunk_text:
                continue
            metadata = {
                "id": str(uuid.uuid4()),
                "source_document": file.filename,
                "page_range": page_range,
                "text": compressed_group_text,
                "text_preview": chunk,
                "tags": enrichment.get("tags", [])[:5],
                "summary": (enrichment.get("summary", "").split(".", 1)[0].strip() + "." if "." in enrichment.get("summary", "") else enrichment.get("summary", "")[:150]),
                "token_count": len(chunk.split()),
                "embedding_model": "bge-large-en-v1.5"
            }
            if len(json.dumps(metadata).encode('utf-8')) > 40000:
                metadata["text"] = ""
                metadata["summary"] = ""
            all_vectors.append({
                "id": metadata["id"],
                "values": vector.tolist(),
                "metadata": metadata
            })
            global_chunk_index += 1

    if all_vectors:
        for i in range(0, len(all_vectors), 100):
            index.upsert(vectors=all_vectors[i:i+100])
        return {"status": "success", "uploaded_chunks": len(all_vectors)}
    else:
        return {"status": "success", "uploaded_chunks": 0}