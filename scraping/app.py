# from __future__ import annotations

# import json
# import os
# from pathlib import Path
# from typing import Any

# import chromadb
# import streamlit as st
# from dotenv import load_dotenv
# from openai import OpenAI
# from sentence_transformers import SentenceTransformer

# from database import (
#     admin_stats,
#     authenticate_user,
#     create_conversation,
#     delete_conversation,
#     get_conversation,
#     list_conversations,
#     list_messages,
#     rename_conversation,
#     save_message,
# )
# from styles import inject_css


# # ============================================================
# # CONFIGURATION
# # ============================================================

# BASE_DIR = Path(__file__).resolve().parent
# load_dotenv(BASE_DIR / ".env")

# CHROMA_PATH = os.getenv("CHROMA_PATH", str(BASE_DIR / "chroma_db"))
# COLLECTION_NAME = os.getenv(
#     "CHROMA_COLLECTION",
#     "boursobank_rag_bge_m3",
# )

# BGE_MODEL_NAME = os.getenv(
#     "BGE_MODEL_NAME",
#     "BAAI/bge-m3",
# )

# OPENROUTER_MODEL = os.getenv(
#     "OPENROUTER_MODEL",
#     "meta-llama/llama-3.1-8b-instruct",
# )

# OLLAMA_MODEL = os.getenv(
#     "OLLAMA_MODEL",
#     "llama3.1",
# )

# OLLAMA_BASE_URL = os.getenv(
#     "OLLAMA_BASE_URL",
#     "http://localhost:11434/v1",
# )

# OPENROUTER_BASE_URL = os.getenv(
#     "OPENROUTER_BASE_URL",
#     "https://openrouter.ai/api/v1",
# )

# TOP_K = int(os.getenv("RAG_TOP_K", "5"))


# # ============================================================
# # PROMPT — repris de la logique de modeling.ipynb
# # ============================================================

# SYSTEM_PROMPT = """
# Tu es ChatBot, un assistant expert des produits et services de BoursoBank.

# Tu réponds UNIQUEMENT en te basant sur le contexte documentaire fourni.

# RÈGLES STRICTES :
# 1. Si la question ne concerne pas BoursoBank, réponds exactement :
#    "Je ne peux répondre qu'aux questions concernant BoursoBank."
# 2. Si l'information demandée n'est pas présente dans le contexte fourni, réponds exactement :
#    "L'information n'est pas disponible dans la base documentaire."
# 3. Ne jamais inventer d'information.
# 4. Ne jamais donner de conseil financier personnalisé.
# 5. Ne jamais faire de supposition.
# 6. Réponds de manière claire, structurée et professionnelle.
# 7. Utilise uniquement les informations présentes dans le contexte.
# """


# # ============================================================
# # RESSOURCES
# # ============================================================

# @st.cache_resource(show_spinner="Chargement de BGE-M3…")
# def load_embedding_model() -> SentenceTransformer:
#     return SentenceTransformer(BGE_MODEL_NAME)


# @st.cache_resource(show_spinner="Connexion à ChromaDB…")
# def load_chroma_collection():
#     client = chromadb.PersistentClient(path=CHROMA_PATH)

#     # Important :
#     # on récupère la collection déjà créée par le travail précédent.
#     return client.get_collection(name=COLLECTION_NAME)


# # ============================================================
# # RAG
# # ============================================================

# def search_bge(
#     question: str,
#     n_results: int = TOP_K,
#     filters: dict[str, Any] | None = None,
# ) -> dict[str, Any]:
#     """
#     Même logique que dans le notebook :
#         "query: " + question
#         BGE-M3
#         normalize_embeddings=True
#         ChromaDB
#         Top-K
#     """

#     embedding_model = load_embedding_model()
#     collection = load_chroma_collection()

#     query_embedding = embedding_model.encode(
#         ["query: " + question],
#         normalize_embeddings=True,
#     ).tolist()

#     params: dict[str, Any] = {
#         "query_embeddings": query_embedding,
#         "n_results": n_results,
#         "include": [
#             "documents",
#             "metadatas",
#             "distances",
#         ],
#     }

