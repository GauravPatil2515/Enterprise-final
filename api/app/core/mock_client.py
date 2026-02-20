import logging
import re

logger = logging.getLogger(__name__)

class MockNeo4jClient:
    """
    Mock Neo4j Client for development/demo purposes when real DB is unavailable.
    Returns static data matching the expected schema.
    """
    def __init__(self):
        logger.warning("⚠️ USING MOCK NEO4J CLIENT - DATA IS NOT REAL ⚠️")
        self.data = self._generate_mock_data()

    def verify_connection(self):
        return True

    def close(self):
        pass

    def execute_query(self, query: str, parameters: dict = None):
        """
        Simple mock query executor that returns pre-defined data based on query keywords.
        """
        query_upper = query.upper()
        
        # 1. System Users
        if "MATCH (SU:SYSTEMUSER)" in query_upper:
            return [
                {"user": u} for u in self.data["system_users"]
            ], None
            
        if "MATCH (SU:SYSTEMUSER {ID: $ID})" in query_upper:
            uid = parameters.get("id")
            user = next((u for u in self.data["system_users"] if u["id"] == uid), None)
            if user:
                return [{"user": user}], None
            return [], None

        # 2. Roles/Dashboard Data
        # Engineer Dashboard
        if "MATCH (T:TEAM)-[:HAS_PROJECT]->(P:PROJECT)" in query_upper and "RETURNING T.NAME AS TEAM" in query_upper:
             # engineered to match the engineer dashboard query somewhat, 
             # but actually the query in main.py is complex.
             # Let's just return a standard structure that the dashboard logic expects.
             # The main.py logic filters heavily in python for some parts, but for "engineer" role -> projects
             # it does: RETURN t.name as team, t.id as team_id, p { .* } as project, tickets
             
             results = []
             for team in self.data["teams"]:
                 for proj in team["projects"]:
                     # Attach tickets
                     tickets = [t for t in self.data["tickets"] if t["project_id"] == proj["id"]]
                     # Format for "tickets" collection in Cypher return
                     # It expects: collect(DISTINCT tk { .*, assignee: m.name })
                     formatted_tickets = []
                     for t in tickets:
                         t_copy = t.copy()
                         t_copy["assignee"] = next((m["name"] for m in self.data["members"] if m["id"] == t["assignee_id"]), "Unknown")
                         formatted_tickets.append(t_copy)

                     results.append({
                         "team": team["name"],
                         "team_id": team["id"],
                         "project": proj,
                         "tickets": formatted_tickets
                     })
             return results, None

        # HR Dashboard - Members
        if "MATCH (M:MEMBER)" in query_upper and "RETURN M { .* } AS MEMBER" in query_upper:
            # RETURN m { .* } as member, t.name as team, count(tk) as active_tickets
            results = []
            for m in self.data["members"]:
                team = next((t for t in self.data["teams"] if t["id"] == m["team_id"]), None)
                active_tickets = len([t for t in self.data["tickets"] if t["assignee_id"] == m["id"] and t["status"] != "Done"])
                results.append({
                    "member": m,
                    "team": team["name"] if team else "Unassigned",
                    "active_tickets": active_tickets
                })
            return results, None

        # Chairperson - All Projects
        if "MATCH (T:TEAM)-[:HAS_PROJECT]->(P:PROJECT)" in query_upper and "COUNT(DISTINCT BLOCKER)" in query_upper:
            # RETURN t.name as team, t.id as team_id, p { .* } as project, active, blocked
            results = []
            for team in self.data["teams"]:
                for proj in team["projects"]:
                    tickets = [t for t in self.data["tickets"] if t["project_id"] == proj["id"]]
                    active = len([t for t in tickets if t["status"] != "Done"])
                    # Mock blocked count
                    blocked = 1 if active > 2 else 0 
                    results.append({
                        "team": team["name"],
                        "team_id": team["id"],
                        "project": proj,
                        "active_tickets": active,
                        "blocked_count": blocked
                    })
            return results, None

        # Finance - Teams
        if "MATCH (T:TEAM)" in query_upper and "RETURN T { .* } AS TEAM" in query_upper:
             results = []
             for team in self.data["teams"]:
                 members = [m for m in self.data["members"] if m["team_id"] == team["id"]]
                 projects = team["projects"]
                 all_tickets = [t for t in self.data["tickets"] if t["project_id"] in [p["id"] for p in projects]]
                 active = len([t for t in all_tickets if t["status"] != "Done"])
                 done = len([t for t in all_tickets if t["status"] == "Done"])
                 
                 results.append({
                     "team": team,
                     "member_count": len(members),
                     "project_count": len(projects),
                     "active_ticket_count": active,
                     "done_ticket_count": done
                 })
             return results, None

        # ================= GRAPH QUERIES =================

        # 1. Graph Members
        if "MATCH (M:MEMBER)" in query_upper and "OPTIONAL MATCH (M)-[:MEMBER_OF]->(T:TEAM)" in query_upper:
            results = []
            for m in self.data["members"]:
                # active tickets
                active = len([t for t in self.data["tickets"] if t["assignee_id"] == m["id"] and t["status"] != "Done"])
                results.append({
                    "member": m,
                    "team_id": m["team_id"],
                    "active_tickets": active
                })
            return results, None

        # 2. Graph Projects
        # MATCH (p:Project)<-[:HAS_PROJECT]-(t:Team)
        # Note: The query in main.py uses lower case p, t. upper() handles this.
        if "MATCH (P:PROJECT)<-[:HAS_PROJECT]-(T:TEAM)" in query_upper:
            results = []
            for team in self.data["teams"]:
                for proj in team["projects"]:
                    # active tickets for this project
                    tickets = [t for t in self.data["tickets"] if t["project_id"] == proj["id"]]
                    active = len([t for t in tickets if t["status"] != "Done"])
                    results.append({
                        "project": proj,
                        "team_id": team["id"],
                        "active_tickets": active
                    })
            return results, None

        # 3. Graph Assignments
        # MATCH (m:Member)-[:ASSIGNED_TO]->(tk:Ticket)<-[:HAS_TICKET]-(p:Project)
        if "MATCH (M:MEMBER)-[:ASSIGNED_TO]->(TK:TICKET)<-[:HAS_TICKET]-(P:PROJECT)" in query_upper:
            results = []
            # Derive assignments from tickets
            seen = set()
            for t in self.data["tickets"]:
                if t["assignee_id"] and t["project_id"]:
                    pair = (t["assignee_id"], t["project_id"])
                    if pair not in seen:
                        seen.add(pair)
                        results.append({
                            "member_id": t["assignee_id"],
                            "project_id": t["project_id"]
                        })
            return results, None

        # Default fallback for unhandled queries (return empty to valid crash)
        logger.warning(f"Mock Client: Unhandled query: {query}")
        return [], None

    def _generate_mock_data(self):
        teams = [
            {"id": "t1", "name": "Alpha Squad", "description": "Core Backend Engine"},
            {"id": "t2", "name": "Beta Force", "description": "Frontend Experience"},
            {"id": "t3", "name": "Data Miners", "description": "Analytics & AI"}
        ]

        projects = [
            {"id": "p1", "name": "Payment Gateway V2", "status": "Ongoing", "progress": 65, "team_id": "t1"},
            {"id": "p2", "name": "User Dashboard Redesign", "status": "Ongoing", "progress": 40, "team_id": "t2"},
            {"id": "p3", "name": "AI Recommendation Engine", "status": "On Hold", "progress": 85, "team_id": "t3"}
        ]
        
        # Attach projects to teams for nested lookup
        teams[0]["projects"] = [projects[0]]
        teams[1]["projects"] = [projects[1]]
        teams[2]["projects"] = [projects[2]]

        members = [
            {"id": "m1", "name": "Alice Chen", "role": "Senior Engineer", "team_id": "t1", "avatar": "https://i.pravatar.cc/150?u=a"},
            {"id": "m2", "name": "Bob Smith", "role": "Backend Dev", "team_id": "t1", "avatar": "https://i.pravatar.cc/150?u=b"},
            {"id": "m3", "name": "Charlie Kim", "role": "Frontend Lead", "team_id": "t2", "avatar": "https://i.pravatar.cc/150?u=c"},
            {"id": "m4", "name": "Diana Ross", "role": "UI Designer", "team_id": "t2", "avatar": "https://i.pravatar.cc/150?u=d"},
            {"id": "m5", "name": "Eve Polastri", "role": "Data Scientist", "team_id": "t3", "avatar": "https://i.pravatar.cc/150?u=e"}
        ]

        tickets = [
            {"id": "tk1", "title": "Implement Stripe API", "status": "In Progress", "project_id": "p1", "assignee_id": "m1", "priority": "High"},
            {"id": "tk2", "title": "Database Schema Migration", "status": "To Do", "project_id": "p1", "assignee_id": "m2", "priority": "High"},
            {"id": "tk3", "title": "React Component Library", "status": "In Progress", "project_id": "p2", "assignee_id": "m3", "priority": "Medium"},
            {"id": "tk4", "title": "Figma Prototypes", "status": "Done", "project_id": "p2", "assignee_id": "m4", "priority": "Low"},
            {"id": "tk5", "title": "Model Training Pipeline", "status": "Blocked", "project_id": "p3", "assignee_id": "m5", "priority": "High"}
        ]

        system_users = [
            {"id": "u1", "name": "Sarah Connor", "email": "sarah@company.com", "role": "engineer", "avatar": "https://i.pravatar.cc/150?u=1", "team_id": "t1"},
            {"id": "u2", "name": "Harold Finch", "email": "harold@company.com", "role": "hr", "avatar": "https://i.pravatar.cc/150?u=2", "team_id": "t2"},
            {"id": "u3", "name": "Miranda Priestly", "email": "miranda@company.com", "role": "chairperson", "avatar": "https://i.pravatar.cc/150?u=3", "team_id": "t1"},
            {"id": "u4", "name": "Gordon Gekko", "email": "gordon@company.com", "role": "finance", "avatar": "https://i.pravatar.cc/150?u=4", "team_id": "t3"}
        ]

        return {
            "teams": teams,
            "projects": projects,
            "members": members,
            "tickets": tickets,
            "system_users": system_users
        }
