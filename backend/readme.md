# FastAPI Document Ingestion & Chat Backend

This is a FastAPI-based backend service that allows you to upload PDFs, create sessions, ask questions about documents, and manage chat history.


## 🛠️ API Endpoints

### **Default**

---

### `POST /ask`  
**Ask Question**  
Send a question related to an uploaded document/session.

---

### `POST /new-session`  
**Create Session**  
Start a new chat session for Q&A with documents.

---

### `GET /sessions`  
**List Sessions**  
Retrieve a list of all available chat sessions.

---

### `DELETE /session/{session_id}`  
**Delete Session**  
Remove a session by its `session_id`.

---

### `PUT /session/{session_id}`  
**Rename Session**  
Rename a session using its `session_id`.

---

### `GET /chat/{session_id}`  
**Get Chat History**  
Get the full chat history for a session.

---

### `POST /upload-pdf`  
**Upload PDF**  
Upload a PDF document to associate it with a session.

---

## 🚀 Getting Started

### 1. Directory
```bash
cd backend
```


### 2. Set Environment Variables
#####  Create a .env file:
```bash
MONGO_URI=your_mongodb_uri
PINECONE_API_KEY=your_pinecone_key
GEMINI_API_KEY=your_gemini_key
LLAMA_PARSE_API_KEY=your_llama_key
```



### 3. **Build the Docker Image**

```bash
docker build -t aibot .
```

### 2. **Run the Docker Container**

```bash
docker run -p 8000:8000 aibot
```

### 3. **Access the API Docs**

Once the container is running, visit:
📄 [http://localhost:8000/docs](http://localhost:8000/docs)
You’ll find an interactive Swagger UI to test all endpoints.

---

## 📁 Folder Structure

```
.
├── app/
│   ├── __init__.py               # FastAPI entry point
│   ├── chat.py                   # chat routes
│   ├── config                    # settings
│   ├── models.py                 # models
│   └── ingestion.py              # upload to vector db
├── requirements.txt
└── Dockerfile
```

---

## ✅ Requirements

* Python 3.9+
* Docker
* MongoDB (if used for session storage)

---

## 📦 Sample cURL Commands

```bash
# Upload a PDF
curl -X POST -F "file=@sample.pdf" http://localhost:8000/upload-pdf

# Create a session
curl -X POST http://localhost:8000/new-session

# Ask a question
curl -X POST -H "Content-Type: application/json" \
-d '{"session_id": "abc123", "question": "What is this document about?"}' \
http://localhost:8000/ask
```

---

## 🧠 Features

* Session-based document QA
* Persistent chat history
* PDF upload and ingestion
* OpenAPI documentation support

---

