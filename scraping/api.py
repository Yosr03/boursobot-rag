from __future__ import annotations

from typing import Any, Optional
from datetime import datetime
from uuid import uuid4
import chromadb

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from rag import rag_pipeline, load_chroma_collection, load_embedding_model
from config import RAG_TOP_K, CHROMA_PATH

from database import (
    authenticate_user,
    create_user,
    create_conversation,
    list_conversations,
    get_conversation,
    rename_conversation,
    delete_conversation,
    save_message,
    list_messages,
    count_user_conversations,
    admin_stats,
    _connect,
    _hash_password,
    get_user_role,
    list_all_users,
    set_user_role,
    set_user_suspended,
    delete_user,
    update_last_seen,
    admin_list_conversations,
)
# ============================================================
# APPLICATION
# ============================================================

app = FastAPI(
    title="BoursoBot API",
    description="API backend pour le chatbot RAG BoursoBank",
    version="1.0.0",
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8443",
        "http://127.0.0.1:8443",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# MODELES PYDANTIC
# ============================================================

class SignupRequest(BaseModel):
    first_name: str
    last_name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str

class AdminRoleRequest(BaseModel):
    admin_id: int
    role: str


class AdminSuspendRequest(BaseModel):
    admin_id: int
    suspended: bool

class AuthResponse(BaseModel):
    success: bool
    message: str
    user: Optional[dict[str, Any]] = None


class ConversationCreateRequest(BaseModel):
    user_id: int
    title: str = "Nouveau chat"


class ConversationUpdateRequest(BaseModel):
    user_id: int
    title: str


class SaveMessageRequest(BaseModel):
    model_provider: Optional[str] = Field(default=None, pattern="^(OpenRouter|Ollama)$")
    """
    Modèle utilisé par le frontend pour sauvegarder un message.
    """

    conversation_id: int
    role: str
    content: str
    sources_json: Optional[str] = None
    user_id: int


class ChatRequest(BaseModel):

    message: str = Field(
        ...,
        min_length=1,
        description="Question de l'utilisateur",
    )

    provider: str = Field(
        default="OpenRouter",
        description="Provider LLM : OpenRouter ou Ollama",
    )

    n_results: int = Field(
        default=RAG_TOP_K,
        ge=1,
        le=20,
        description="Nombre de documents récupérés",
    )


class SourceResponse(BaseModel):

    document: str

    metadata: dict[str, Any] = Field(
        default_factory=dict
    )

    distance: Optional[float] = None


class ChatResponse(BaseModel):

    answer: str

    sources: list[SourceResponse]

    question: str

class AdminStatsRequest(BaseModel):
    user_id: int

# ============================================================
# ROUTE RACINE
# ============================================================

@app.get("/")
def root():

    return {
        "status": "ok",
        "application": "BoursoBot API",
        "version": "1.0.0",
        "message": "API BoursoBot opérationnelle.",
    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/api/health")
def health():

    return {
        "status": "ok",
        "service": "BoursoBot",
    }


# ============================================================
# TEST
# ============================================================

@app.get("/api/test")
def test_api():

    return {
        "message": "BoursoBot API fonctionne.",
        "rag": "ready",
    }


# ============================================================
# CHAT / RAG
# ============================================================

@app.post(
    "/api/chat",
    response_model=ChatResponse,
)
def chat(request: ChatRequest):

    question = request.message.strip()

    if not question:
        raise HTTPException(
            status_code=400,
            detail="La question ne peut pas être vide.",
        )

    allowed_providers = {
        "openrouter",
        "ollama",
    }

    if request.provider.lower() not in allowed_providers:

        raise HTTPException(
            status_code=400,
            detail=(
                "Provider invalide. "
                "Utilise OpenRouter ou Ollama."
            ),
        )

    try:

        result = rag_pipeline(
            question=question,
            provider=request.provider,
            n_results=request.n_results,
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except RuntimeError as exc:

        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=(
                "Une erreur inattendue est survenue "
                "pendant le traitement de la question."
            ),
        ) from exc

    sources = []

    for source in result.get("sources", []):

        sources.append(
            SourceResponse(
                document=source.get(
                    "document",
                    "",
                ),
                metadata=source.get(
                    "metadata",
                    {},
                ),
                distance=source.get(
                    "distance"
                ),
            )
        )

    return ChatResponse(
        question=result.get(
            "question",
            question,
        ),
        answer=result.get(
            "answer",
            "",
        ),
        sources=sources,
    )


# ============================================================
# AUTHENTIFICATION
# ============================================================

@app.post("/api/auth/signup")
def signup(data: SignupRequest):

    first_name = data.first_name.strip()
    last_name = data.last_name.strip()
    email = data.email.strip().lower()

    if not first_name:
        raise HTTPException(
            status_code=400,
            detail="Le prénom est requis.",
        )

    if not last_name:
        raise HTTPException(
            status_code=400,
            detail="Le nom est requis.",
        )

    if not email:
        raise HTTPException(
            status_code=400,
            detail="L'adresse email est requise.",
        )

    if not data.password:
        raise HTTPException(
            status_code=400,
            detail="Le mot de passe est requis.",
        )

    try:

        user = create_user(
            first_name=first_name,
            last_name=last_name,
            email=email,
            password=data.password,
        )

        return {
            "success": True,
            "message": "Compte créé avec succès.",
            "user": user,
        }

    except ValueError as exc:

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc


# ============================================================
# LOGIN
# ============================================================

@app.post(
    "/api/auth/login",
    response_model=AuthResponse,
)
def login(request: LoginRequest):

    email = request.email.strip().lower()

    try:

        user = authenticate_user(
            email,
            request.password,
        )

    except PermissionError as exc:

        raise HTTPException(
            status_code=403,
            detail=str(exc),
        ) from exc

    if not user:

        raise HTTPException(
            status_code=401,
            detail="Adresse email ou mot de passe incorrect.",
        )

    return AuthResponse(
        success=True,
        message="Connexion réussie.",
        user=user,
    )

# ============================================================
# CONVERSATIONS
# ============================================================

@app.post("/api/conversations")
def create_new_conversation(
    request: ConversationCreateRequest,
):

    try:

        conversation_id = create_conversation(
            user_id=request.user_id,
            title=request.title,
        )

        conversation = get_conversation(
            conversation_id,
            request.user_id,
        )

        if not conversation:

            raise HTTPException(
                status_code=404,
                detail="Conversation introuvable après création.",
            )

        return conversation

    except HTTPException:
        raise

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc


# ============================================================
# LISTE DES CONVERSATIONS
# ============================================================

@app.get("/api/conversations/{user_id}")
def get_user_conversations(
    user_id: int,
):

    try:

        conversations = list_conversations(
            user_id
        )

        # IMPORTANT :
        # On retourne directement le tableau
        # car App.tsx utilise data.map(...)

        return conversations

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc


# ============================================================
# UNE CONVERSATION
# ============================================================

@app.get("/api/conversation/{conversation_id}")
def get_single_conversation(
    conversation_id: int,
    user_id: int,
):

    conversation = get_conversation(
        conversation_id,
        user_id,
    )

    if not conversation:

        raise HTTPException(
            status_code=404,
            detail="Conversation introuvable.",
        )

    return conversation


# ============================================================
# MESSAGES D'UNE CONVERSATION
# ============================================================

@app.get(
    "/api/conversations/{conversation_id}/messages"
)
def get_conversation_messages(
    conversation_id: int,
    user_id: int,
):

    conversation = get_conversation(
        conversation_id,
        user_id,
    )

    if not conversation:

        raise HTTPException(
            status_code=404,
            detail="Conversation introuvable.",
        )

    messages = list_messages(
        conversation_id,
        user_id,
    )

    # IMPORTANT :
    # App.tsx fait directement data.map(...)
    # donc on retourne directement le tableau.

    return messages


# ============================================================
# RENOMMER UNE CONVERSATION
# ============================================================

@app.patch(
    "/api/conversations/{conversation_id}"
)
def update_conversation(
    conversation_id: int,
    request: ConversationUpdateRequest,
):

    conversation = get_conversation(
        conversation_id,
        request.user_id,
    )

    if not conversation:

        raise HTTPException(
            status_code=404,
            detail="Conversation introuvable.",
        )

    rename_conversation(
        conversation_id,
        request.user_id,
        request.title,
    )

    updated = get_conversation(
        conversation_id,
        request.user_id,
    )

    return updated


# ============================================================
# SUPPRIMER UNE CONVERSATION
# ============================================================

@app.delete(
    "/api/conversations/{conversation_id}"
)
def remove_conversation(
    conversation_id: int,
    user_id: int,
):

    conversation = get_conversation(
        conversation_id,
        user_id,
    )

    if not conversation:

        raise HTTPException(
            status_code=404,
            detail="Conversation introuvable.",
        )

    delete_conversation(
        conversation_id,
        user_id,
    )

    return {
        "success": True,
        "message": "Conversation supprimée.",
    }


# ============================================================
# SAUVEGARDER UN MESSAGE
# ============================================================

@app.post("/api/messages")
def create_new_message(
    request: SaveMessageRequest,
):

    try:

        save_message(
            conversation_id=request.conversation_id,
            user_id=request.user_id,
            role=request.role,
            content=request.content,
            sources_json=request.sources_json,
            model_provider=request.model_provider,
        )

        # Récupérer le dernier message enregistré

        messages = list_messages(
            request.conversation_id,
            request.user_id,
        )

        if not messages:

            raise HTTPException(
                status_code=500,
                detail="Le message n'a pas pu être récupéré après sauvegarde.",
            )

        saved_message = messages[-1]

        return saved_message

    except PermissionError as exc:

        raise HTTPException(
            status_code=403,
            detail=str(exc),
        ) from exc

    except ValueError as exc:

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except HTTPException:
        raise

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc


# ============================================================
# SAUVEGARDER UN MESSAGE
# VERSION ALTERNATIVE AVEC /conversations/{id}/messages
# ============================================================

@app.post(
    "/api/conversations/{conversation_id}/messages"
)
def add_message(
    conversation_id: int,
    request: SaveMessageRequest,
):

    try:

        # Vérification que conversation_id
        # correspond bien à celui de l'URL

        if request.conversation_id != conversation_id:

            raise HTTPException(
                status_code=400,
                detail=(
                    "L'identifiant de conversation "
                    "ne correspond pas à l'URL."
                ),
            )

        save_message(
            conversation_id=conversation_id,
            user_id=request.user_id,
            role=request.role,
            content=request.content,
            sources_json=request.sources_json,
            model_provider=request.model_provider,
        )

        messages = list_messages(
            conversation_id,
            request.user_id,
        )

        if not messages:

            raise HTTPException(
                status_code=500,
                detail="Le message n'a pas pu être récupéré.",
            )

        return messages[-1]

    except PermissionError as exc:

        raise HTTPException(
            status_code=403,
            detail=str(exc),
        ) from exc

    except ValueError as exc:

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except HTTPException:
        raise

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc

# ============================================================
# ADMIN - UTILISATEURS
# ============================================================

def is_admin(admin_id: int) -> bool:
    import sqlite3

    db = sqlite3.connect("app_data/chatdb.db")
    db.row_factory = sqlite3.Row

    user = db.execute(
        "SELECT role FROM users WHERE id = ?",
        (admin_id,)
    ).fetchone()

    db.close()

    return user is not None and user["role"] == "admin"

@app.get("/api/admin/users")
def get_admin_users(admin_id: int):
    if not is_admin(admin_id):
        raise HTTPException(
            status_code=403,
            detail="Accès réservé aux administrateurs"
        )

    import sqlite3

    db = sqlite3.connect("app_data/chatdb.db")
    db.row_factory = sqlite3.Row

    users = db.execute("""
        SELECT id, first_name, last_name, username, email, role, created_at, last_seen
        FROM users
        ORDER BY id DESC
    """).fetchall()

    db.close()

    return [dict(user) for user in users]


# ============================================================
# ADMIN - CONVERSATIONS
# ============================================================

@app.get("/api/admin/conversations")
def get_admin_conversations(admin_id: int):

    if not is_admin(admin_id):
        raise HTTPException(
            status_code=403,
            detail="Accès administrateur refusé."
        )

    try:
        return {
            "success": True,
            "conversations": admin_list_conversations(),
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc
# ============================================================
# STATISTIQUES UTILISATEUR
# ============================================================

@app.get(
    "/api/users/{user_id}/stats"
)
def get_user_stats(
    user_id: int,
):

    try:

        conversations = count_user_conversations(
            user_id
        )

        return {
            "conversations": conversations,
        }

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc


@app.post("/api/admin/stats")
def get_admin_stats(request: AdminStatsRequest):

    try:
        with _connect() as conn:
            row = conn.execute(
                """
                SELECT id, role
                FROM users
                WHERE id = ?
                """,
                (request.user_id,),
            ).fetchone()

        if not row:
            raise HTTPException(
                status_code=404,
                detail="Utilisateur introuvable.",
            )

        if row["role"] != "admin":
            raise HTTPException(
                status_code=403,
                detail="Accès administrateur refusé.",
            )

        return admin_stats()

    except HTTPException:
        raise

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc
    
# ============================================================
# ADMIN - VERIFICATION DES DROITS
# ============================================================

def require_admin(admin_id: int):

    role = get_user_role(admin_id)

    if role != "admin":

        raise HTTPException(
            status_code=403,
            detail="Accès réservé aux administrateurs.",
        )


# ============================================================
# ADMIN - LISTE DES UTILISATEURS
# ============================================================

@app.get("/api/admin/users")
def get_admin_users(
    admin_id: int,
):

    require_admin(admin_id)

    try:

        return list_all_users()

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc


# ============================================================
# ADMIN - PROMOUVOIR / RETROGRADER
# ============================================================

@app.put(
    "/api/admin/users/{user_id}/role"
)
def update_user_role(
    user_id: int,
    request: AdminRoleRequest,
):

    require_admin(request.admin_id)

    # L'admin ne peut pas modifier son propre rôle
    if user_id == request.admin_id:

        raise HTTPException(
            status_code=400,
            detail=(
                "Vous ne pouvez pas modifier "
                "votre propre rôle."
            ),
        )

    try:

        updated = set_user_role(
            user_id=user_id,
            role=request.role,
        )

        return {
            "success": True,
            "user": updated,
        }

    except ValueError as exc:

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc


# ============================================================
# ADMIN - SUSPENDRE / REACTIVER
# ============================================================

@app.put(
    "/api/admin/users/{user_id}/suspend"
)
def update_user_suspension(
    user_id: int,
    request: AdminSuspendRequest,
):

    require_admin(request.admin_id)

    # L'admin ne peut pas se suspendre lui-même
    if user_id == request.admin_id:

        raise HTTPException(
            status_code=400,
            detail=(
                "Vous ne pouvez pas suspendre "
                "votre propre compte."
            ),
        )

    try:

        updated = set_user_suspended(
            user_id=user_id,
            suspended=request.suspended,
        )

        return {
            "success": True,
            "user": updated,
        }

    except ValueError as exc:

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc


# ============================================================
# ADMIN - SUPPRIMER UTILISATEUR
# ============================================================

@app.delete(
    "/api/admin/users/{user_id}"
)
def remove_admin_user(
    user_id: int,
    admin_id: int,
):

    require_admin(admin_id)

    # L'admin ne peut pas supprimer son propre compte
    if user_id == admin_id:

        raise HTTPException(
            status_code=400,
            detail=(
                "Vous ne pouvez pas supprimer "
                "votre propre compte."
            ),
        )

    try:

        delete_user(user_id)

        return {
            "success": True,
            "message": "Utilisateur supprimé avec succès.",
        }

    except ValueError as exc:

        raise HTTPException(
            status_code=404,
            detail=str(exc),
        ) from exc

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc
    
@app.post("/api/users/{user_id}/heartbeat")
def user_heartbeat(user_id: int):
    update_last_seen(user_id)
    return {"success": True}





# Documents de la base de connaissances. Les brouillons restent hors de la
# collection interrogée par le RAG.
class DocumentPayload(BaseModel):
    bank: str = "BoursoBank"
    product_family: str = "other"
    source_url: str = ""
    titre_page: str = Field(min_length=1)
    groupe_offres: str = ""
    type_produit: str = Field(min_length=1)
    chunk_text: str = Field(min_length=1)
    chunk_id: int = 0
    status: str = "active"


def _document_collections():
    active = load_chroma_collection()
    draft = chromadb.PersistentClient(path=CHROMA_PATH).get_or_create_collection(name=active.name + "_drafts")
    return active, draft


def _document_result(doc_id, content, metadata, status):
    m = metadata or {}
    return {"id": doc_id, "bank": m.get("bank", "BoursoBank"),
            "product_family": m.get("product_family", "other"),
            "source_url": m.get("source_url", ""),
            "titre_page": m.get("titre_page", ""),
            "groupe_offres": m.get("groupe_offres", ""),
            "type_produit": m.get("type_produit", ""),
            "chunk_text": content or "", "chunk_length": len(content or ""),
            "chunk_id": m.get("chunk_id", 0),
            "addedAt": m.get("addedAt", ""), "status": status}


def _locate_document(doc_id):
    for status, collection in zip(("active", "draft"), _document_collections()):
        result = collection.get(ids=[doc_id], include=["documents", "metadatas", "embeddings"])
        if result["ids"]:
            return status, collection, result
    raise HTTPException(status_code=404, detail="Document introuvable.")


@app.get("/api/admin/documents")
def list_admin_documents(admin_id: int):
    require_admin(admin_id)
    docs = []
    for status, collection in zip(("active", "draft"), _document_collections()):
        for offset in range(0, collection.count(), 500):
            result = collection.get(limit=500, offset=offset, include=["documents", "metadatas"])
            docs.extend(_document_result(i, d, m, status)
                        for i, d, m in zip(result["ids"], result["documents"], result["metadatas"]))
    return docs


def _allocate_chunk_id() -> int:
    """Réserver un numéro persistant, sans réutiliser ceux supprimés."""
    from pathlib import Path
    collections = _document_collections()
    key = str(Path(CHROMA_PATH).resolve()) + "::" + collections[0].name
    with _connect() as conn:
        conn.execute("BEGIN IMMEDIATE")
        conn.execute("CREATE TABLE IF NOT EXISTS document_chunk_sequences "
                     "(collection_key TEXT PRIMARY KEY, next_id INTEGER NOT NULL)")
        row = conn.execute("SELECT next_id FROM document_chunk_sequences WHERE collection_key = ?", (key,)).fetchone()
        if row:
            chunk_id = int(row["next_id"])
        else:
            highest = -1
            for collection in collections:
                for offset in range(0, collection.count(), 500):
                    result = collection.get(limit=500, offset=offset, include=["metadatas"])
                    for metadata in result["metadatas"]:
                        try:
                            highest = max(highest, int((metadata or {}).get("chunk_id", -1)))
                        except (ValueError, TypeError):
                            continue
            chunk_id = highest + 1
        conn.execute("INSERT INTO document_chunk_sequences(collection_key,next_id) VALUES (?,?) "
                     "ON CONFLICT(collection_key) DO UPDATE SET next_id=excluded.next_id", (key, chunk_id + 1))
    return chunk_id


@app.post("/api/admin/documents", status_code=201)
def create_admin_document(payload: DocumentPayload, admin_id: int):
    require_admin(admin_id)
    if payload.status not in ("active", "draft"):
        raise HTTPException(status_code=422, detail="Statut invalide.")
    content = payload.chunk_text.strip()
    metadata = payload.model_dump(exclude={"chunk_text", "status", "chunk_id"})
    metadata["addedAt"] = datetime.now().date().isoformat()
    metadata["chunk_length"] = len(content)
    embedding = load_embedding_model().encode(["passage: " + content],
                        normalize_embeddings=True, convert_to_numpy=True)[0].tolist()
    collection = _document_collections()[0 if payload.status == "active" else 1]
    doc_id = "admin_" + uuid4().hex
    metadata["chunk_id"] = _allocate_chunk_id()
    collection.add(ids=[doc_id], documents=[content], metadatas=[metadata], embeddings=[embedding])
    return _document_result(doc_id, content, metadata, payload.status)


@app.put("/api/admin/documents/{doc_id}")
def update_admin_document(doc_id: str, payload: DocumentPayload, admin_id: int):
    require_admin(admin_id)
    if payload.status not in ("active", "draft"):
        raise HTTPException(status_code=422, detail="Statut invalide.")
    old_status, old_collection, old = _locate_document(doc_id)
    content = payload.chunk_text.strip()
    metadata = dict(old["metadatas"][0] or {})
    metadata.update(payload.model_dump(exclude={"chunk_text", "status", "chunk_id"}))
    metadata["addedAt"] = metadata.get("addedAt") or datetime.now().date().isoformat()
    metadata["chunk_length"] = len(content)
    embedding = (old["embeddings"][0].tolist() if hasattr(old["embeddings"][0], "tolist")
                 else old["embeddings"][0]) if old["documents"][0] == content else load_embedding_model().encode(
                 ["passage: " + content], normalize_embeddings=True, convert_to_numpy=True)[0].tolist()
    new_collection = _document_collections()[0 if payload.status == "active" else 1]
    if old_status == payload.status:
        old_collection.update(ids=[doc_id], documents=[content], metadatas=[metadata], embeddings=[embedding])
    else:
        new_collection.add(ids=[doc_id], documents=[content], metadatas=[metadata], embeddings=[embedding])
        old_collection.delete(ids=[doc_id])
    return _document_result(doc_id, content, metadata, payload.status)


@app.delete("/api/admin/documents/{doc_id}")
def delete_admin_document(doc_id: str, admin_id: int):
    require_admin(admin_id)
    _, collection, _ = _locate_document(doc_id)
    collection.delete(ids=[doc_id])
    return {"success": True}


@app.get("/api/admin/messages-per-day")
def get_admin_messages_per_day(admin_id: int):
    """Messages enregistrés (utilisateurs et assistant), sur 7 jours."""
    from datetime import timedelta
    require_admin(admin_id)
    today = datetime.now().date()
    first_day = today - timedelta(days=6)
    next_day = today + timedelta(days=1)
    with _connect() as conn:
        rows = conn.execute(
            "SELECT date(created_at) AS day, COUNT(*) AS total "
            "FROM messages WHERE date(created_at) >= ? AND date(created_at) < ? "
            "GROUP BY date(created_at)",
            (first_day.isoformat(), next_day.isoformat()),
        ).fetchall()
    totals = {row["day"]: row["total"] for row in rows}
    labels = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]
    return [{"date": (day := first_day + timedelta(days=i)).isoformat(),
             "label": labels[day.weekday()], "value": totals.get(day.isoformat(), 0)}
            for i in range(7)]


@app.get("/api/admin/usage-stats")
def get_admin_usage_stats(admin_id: int):
    """Répartition des questions par mots-clés et modèles des réponses sauvegardées."""
    import re
    import unicodedata
    require_admin(admin_id)
    with _connect() as conn:
        questions = conn.execute("SELECT content FROM messages WHERE role = 'user'").fetchall()
        models = conn.execute("SELECT model_provider, COUNT(*) AS total FROM messages WHERE role = 'assistant' GROUP BY model_provider").fetchall()
    categories = [
        ("Crédit", "#003883", {"credit", "pret", "emprunt", "emprunter", "financement", "hypotheque"}),
        ("Épargne", "#d20073", {"epargne", "livret", "ldds", "pel", "cel", "economiser"}),
        ("Investissement", "#7c3aed", {"investissement", "investir", "bourse", "pea", "titres", "etf", "actions", "assurance vie"}),
        ("Comptes et cartes", "#0891b2", {"compte", "carte", "cartes", "virement", "iban", "rib", "paiement"}),
    ]
    counts = [0] * (len(categories) + 1)
    for row in questions:
        text = "".join(c for c in unicodedata.normalize("NFD", row["content"].lower()) if not unicodedata.combining(c))
        words = set(re.findall(r"[a-z]+", text))
        scores = [sum(1 for key in keys if (key in text if " " in key else key in words)) for _, _, keys in categories]
        counts[scores.index(max(scores)) if max(scores) else len(categories)] += 1
    total_questions = len(questions)
    topics = [{"label": label, "color": color, "count": count,
               "value": round(count * 100 / total_questions, 1) if total_questions else 0}
              for (label, color), count in zip([(a,b) for a,b,_ in categories] + [("Autres", "#94A3B8")], counts)]
    model_counts = {r["model_provider"]: r["total"] for r in models}
    total_answers = sum(model_counts.get(provider, 0) for provider in ("OpenRouter", "Ollama"))
    model_usage = [{"label": label, "color": color, "count": model_counts.get(provider, 0),
                    "value": round(model_counts.get(provider, 0) * 100 / total_answers, 1) if total_answers else 0}
                   for provider, label, color in [("OpenRouter", "Llama 3.1 8B", "#003883"), ("Ollama", "Gemma2:2b", "#d20073")]]
    return {"topics": topics, "models": model_usage, "total_questions": total_questions, "total_answers": total_answers}
