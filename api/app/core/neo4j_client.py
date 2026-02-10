from neo4j import GraphDatabase
from .config import settings
import logging

logger = logging.getLogger(__name__)


class Neo4jClient:
    """
    Enterprise Knowledge Graph (E-KG) Client.
    Connects to Neo4j Aura for persistent graph storage.
    Uses LAZY initialization — connection is created on first use,
    not at import time. This is critical for Vercel serverless functions.
    """
    def __init__(self):
        self._driver = None
        self.database = settings.NEO4J_DATABASE

    @property
    def driver(self):
        """Lazy driver — only connects when first accessed."""
        if self._driver is None:
            uri = settings.NEO4J_URI
            if not uri:
                raise RuntimeError(
                    "NEO4J_URI is not set. Configure it in Vercel Dashboard → Settings → Environment Variables."
                )
            # Using bolt+ssc as confirmed by connection tests
            uri = uri.replace("neo4j+s://", "bolt+ssc://")
            logger.info(f"Connecting to Neo4j at {uri[:30]}...")
            self._driver = GraphDatabase.driver(
                uri,
                auth=(settings.NEO4J_USERNAME, settings.NEO4J_PASSWORD)
            )
        return self._driver

    def verify_connection(self):
        """Test connectivity to Neo4j."""
        try:
            self.driver.verify_connectivity()
            return True
        except Exception as e:
            logger.error(f"Neo4j Connection Error: {e}")
            return False

    def execute_query(self, query: str, parameters: dict = None):
        """Execute a Cypher query and return records."""
        records, summary, keys = self.driver.execute_query(
            query,
            parameters or {},
            database_=self.database
        )
        return records, summary

    def close(self):
        if self._driver:
            self._driver.close()
            self._driver = None


# Singleton instance — safe because connection is lazy
neo4j_client = Neo4jClient()