#     if filters:
#         params["where"] = filters

#     return collection.query(**params)


# def build_context(documents: list[str]) -> str:
#     return "\n\n---\n\n".join(documents)


# def build_user_message(
#     question: str,
#     context: str,
# ) -> str:
#     return f"""
# CONTEXTE DOCUMENTAIRE :
# {context}

# QUESTION UTILISATEUR :
# {question}

# Réponds uniquement à partir du contexte ci-dessus.
# """


# # ============================================================
# # LLM
# # ============================================================

# def get_llm_client(provider: str) -> OpenAI:
#     if provider == "OpenRouter":
#         api_key = os.getenv(
#             "OPENROUTER_API_KEY",
#             "",
#         ).strip()

#         if not api_key:
#             raise RuntimeError(
#                 "OPENROUTER_API_KEY est absent du fichier .env."
#             )

#         return OpenAI(
#             api_key=api_key,
#             base_url=OPENROUTER_BASE_URL,
#         )

#     return OpenAI(
#         api_key=os.getenv(
#             "OLLAMA_API_KEY",
#             "ollama",
#         ),
#         base_url=OLLAMA_BASE_URL,
#     )


# def generate_answer(
#     question: str,
#     context: str,
#     provider: str,
# ) -> str:

#     if not context or len(context.strip()) < 20:
#         return (
#             "L'information n'est pas disponible "
#             "dans la base documentaire."
#         )

#     client = get_llm_client(provider)

#     model = (
#         OPENROUTER_MODEL
#         if provider == "OpenRouter"
#         else OLLAMA_MODEL
#     )

#     response = client.chat.completions.create(
#         model=model,
#         messages=[
#             {
#                 "role": "system",
#                 "content": SYSTEM_PROMPT,
#             },
#             {
#                 "role": "user",
#                 "content": build_user_message(
#                     question,
#                     context,
#                 ),
#             },
#         ],
#         temperature=0,
#         max_tokens=5000,
#     )

#     content = response.choices[0].message.content

#     return (
#         content.strip()
#         if content
#         else "L'information n'est pas disponible dans la base documentaire."
#     )


# def rag_pipeline(
#     question: str,
#     provider: str,
#     n_results: int = TOP_K,
# ) -> dict[str, Any]:

#     results = search_bge(
#         question,
#         n_results=n_results,
#     )

#     documents = (
#         results.get("documents", [[]])[0]
#         or []
#     )

#     metadatas = (
#         results.get("metadatas", [[]])[0]
#         or []
#     )

#     distances = (
#         results.get("distances", [[]])[0]
#         or []
#     )

#     context = build_context(documents)

#     answer = generate_answer(
#         question,
#         context,
#         provider,
#     )

#     sources = []

#     for i, document in enumerate(documents):

#         metadata = (
#             metadatas[i]
#             if i < len(metadatas)
#             else {}
#         )

#         distance = (
#             distances[i]
#             if i < len(distances)
#             else None
#         )

#         sources.append(
#             {
#                 "document": document,
#                 "metadata": metadata or {},
#                 "distance": distance,
#             }
#         )

#     return {
#         "question": question,
#         "answer": answer,
#         "context_used": documents,
#         "distances": distances,
#         "sources": sources,
#     }


# # ============================================================
# # SESSION
# # ============================================================

# def init_session() -> None:

#     defaults = {
#         "authenticated": False,
#         "user": None,
#         "conversation_id": None,
#         "provider": "OpenRouter",
#         "page": "chat",
#         "suggested_question": None,
#     }

#     for key, value in defaults.items():

#         if key not in st.session_state:
#             st.session_state[key] = value


# def logout() -> None:

#     st.session_state.clear()

#     st.session_state["authenticated"] = False

#     st.rerun()


# def ensure_conversation() -> int:

#     user = st.session_state["user"]

#     conversation_id = st.session_state.get(
#         "conversation_id"
#     )

#     if conversation_id:

#         conversation = get_conversation(
#             conversation_id,
#             user["id"],
#         )

#         if conversation:
#             return conversation_id

#     conversation_id = create_conversation(
#         user["id"]
#     )

