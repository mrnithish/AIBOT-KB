# KnowledgeBot


**KnowledgeBot** is an intelligent document-grounded assistant that answers user questions based strictly on the content from uploaded documents. It uses semantic search and LLM-based reasoning to provide precise, context-aware answers through a simple chat interface.


## Key Requirements

*   Accepts **natural language questions** via a chat interface.  
    
*   Ingests and **indexes provided documents** for search and retrieval.  
    
*   Answers queries **only if information is found** in the documents.  
    
*   Responds with: _"I couldn't find that information in the provided documents."_ if the answer is not found.  
    
*   Supports **basic follow-up questions** using conversational history.  
    
*   Uses any suitable tech stack including **OpenAI**, **Gemini**, **open-source LLMs**, **Pinecone**, etc.  

## Approach

### Step 1: Document Ingestion

*   Users upload PDF documents via an API endpoint.
*   Documents are parsed using **LlamaParse** and split into pages.
*   Pages are grouped and chunked using **NLTK** to ensure manageable text sizes.
*   Chunks are embedded using **SentenceTransformers (bge-large-en-v1.5)**.
*   Each chunk, along with metadata (e.g. page range, tags, summary), is stored in **Pinecone** as a vector.

### Step 2: Question Answering

*   User submits a question via a chat interface.
*   The question is embedded and used to perform a vector similarity search in **Pinecone**.
*   Relevant chunks are retrieved and decompressed.
*   A prompt is dynamically constructed using retrieved context and prior conversation.
*   The prompt is sent to **Gemini** (LLM) to generate a grounded answer.
*   The full Q&A interaction is logged in **MongoDB**, including source reasoning.



### Step 3: Session Management

*   Each user conversation is tracked using a session ID.
*   Users can create, rename, delete, and retrieve session histories.
*   All session data is stored in **MongoDB** under separate collections for sessions, chat history, and reasoning.

## Architecture

### Components

*   **Frontend**: Simple chat UI using Next JS sends requests to backend.
*   **Backend API**: Built using FastAPI, hosts endpoints for chat and ingestion.
*   **Document Parser**: LlamaParse extracts raw text from PDFs.
*   **Text Chunker**: NLTK splits content into coherent sentence groups.
*   **Embedding Model**: SentenceTransformer generates 1024-d embeddings.
*   **Vector DB**: Pinecone stores vectors and performs similarity search.
*   **LLM Interface**: Gemini (via API) generates natural language answers.
*   **Database**: MongoDB stores session metadata, chat history, and source chunks.

## Limitations and Suggestions for Production

| Limitation | Suggested Improvements for Production |
| --- | --- |
| LLM Cost and Quota | Use open-source LLMs (e.g., Mistral, LLaMA 3) with local deployment or fine-tuned smaller models for reduced costs. Add request throttling and billing for user control. |
| Latency | Introduce asynchronous background tasks for LLM calls using Celery or FastAPI BackgroundTasks. Add streaming response support (e.g., Server-Sent Events). |
| Context Size | Use advanced context window management or retrieval-augmented generation (RAG) with re-ranking. Use chunk overlap or hierarchical chunking. |
| Dependence on Document Quality | Integrate (e.g., OpenAI embeddings) to improve parsing of scanned documents. Use preprocessing filters to remove noisy content. |
| Limited Multilingual Support | Replace embedding model with multilingual variants like LaBSE or distiluse-base-multilingual. Configure LLMs that support multilingual understanding. |
| No User Authentication | Add JWT-based authentication, role-based access, and session ownership. Use OAuth2 for federated identity support. |
| Fallback Simplicity | Use intent detection to offer better guidance or suggest rephrasing.Provide related questions if no direct answer found. |
| No Fine-tuning | Fine-tune the LLM on domain-specific Q&A pairs for better performance. Use LoRA or PEFT for efficient model updates. |

## Tech Stack

| Component | Technology Used |
| --- | --- |
| Backend API | FastAPI |
| Frontend | Next JS |
| Document Parsing | LlamaParse |
| Embedding Model | SentenceTransformers (BGE) |
| Vector Store | Pinecone |
| LLM Integration | Gemini API |
| Database | MongoDB |
| Caching/Retry | Retry, Base64 + GZip |
|  |  |

## Testing

*   You can test the API using **Postman**, **curl** or **swagger**  
    
*   Ensure documents are indexed before asking questions.  
    
*   Try asking unrelated questions to test the fallback.  
    

## Future Improvements

*   Integrate OpenAIand Open AI Vector Embeddings
*   Implement multithreading and concurrency  
    
*   Add user authentication.  
    
*   Add summarization and document preview in UI.
