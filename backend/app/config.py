import logging
from pydantic_settings import BaseSettings
from pymongo import MongoClient
from pinecone import Pinecone
import google.generativeai as genai
from sentence_transformers import SentenceTransformer

class Settings(BaseSettings):
    PINECONE_API_KEY: str
    PINECONE_INDEX : str
    PINECONE_ENV : str
    GEMINI_API_KEY: str
    LLAMA_PARSE_API_KEY: str
    MONGO_URI: str

    class Config:
        env_file = ".env"

settings = Settings()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("backend")

# MongoDB
mongo_client = MongoClient(settings.MONGO_URI)
db = mongo_client["Complex"]
sessions_col = db["sessions"]
chat_history_col = db["chat_history"]
reason_col = db["reasoning"]

# Pinecone
pinecone = Pinecone(api_key=settings.PINECONE_API_KEY)
index = pinecone.Index(settings.PINECONE_INDEX)

# Embedding model
embed_model = SentenceTransformer("BAAI/bge-large-en-v1.5")

# Gemini
genai.configure(api_key=settings.GEMINI_API_KEY)
gemini_model = genai.GenerativeModel("gemini-2.5-flash")