#     st.session_state["conversation_id"] = (
#         conversation_id
#     )

#     return conversation_id


# def new_chat() -> None:

#     user = st.session_state["user"]

#     st.session_state["conversation_id"] = (
#         create_conversation(user["id"])
#     )

#     st.rerun()


# def select_conversation(
#     conversation_id: int,
# ) -> None:

#     user = st.session_state["user"]

#     if get_conversation(
#         conversation_id,
#         user["id"],
#     ):
#         st.session_state["conversation_id"] = (
#             conversation_id
#         )

#         st.rerun()


# # ============================================================
# # LOGIN
# # ============================================================

# def render_login() -> None:
#     """Page de connexion."""

#     # --------------------------------------------------------
#     # Logo + en-tête de la carte
#     # --------------------------------------------------------

#     st.html("""
#     <div class="login-page">

#         <div class="login-brand-top">

#             <div class="login-brand-icon">
#                 ✦
#             </div>

#             <div class="login-brand-text">
#                 <span class="brand-blue">Chat</span><span class="brand-pink">Bot</span>
#             </div>

#         </div>

#         <div class="login-card-header">

#             <div class="login-card-top"></div>

#             <div class="login-card-content">

#                 <div class="login-icon-circle">
#                     ✦
#                 </div>

#                 <h1>Bienvenue</h1>

#                 <p class="login-subtitle">
#                     Connectez-vous à votre assistant documentaire
#                 </p>

#                 <div class="login-secure-badge">
#                     <span class="secure-icon">●</span>
#                     <span>Accès sécurisé</span>
#                 </div>

#             </div>

#         </div>
#     """)

#     # --------------------------------------------------------
#     # Formulaire Streamlit
#     # --------------------------------------------------------

#     with st.form(
#         "login_form",
#         clear_on_submit=False,
#     ):

#         username = st.text_input(
#             "Nom d'utilisateur",
#             placeholder="Saisissez votre identifiant",
#             label_visibility="visible",
#         )

#         password = st.text_input(
#             "Mot de passe",
#             placeholder="Saisissez votre mot de passe",
#             type="password",
#             label_visibility="visible",
#         )

#         remember = st.checkbox(
#             "Mémoriser ma session",
#             value=False,
#         )

#         submitted = st.form_submit_button(
#             "Se connecter  →",
#             use_container_width=True,
#         )

#     # --------------------------------------------------------
#     # Authentification
#     # --------------------------------------------------------

#     if submitted:

#         user = authenticate_user(
#             username,
#             password,
#         )

#         if user:

#             st.session_state["authenticated"] = True
#             st.session_state["user"] = user
#             st.session_state["conversation_id"] = None
#             st.session_state["provider"] = "OpenRouter"
#             st.session_state["page"] = "chat"
#             st.session_state["remember"] = remember

#             st.rerun()

#         else:

#             st.error(
#                 "Nom d'utilisateur ou mot de passe incorrect."
#             )

#     # --------------------------------------------------------
#     # Footer de la carte
#     # --------------------------------------------------------

#     st.html("""
#         <div class="login-card-footer">

#             <div class="login-security">

#                 <span class="security-dot"></span>

#                 <span>Connexion sécurisée</span>

#             </div>

#             <div class="login-help">
#                 Assistant documentaire · BGE-M3 · ChromaDB · RAG
#             </div>

#         </div>

#         <div class="login-bottom">
#             Accès sécurisé · Assistant documentaire intelligent
#         </div>

#     </div>
#     """)


# # ============================================================
# # SIDEBAR
# # ============================================================

# def render_brand() -> None:

#     st.markdown(
#         """
#         <div class="brand">

#             <div class="brand-mark">
#                 B
#             </div>

#             <div>

#                 <div class="brand-name">
#                     ChatBot
#                 </div>

#                 <div class="brand-sub">
#                     Assistant documentaire
#                 </div>

#             </div>

#         </div>
#         """,
#         unsafe_allow_html=True,
#     )


# def render_sidebar() -> None:

#     user = st.session_state["user"]

#     with st.sidebar:

#         render_brand()

