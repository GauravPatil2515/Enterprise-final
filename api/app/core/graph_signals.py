from typing import Dict, Any, List
from .neo4j_client import neo4j_client

class GraphSignalExtractor:
    def __init__(self):
        self.client = neo4j_client

    def get_dependency_depth(self, project_id: str) -> int:
        """
        Calculates the longest chain of BLOCKED_BY relationships for tickets in the project.
        Interprets this as 'Dependency Depth'.
        """
        query = """
        MATCH (p:Project {id: $project_id})-[:HAS_TICKET]->(t:Ticket)
        OPTIONAL MATCH path = (t)-[:BLOCKED_BY*]->(end:Ticket)
        RETURN coalesce(max(length(path)), 0) as depth
        """
        records, _ = self.client.execute_query(query, {"project_id": project_id})
        return records[0]["depth"] if records else 0

    def get_skill_match_score(self, project_id: str) -> float:
        """
        Calculates the skill match score:
        (Total Skills Possessed by Assignees / Total Required Skills by Tickets)
        """
        query = """
        MATCH (p:Project {id: $project_id})-[:HAS_TICKET]->(t:Ticket)
        MATCH (t)-[:REQUIRED_SKILL]->(s:Skill)
        OPTIONAL MATCH (t)<-[:ASSIGNED_TO]-(m:Member)-[:HAS_SKILL]->(s)
        WITH count(s) as total_required, count(m) as total_matched
        RETURN CASE WHEN total_required = 0 THEN 1.0 ELSE toFloat(total_matched) / total_required END as score
        """
        records, _ = self.client.execute_query(query, {"project_id": project_id})
        return records[0]["score"] if records else 0.0

    def get_contention_score(self, project_id: str) -> float:
        """
        Calculates the average number of active tickets for members assigned to this project.
        High contention means the team is overloaded.
        """
        query = """
        MATCH (p:Project {id: $project_id})-[:HAS_TICKET]->(t:Ticket)<-[:ASSIGNED_TO]-(m:Member)
        MATCH (m)-[:ASSIGNED_TO]->(all_t:Ticket)
        WHERE all_t.status IN ['In Progress', 'To Do', 'Review']
        WITH m, count(all_t) as load
        RETURN coalesce(avg(load), 0) as contention
        """
        records, _ = self.client.execute_query(query, {"project_id": project_id})
        return records[0]["contention"] if records else 0.0

    def get_signals(self, project_id: str) -> Dict[str, Any]:
        """
        Aggregates all graph signals for the project.
        """
        return {
            "dependency_depth": self.get_dependency_depth(project_id),
            "skill_match_score": self.get_skill_match_score(project_id),
            "contention_score": self.get_contention_score(project_id)
        }

signal_extractor = GraphSignalExtractor()

