import time
import gzip
import uuid
import base64
import logging
from datetime import datetime
from fastapi import APIRouter, HTTPException, Body
from app.config import embed_model, gemini_model, index, sessions_col, chat_history_col, reason_col
from app.models import Query, NewSessionRequest

router = APIRouter()
logger = logging.getLogger("chat")

@router.post("/ask")
async def ask_question(query: Query):
    try:
        # Step 1: Embed question and retrieve relevant context from Pinecone
        question_vector = embed_model.encode(query.question).tolist()
        matches = index.query(vector=question_vector, top_k=5, include_metadata=True)

        context_parts = []
        reason_docs = []
        for match in matches.matches:
            text = match.metadata.get("text")
            source = match.metadata.get("source_document")
            page_range = match.metadata.get("page_range")

            if text:
                try:
                    decompressed = gzip.decompress(base64.b64decode(text)).decode("utf-8", errors="ignore")
                    decompressed = decompressed.strip()
                    context_parts.append(decompressed)
                    reason_docs.append({
                        "text": decompressed,
                        "score": match.score,
                        "source": source,
                        "page_range": page_range
                    })
                except Exception as e:
                    logger.warning(f"[Decompression error] Document: {source}, Page: {page_range} | Error: {e}")

        # Step 2: Retrieve the entire chat history for the session
        chat_history_query = {"session_id": query.session_id}
        chat_history = list(chat_history_col.find(chat_history_query).sort("timestamp", 1))

        conversation_lines = []
        history_for_response = []  # To store chat history for the response
        for entry in chat_history:
            q = entry.get("query", "").strip()
            a = entry.get("answer", "").strip()
            if q and a:
                conversation_lines.append(f"user: {q}")
                conversation_lines.append(f"assistant: {a}")
                history_for_response.append({"question": q, "answer": a})

        # Add the current question to conversation_lines for the prompt
        conversation_lines.append(f"user: {query.question.strip()}")

        # Step 3: Compose the prompt with chat history
        context_text = "\n---\n".join(context_parts)
        conversation_text = "\n".join(conversation_lines)

        prompt = f"""
You are a helpful assistant in a multi-turn conversation. 
Answer the user's questions based strictly on the CONTEXT and the CONVERSATION provided below.
The user may ask follow-up questions — use the entire conversation history to understand the context, especially for follow-up questions.

Rules:
- Use only the provided CONTEXT and CONVERSATION to answer.
- Do not guess or use any outside knowledge.
- Keep the format and style of the source text.
- No bullet points, symbols, or newlines unless present in the context.
- If the answer is not found in the CONTEXT, respond exactly with: "I couldn’t find that information in the provided documents."

---

CONTEXT:
{context_text}

---

CONVERSATION:
{conversation_text}
""".strip()

        # Step 4: Generate answer from Gemini
        response = gemini_model.generate_content(prompt)
        time.sleep(2)
        answer = response.text.strip()

        # Step 5: Store reasoning
        reason_id = reason_col.insert_one({
            "session_id": query.session_id,
            "question": query.question,
            "chunks": reason_docs,
            "timestamp": datetime.utcnow()
        }).inserted_id

        # Step 6: Save chat history
        chat_history_col.insert_one({
            "session_id": query.session_id,
            "query": query.question,
            "answer": answer,
            "reason_id": reason_id,
            "timestamp": datetime.utcnow()
        })

        # Add the current question and answer to the history for the response
        history_for_response.append({"question": query.question, "answer": answer})

        # Step 7: Return final answer with chat history
        return {
            "answer": answer,
            "reason": reason_docs,
            "reason_id": str(reason_id),
            "chat_history": history_for_response  # Include the full chat history
        }

    except Exception as e:
        logger.error(f"Error during /ask: {str(e)}")
        raise HTTPException(status_code=500, detail="Something went wrong.")

@router.post("/new-session")
async def create_session(request: NewSessionRequest):
    try:
        session_id = str(uuid.uuid4())
        session_doc = {
            "session_id": session_id, 
            "title": request.title, # Use title from request
            "created_at": datetime.utcnow()
        }
        sessions_col.insert_one(session_doc)
        logger.info(f"Created new session: {session_id} with title '{request.title}'")
        return {"session_id": session_id, "title": session_doc["title"]}
    except Exception as e:
        logger.error(f"Error creating session: {str(e)}")
        raise HTTPException(status_code=500, detail="Error creating session")

@router.get("/sessions")
async def list_sessions():
    return list(sessions_col.find({}, {"_id": 0, "session_id": 1, "title": 1}))

@router.delete("/session/{session_id}")
async def delete_session(session_id: str):
    try:
        # Delete session entry
        sessions_col.delete_one({"session_id": session_id})
        
        # Delete related chat history and reasoning
        chat_entries = list(chat_history_col.find({"session_id": session_id}))
        for entry in chat_entries:
            if "reason_id" in entry:
                reason_col.delete_one({"_id": entry["reason_id"]})
        chat_history_col.delete_many({"session_id": session_id})

        return {"message": "Session and related data deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting session: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete session")

@router.put("/session/{session_id}")
async def rename_session(session_id: str, data: dict = Body(...)):
    try:
        new_title = data.get("new_title")
        if not new_title:
            raise HTTPException(status_code=400, detail="Missing 'title' in request")

        result = sessions_col.update_one(
            {"session_id": session_id},
            {"$set": {"title": new_title}}
        )

        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Session not found")

        return {"message": "Session renamed successfully"}
    except Exception as e:
        logger.error(f"Error renaming session: {e}")
        raise HTTPException(status_code=500, detail="Failed to rename session")


@router.get("/chat/{session_id}")
async def get_chat_history(session_id: str):
    results = chat_history_col.find({"session_id": session_id}).sort("timestamp")
    chats = []
    for item in results:
        chats.append({"role": "user", "content": item["query"]})
        chats.append({"role": "assistant", "content": item["answer"], "reason": reason_col.find_one({"_id": item["reason_id"]}, {"_id": 0, "chunks": 1})["chunks"]})
    return chats