#         if st.button(
#             "＋  Nouveau chat",
#             use_container_width=True,
#         ):
#             new_chat()

#         st.markdown(
#             "<div class='sidebar-section-title'>Conversations</div>",
#             unsafe_allow_html=True,
#         )

#         conversations = list_conversations(
#             user["id"]
#         )

#         if not conversations:

#             st.markdown(
#                 "<div class='sidebar-empty'>Aucune conversation</div>",
#                 unsafe_allow_html=True,
#             )

#         for conversation in conversations:

#             conversation_id = conversation["id"]

#             title = (
#                 conversation["title"]
#                 or "Nouveau chat"
#             )

#             col1, col2 = st.columns(
#                 [5, 1]
#             )

#             with col1:

#                 active = (
#                     conversation_id
#                     == st.session_state.get(
#                         "conversation_id"
#                     )
#                 )

#                 label = (
#                     "●  " + title
#                     if active
#                     else title
#                 )

#                 if st.button(
#                     label[:42],
#                     key=f"conversation_{conversation_id}",
#                     use_container_width=True,
#                 ):
#                     select_conversation(
#                         conversation_id
#                     )

#             with col2:

#                 if st.button(
#                     "⋮",
#                     key=f"menu_{conversation_id}",
#                     help="Options",
#                 ):

#                     delete_conversation(
#                         conversation_id,
#                         user["id"],
#                     )

#                     if (
#                         conversation_id
#                         == st.session_state.get(
#                             "conversation_id"
#                         )
#                     ):
#                         st.session_state[
#                             "conversation_id"
#                         ] = None

#                     st.rerun()

#         st.markdown(
#             "<div class='sidebar-spacer'></div>",
#             unsafe_allow_html=True,
#         )

#         with st.expander(
#             "⚙  Paramètres",
#             expanded=False,
#         ):

#             provider = st.radio(
#                 "Modèle",
#                 [
#                     "OpenRouter",
#                     "Ollama",
#                 ],
#                 index=(
#                     0
#                     if st.session_state[
#                         "provider"
#                     ]
#                     == "OpenRouter"
#                     else 1
#                 ),
#             )

#             st.session_state[
#                 "provider"
#             ] = provider

#             if provider == "OpenRouter":
#                 st.caption(
#                     OPENROUTER_MODEL
#                 )
#             else:
#                 st.caption(
#                     OLLAMA_MODEL
#                 )

#         if user["role"] == "admin":

#             if st.button(
#                 "Administration",
#                 use_container_width=True,
#             ):

#                 st.session_state[
#                     "page"
#                 ] = "admin"

#                 st.rerun()

#         st.markdown(
#             f"""
#             <div class="sidebar-user">

#                 <div class="sidebar-user-avatar">
#                     {user["username"][0].upper()}
#                 </div>

#                 <div>
#                     <div class="sidebar-user-name">
#                         {user["username"]}
#                     </div>
#                     <div class="sidebar-user-role">
#                         {user["role"]}
#                     </div>
#                 </div>

#             </div>
#             """,
#             unsafe_allow_html=True,
#         )

#         if st.button(
#             "↪  Déconnexion",
#             use_container_width=True,
#         ):
#             logout()


# # ============================================================
# # SOURCES
# # ============================================================

# def render_sources(
#     sources: list[dict[str, Any]],
# ) -> None:

#     if not sources:
#         return

#     with st.expander(
#         f"Sources utilisées · {len(sources)} documents"
#     ):

#         for i, source in enumerate(
#             sources,
#             start=1,
#         ):

#             metadata = (
#                 source.get("metadata")
#                 or {}
#             )

#             distance = source.get(
#                 "distance"
#             )

#             title = (
#                 metadata.get("title")
#                 or metadata.get("produit")
#                 or metadata.get(
#                     "product_family"
#                 )
#                 or f"Document {i}"
#             )

#             details = []

#             for key in (
#                 "bank",
#                 "product_family",
#                 "produit",
#                 "page",
#                 "url",
#             ):

#                 value = metadata.get(key)

#                 if value not in (
#                     None,
#                     "",
#                 ):

