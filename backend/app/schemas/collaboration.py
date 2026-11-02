from datetime import datetime
from pydantic import BaseModel

class CollaborationTicketResponse(BaseModel):
    token: str
    websocket_url: str
    expires_at: datetime
    role: str
