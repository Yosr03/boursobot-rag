from pathlib import Path
import os

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent

load_dotenv(BASE_DIR / ".env")

CHROMA_PATH = os.getenv(
    "CHROMA_PATH",
    str(BASE_DIR / "chroma_db")
)

CHROMA_COLLECTION = os.getenv(
    "CHROMA_COLLECTION",
    "boursobank_rag_bge_m3"
)

BGE_MODEL_NAME = os.getenv(
    "BGE_MODEL_NAME",
    "BAAI/bge-m3"
)

OPENROUTER_MODEL = os.getenv(
    "OPENROUTER_MODEL",
    "meta-llama/llama-3.1-8b-instruct"
)

OLLAMA_MODEL = os.getenv(
    "OLLAMA_MODEL",
    "gemma2:2b"
)

OPENROUTER_BASE_URL = os.getenv(
    "OPENROUTER_BASE_URL",
    "https://openrouter.ai/api/v1"
)

OLLAMA_BASE_URL = os.getenv(
    "OLLAMA_BASE_URL",
    "http://localhost:11434/v1"
)

RAG_TOP_K = int(
    os.getenv("RAG_TOP_K", "10")
)