#                     details.append(
#                         f"{key}: {value}"
#                     )

#             if distance is not None:

#                 details.append(
#                     f"distance: {float(distance):.3f}"
#                 )

#             st.markdown(
#                 f"""
#                 <div class="source-card">

#                     <div class="source-title">
#                         📄 {title}
#                     </div>

#                     <div class="source-meta">
#                         {" · ".join(details)}
#                     </div>

#                 </div>
#                 """,
#                 unsafe_allow_html=True,
#             )


# # ============================================================
# # WELCOME
# # ============================================================

# def render_welcome() -> None:

#     st.markdown(
#         """
#         <div class="welcome-wrap">

#             <div class="welcome-icon">
#                 ✦
#             </div>

#             <h1>
#                 Bonjour 👋
#             </h1>

#             <p>
#                 Comment puis-je vous aider ?
#             </p>

#             <div class="welcome-description">
#                 Posez une question sur les produits et services
#                 BoursoBank.
#             </div>

#         </div>
#         """,
#         unsafe_allow_html=True,
#     )

#     columns = st.columns(4)

#     suggestions = [
#         (
#             "💳",
#             "Cartes",
#             "Quelles sont les informations disponibles sur les cartes bancaires ?",
#         ),
#         (
#             "🏦",
#             "Crédits",
#             "Quelles sont les informations disponibles sur les crédits ?",
#         ),
#         (
#             "💰",
#             "Épargne",
#             "Quelles sont les informations disponibles sur l'épargne ?",
#         ),
#         (
#             "📋",
#             "Comptes",
#             "Quelles sont les informations disponibles sur les comptes ?",
#         ),
#     ]

#     for column, item in zip(
#         columns,
#         suggestions,
#     ):

#         icon, label, question = item

#         with column:

#             if st.button(
#                 f"{icon}  {label}",
#                 key=f"suggestion_{label}",
#                 use_container_width=True,
#             ):

#                 st.session_state[
#                     "suggested_question"
#                 ] = question

#                 st.rerun()


# # ============================================================
# # ADMIN
# # ============================================================

# def render_admin() -> None:

#     user = st.session_state["user"]

#     if user["role"] != "admin":

#         st.session_state[
#             "page"
#         ] = "chat"

#         st.rerun()

#         return

#     st.markdown(
#         "<div class='page-title'>Administration</div>",
#         unsafe_allow_html=True,
#     )

#     st.caption(
#         "Vue synthétique de l'activité de l'application."
#     )

#     stats = admin_stats()

#     c1, c2, c3 = st.columns(3)

#     c1.metric(
#         "Utilisateurs",
#         stats["users"],
#     )

#     c2.metric(
#         "Conversations",
#         stats["conversations"],
#     )

#     c3.metric(
#         "Messages",
#         stats["messages"],
#     )

#     st.markdown(
#         """
#         <div class="admin-card">

#             <div class="admin-card-title">
#                 Architecture active
#             </div>

#             <div class="admin-pipeline">
#                 BGE-M3
#                 <span>→</span>
#                 ChromaDB
#                 <span>→</span>
#                 Retrieval Top-K
#                 <span>→</span>
#                 LLM
#             </div>

#         </div>
#         """,
#         unsafe_allow_html=True,
#     )

#     if st.button(
#         "← Retour au chatbot"
#     ):

#         st.session_state[
#             "page"
#         ] = "chat"

#         st.rerun()


# # ============================================================
# # CHAT
# # ============================================================

# def render_chat() -> None:

#     user = st.session_state["user"]

#     conversation_id = ensure_conversation()

#     conversation = get_conversation(
#         conversation_id,
#         user["id"],
#     )

#     messages = list_messages(
#         conversation_id,
#         user["id"],
#     )

#     title = (
#         conversation["title"]
#         if conversation
#         else "Nouveau chat"
#     )

#     provider = st.session_state[
#         "provider"
#     ]

#     st.markdown(
#         f"""
#         <div class="chat-header">

#             <div>
#                 <div class="chat-header-title">
#                     {title}
#                 </div>

#                 <div class="chat-header-sub">
#                     Assistant documentaire
#                 </div>
#             </div>

