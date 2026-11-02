import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status
import jwt
from sqlalchemy import and_, case, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_current_user
from app.db.session import get_db
from app.core.config import settings
from app.schemas.collaboration import CollaborationTicketResponse
from app.models.document import Document, DocumentMember
from app.models.user import User
from app.schemas.document import DocumentCreate, DocumentResponse, DocumentUpdate

router = APIRouter(prefix="/documents", tags=["Documents"])

def document_response(document: Document, role: str) -> DocumentResponse:
    return DocumentResponse(
        id=document.id, title=document.title, owner_id=document.owner_id, role=role,
        schema_version=document.schema_version, created_at=document.created_at,
        updated_at=document.updated_at,
    )

async def get_document_access(document_id: uuid.UUID, user: User, db: AsyncSession):
    result = await db.execute(
        select(Document, DocumentMember.role)
        .outerjoin(DocumentMember, and_(
            DocumentMember.document_id == Document.id,
            DocumentMember.user_id == user.id,
        ))
        .where(
            Document.id == document_id, Document.deleted_at.is_(None),
            or_(Document.owner_id == user.id, DocumentMember.user_id == user.id),
        )
    )
    row = result.first()
    if row is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    document, member_role = row
    return document, ("owner" if document.owner_id == user.id else member_role)

@router.post("", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def create_document(payload: DocumentCreate, current_user: User = Depends(get_current_user),
                          db: AsyncSession = Depends(get_db)):
    title = payload.title.strip() or "Untitled document"
    document = Document(owner_id=current_user.id, title=title)
    db.add(document)
    await db.commit()
    await db.refresh(document)
    return document_response(document, "owner")

@router.get("", response_model=list[DocumentResponse])
async def list_documents(limit: int = Query(default=50, ge=1, le=100), offset: int = Query(default=0, ge=0),
                         current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    role_expr = case((Document.owner_id == current_user.id, "owner"), else_=DocumentMember.role).label("role")
    result = await db.execute(
        select(Document, role_expr)
        .outerjoin(DocumentMember, and_(
            DocumentMember.document_id == Document.id, DocumentMember.user_id == current_user.id,
        ))
        .where(Document.deleted_at.is_(None),
               or_(Document.owner_id == current_user.id, DocumentMember.user_id == current_user.id))
        .order_by(Document.updated_at.desc()).limit(limit).offset(offset)
    )
    return [document_response(doc, role) for doc, role in result.all()]

@router.get("/{document_id}", response_model=DocumentResponse)
async def read_document(document_id: uuid.UUID, current_user: User = Depends(get_current_user),
                        db: AsyncSession = Depends(get_db)):
    document, role = await get_document_access(document_id, current_user, db)
    return document_response(document, role)

@router.patch("/{document_id}", response_model=DocumentResponse)
async def rename_document(document_id: uuid.UUID, payload: DocumentUpdate,
                          current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    document, role = await get_document_access(document_id, current_user, db)
    if role != "owner":
        raise HTTPException(status_code=403, detail="Only the document owner can rename it.")
    document.title = payload.title.strip()
    document.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(document)
    return document_response(document, "owner")

@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(document_id: uuid.UUID, current_user: User = Depends(get_current_user),
                          db: AsyncSession = Depends(get_db)):
    document, role = await get_document_access(document_id, current_user, db)
    if role != "owner":
        raise HTTPException(status_code=403, detail="Only the document owner can delete it.")
    document.deleted_at = datetime.now(timezone.utc)
    await db.commit()

@router.post("/{document_id}/collaboration-ticket", response_model=CollaborationTicketResponse)
async def create_collaboration_ticket(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Issue a short-lived JWT scoped to one authorized document."""
    _, role = await get_document_access(document_id, current_user, db)
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(seconds=settings.collaboration_ticket_seconds)
    claims = {
        "sub": str(current_user.id),
        "document_id": str(document_id),
        "role": role,
        "iat": now,
        "exp": expires_at,
        "iss": "syncdraft-api",
        "aud": "syncdraft-collab",
        "scope": "document:connect",
    }
    token = jwt.encode(claims, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return CollaborationTicketResponse(
        token=token, websocket_url=settings.collaboration_url,
        expires_at=expires_at, role=role,
    )
