import chromadb
from chromadb.config import Settings as ChromaSettings
from langchain_huggingface import HuggingFaceEmbeddings
from core.config import settings
from core.logging import log

class VectorService:
    def __init__(self):
        log.info("Initializing Vector Service (ChromaDB)...")
        self.client = chromadb.PersistentClient(path=str(settings.CHROMA_DB_PATH))
        
        # Use a local embedding model (sentence-transformers)
        log.info("Loading Embedding Model...")
        self.embedding_fn = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        
        self.collection = self.client.get_or_create_collection(
            name="jarvis_memory",
            metadata={"hnsw:space": "cosine"}
        )
        log.info("Vector Service Ready.")

    def add_memory(self, text: str, meta: dict):
        # Generate ID based on content hash or UUID
        import uuid
        doc_id = str(uuid.uuid4())
        
        # Embed and store
        # Note: Chroma handles embedding automatically if an external embedding function is passed, 
        # but here we are using Langchain's wrapper. For raw Chroma usage we might need direct embedding.
        # For simplicity in this local setup, let's use the built-in default or the explicit one.
        
        # Actually, using the raw client approach:
        vector = self.embedding_fn.embed_query(text)
        
        self.collection.add(
            ids=[doc_id],
            embeddings=[vector],
            documents=[text],
            metadatas=[meta]
        )
        return doc_id

    def search_memory(self, query: str, n_results: int = 3):
        vector = self.embedding_fn.embed_query(query)
        results = self.collection.query(
            query_embeddings=[vector],
            n_results=n_results
        )
        return results

# Singleton instance
vector_service = VectorService()