#             <div class="provider-badge">
#                 <span></span>
#                 {provider}
#             </div>

#         </div>
#         """,
#         unsafe_allow_html=True,
#     )

#     if not messages:
#         render_welcome()

#     for message in messages:

#         role = (
#             "user"
#             if message["role"] == "user"
#             else "assistant"
#         )

#         with st.chat_message(role):

#             st.markdown(
#                 message["content"]
#             )

#             if (
#                 role == "assistant"
#                 and message.get(
#                     "sources_json"
#                 )
#             ):

#                 try:

#                     sources = json.loads(
#                         message[
#                             "sources_json"
#                         ]
#                     )

#                     render_sources(
#                         sources
#                     )

#                 except (
#                     json.JSONDecodeError,
#                     TypeError,
#                 ):
#                     pass

#     suggested = st.session_state.pop(
#         "suggested_question",
#         None,
#     )

#     prompt = st.chat_input(
#         "Posez votre question sur BoursoBank…"
#     )

#     question = (
#         prompt
#         or suggested
#     )

#     if not question:
#         return

#     question = question.strip()

#     if not question:
#         return

#     save_message(
#         conversation_id,
#         user["id"],
#         "user",
#         question,
#     )

#     if not messages:

#         title = (
#             question
#             .replace("\n", " ")
#             .strip()
#         )

#         if len(title) > 55:
#             title = (
#                 title[:55].rstrip()
#                 + "…"
#             )

#         rename_conversation(
#             conversation_id,
#             user["id"],
#             title,
#         )

#     with st.chat_message("user"):

#         st.markdown(
#             question
#         )

#     with st.chat_message("assistant"):

#         with st.spinner(
#             "Recherche dans la documentation…"
#         ):

#             try:

#                 result = rag_pipeline(
#                     question=question,
#                     provider=provider,
#                     n_results=TOP_K,
#                 )

#                 answer = result[
#                     "answer"
#                 ]

#                 sources = result[
#                     "sources"
#                 ]

#                 st.markdown(
#                     answer
#                 )

#                 render_sources(
#                     sources
#                 )

#                 serializable_sources = [
#                     {
#                         "metadata": source[
#                             "metadata"
#                         ],
#                         "distance": source[
#                             "distance"
#                         ],
#                         "document": source[
#                             "document"
#                         ][:1200],
#                     }
#                     for source in sources
#                 ]

#                 save_message(
#                     conversation_id,
#                     user["id"],
#                     "assistant",
#                     answer,
#                     json.dumps(
#                         serializable_sources,
#                         ensure_ascii=False,
#                     ),
#                 )

#             except Exception as exc:

#                 if provider == "Ollama":

#                     error = (
#                         "Impossible de contacter Ollama. "
#                         f"Vérifiez que le modèle `{OLLAMA_MODEL}` "
#                         "est installé et qu'Ollama est démarré."
#                     )

#                 else:

#                     error = (
#                         "Impossible de contacter OpenRouter. "
#                         "Vérifiez OPENROUTER_API_KEY "
#                         "dans votre fichier .env."
#                     )

#                 st.error(error)

#                 if os.getenv(
#                     "DEBUG",
#                     "false",
#                 ).lower() == "true":

#                     st.exception(
#                         exc
#                     )

#     st.rerun()


# # ============================================================
# # MAIN
# # ============================================================

# def main() -> None:

#     st.set_page_config(
#         page_title="ChatBot",
#         page_icon="✦",
#         layout="wide",
#         initial_sidebar_state="expanded",
#     )

#     inject_css()

#     init_session()

#     if not st.session_state[
#         "authenticated"
#     ]:

#         # Trois colonnes permettent de garder la connexion
#         # étroite et parfaitement centrée.
#         left, center, right = st.columns(
#             [1, 0.74, 1],
#             gap="small",
#         )

#         with center:
#             render_login()

#         return

#     render_sidebar()

#     if st.session_state[
#         "page"
#     ] == "admin":

#         render_admin()

#     else:

#         render_chat()


# if __name__ == "__main__":
#     main()
