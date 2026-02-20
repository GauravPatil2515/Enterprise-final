from neo4j import GraphDatabase
from .config import settings
import logging

try:
    from .mock_client import MockNeo4jClient
except ImportError:
    MockNeo4jClient = None

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
        self._mock_client = None
        self.database = settings.NEO4J_DATABASE
        self.using_mock = False

    @property
    def driver(self):
        """Lazy driver — only connects when first accessed."""
        if self._driver is None and not self.using_mock:
            uri = settings.NEO4J_URI
            
            # Fallback to Mock if URI is not set
            if not uri or "xxxxx" in uri:
                logger.warning("⚠️ NEO4J_URI not set or invalid. Switching to MOCK CLIENT.")
                self.using_mock = True
                if MockNeo4jClient:
                    self._mock_client = MockNeo4jClient()
                return self._mock_client

            # Using bolt+ssc as confirmed by connection tests
            uri = uri.replace("neo4j+s://", "bolt+ssc://")
            logger.info(f"Connecting to Neo4j at {uri[:30]}...")
            
            try:
                self._driver = GraphDatabase.driver(
                    uri,
                    auth=(settings.NEO4J_USERNAME, settings.NEO4J_PASSWORD)
                )
            except Exception as e:
                logger.error(f"Failed to create Neo4j driver: {e}. Switching to MOCK CLIENT.")
                self.using_mock = True
                if MockNeo4jClient:
                    self._mock_client = MockNeo4jClient()
                return self._mock_client
                
        if self.using_mock:
            return self._mock_client
            
        return self._driver

    def verify_connection(self):
        """Test connectivity to Neo4j."""
        if self.using_mock:
            return True
        try:
            self.driver.verify_connectivity()
            return True
        except Exception as e:
            logger.error(f"Neo4j Connection Error: {e}")
            # Switch to mock on failure
            logger.warning("Connection failed. Switching to MOCK CLIENT.")
            self.using_mock = True
            if MockNeo4jClient:
                 self._mock_client = MockNeo4jClient()
            return True

    def execute_query(self, query: str, parameters: dict = None):
        """Execute a Cypher query and return records."""
        # Ensure driver/mock is initialized
        driver = self.driver
        
        if self.using_mock:
            return self._mock_client.execute_query(query, parameters)

        records, summary, keys = driver.execute_query(
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
