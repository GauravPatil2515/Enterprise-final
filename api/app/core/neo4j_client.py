from neo4j import GraphDatabase
from .config import settings

class Neo4jClient:
    """
    Enterprise Knowledge Graph (E-KG) Client.
    Connects to Neo4j Aura for persistent graph storage.
    """
    def __init__(self):
        # Using bolt+ssc as confirmed by connection tests (bypasses local SSL issues)
        uri = settings.NEO4J_URI.replace("neo4j+s://", "bolt+ssc://")
        
        self.driver = GraphDatabase.driver(
            uri,
            auth=(settings.NEO4J_USERNAME, settings.NEO4J_PASSWORD)
        )
        self.database = settings.NEO4J_DATABASE

    def verify_connection(self):
        """Test connectivity to Neo4j."""
        try:
            self.driver.verify_connectivity()
            return True
        except Exception as e:
            print(f"Neo4j Connection Error: {e}")
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
        self.driver.close()

# Singleton instance
neo4j_client = Neo4jClient()
