from pydantic import BaseModel

class Query(BaseModel):
    session_id: str
    question: str

class NewSessionRequest(BaseModel):
    title: str = "New Conversation"