"""
Neo4j CRUD Operations for Teams, Projects, Tickets, and Members.
"""
from typing import List, Dict, Any, Optional
from .neo4j_client import neo4j_client
import logging

logger = logging.getLogger(__name__)


# ============================================================================
# TEAMS
# ============================================================================

def get_all_teams() -> List[Dict[str, Any]]:
    """Fetch all teams with members, projects, and tickets in a single query."""
    query = """
    MATCH (t:Team)
    OPTIONAL MATCH (t)<-[:MEMBER_OF]-(m:Member)
    OPTIONAL MATCH (t)-[:HAS_PROJECT]->(p:Project)
    OPTIONAL MATCH (p)-[:HAS_TICKET]->(tk:Ticket)
    OPTIONAL MATCH (tk)<-[:ASSIGNED_TO]-(a:Member)
    WITH t, 
         collect(DISTINCT m { .* }) as members,
         p, 
         collect(DISTINCT tk { .*, assignee: a { .* } }) as tickets
    WITH t, members, 
         collect(DISTINCT p { .*, tickets: tickets }) as projects
    RETURN t { .*, 
        members: members,
        projects: projects
    } as team
    ORDER BY t.name
    """
    records, _ = neo4j_client.execute_query(query)
    teams = []
    for r in records:
        team = dict(r["team"])
        # Normalize ticket data
        for proj in team.get("projects", []):
            normalized_tickets = []
            for ticket in proj.get("tickets", []):
                if not ticket.get("id"):
                    continue
                ticket = dict(ticket)
                # Ensure labels is a list
                if "labels" in ticket and isinstance(ticket["labels"], str):
                    ticket["labels"] = ticket["labels"].split(",") if ticket["labels"] else []
                elif "labels" not in ticket:
                    ticket["labels"] = []
                # Ensure assignee exists
                if not ticket.get("assignee") or not ticket["assignee"].get("id"):
                    ticket["assignee"] = {"id": "unassigned", "name": "Unassigned", "avatar": "", "role": "", "email": ""}
                normalized_tickets.append(ticket)
            proj["tickets"] = normalized_tickets
        teams.append(team)
    return teams


def get_team(team_id: str) -> Optional[Dict[str, Any]]:
    """Fetch a single team with members, projects, and tickets in a single query."""
    query = """
    MATCH (t:Team {id: $team_id})
    OPTIONAL MATCH (t)<-[:MEMBER_OF]-(m:Member)
    OPTIONAL MATCH (t)-[:HAS_PROJECT]->(p:Project)
    OPTIONAL MATCH (p)-[:HAS_TICKET]->(tk:Ticket)
    OPTIONAL MATCH (tk)<-[:ASSIGNED_TO]-(a:Member)
    WITH t, 
         collect(DISTINCT m { .* }) as members,
         p,
         collect(DISTINCT tk { .*, assignee: a { .* } }) as tickets
    WITH t, members,
         collect(DISTINCT p { .*, tickets: tickets }) as projects
    RETURN t { .*,
        members: members,
        projects: projects
    } as team
    """
    records, _ = neo4j_client.execute_query(query, {"team_id": team_id})
    if not records:
        return None
    team = dict(records[0]["team"])
    for proj in team.get("projects", []):
        normalized_tickets = []
        for ticket in proj.get("tickets", []):
            if not ticket.get("id"):
                continue
            ticket = dict(ticket)
            if "labels" in ticket and isinstance(ticket["labels"], str):
                ticket["labels"] = ticket["labels"].split(",") if ticket["labels"] else []
            elif "labels" not in ticket:
                ticket["labels"] = []
            if not ticket.get("assignee") or not ticket["assignee"].get("id"):
                ticket["assignee"] = {"id": "unassigned", "name": "Unassigned", "avatar": "", "role": "", "email": ""}
            normalized_tickets.append(ticket)
        proj["tickets"] = normalized_tickets
    return team


# ============================================================================
# PROJECTS
# ============================================================================

def get_project(project_id: str) -> Optional[Dict[str, Any]]:
    """Fetch a project with its tickets."""
    query = """
    MATCH (p:Project {id: $project_id})
    RETURN p { .* } as project
    """
    records, _ = neo4j_client.execute_query(query, {"project_id": project_id})
    if not records:
        return None
    project = dict(records[0]["project"])
    project["tickets"] = get_tickets_for_project(project_id)
    return project


def get_projects_for_team(team_id: str) -> List[Dict[str, Any]]:
    """Fetch all projects belonging to a team."""
    query = """
    MATCH (t:Team {id: $team_id})-[:HAS_PROJECT]->(p:Project)
    RETURN p { .* } as project
    ORDER BY p.name
    """
    records, _ = neo4j_client.execute_query(query, {"team_id": team_id})
    projects = []
    for r in records:
        proj = dict(r["project"])
        proj["tickets"] = get_tickets_for_project(proj["id"])
        projects.append(proj)
    return projects


# ============================================================================
# TICKETS
# ============================================================================

def get_tickets_for_project(project_id: str) -> List[Dict[str, Any]]:
    """Fetch all tickets for a project with assignee info."""
    query = """
    MATCH (p:Project {id: $project_id})-[:HAS_TICKET]->(tk:Ticket)
    OPTIONAL MATCH (tk)<-[:ASSIGNED_TO]-(m:Member)
    RETURN tk { .*, assignee: m { .* } } as ticket
    ORDER BY tk.createdAt DESC
    """
    records, _ = neo4j_client.execute_query(query, {"project_id": project_id})
    tickets = []
    for r in records:
        ticket = dict(r["ticket"])
        # Ensure labels is a list
        if "labels" in ticket and isinstance(ticket["labels"], str):
            ticket["labels"] = ticket["labels"].split(",") if ticket["labels"] else []
        elif "labels" not in ticket:
            ticket["labels"] = []
        # Ensure assignee exists
        if not ticket.get("assignee"):
            ticket["assignee"] = {"id": "unassigned", "name": "Unassigned", "avatar": "", "role": "", "email": ""}
        tickets.append(ticket)
    return tickets


def create_ticket(project_id: str, ticket_data: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new ticket in a project."""
    labels_str = ",".join(ticket_data.get("labels", []))
    assignee_id = ticket_data.get("assignee", {}).get("id", "m1")
    
    query = """
    MATCH (p:Project {id: $project_id})
    CREATE (tk:Ticket {
        id: $id,
        title: $title,
        description: $description,
        priority: $priority,
        status: $status,
        dueDate: $dueDate,
        createdAt: $createdAt,
        labels: $labels,
        attachments: $attachments,
        comments: $comments
    })
    CREATE (p)-[:HAS_TICKET]->(tk)
    WITH tk
    OPTIONAL MATCH (m:Member {id: $assignee_id})
    FOREACH (_ IN CASE WHEN m IS NOT NULL THEN [1] ELSE [] END |
        CREATE (m)-[:ASSIGNED_TO]->(tk)
    )
    RETURN tk { .* } as ticket
    """
    records, _ = neo4j_client.execute_query(query, {
        "project_id": project_id,
        "id": ticket_data["id"],
        "title": ticket_data["title"],
        "description": ticket_data.get("description", ""),
        "priority": ticket_data.get("priority", "Medium"),
        "status": ticket_data.get("status", "To Do"),
        "dueDate": ticket_data.get("dueDate", ""),
        "createdAt": ticket_data.get("createdAt", ""),
        "labels": labels_str,
        "attachments": ticket_data.get("attachments", 0),
        "comments": ticket_data.get("comments", 0),
        "assignee_id": assignee_id,
    })
    if records:
        t = dict(records[0]["ticket"])
        t["labels"] = labels_str.split(",") if labels_str else []
        return t
    return ticket_data


def update_ticket(ticket_id: str, ticket_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Update an existing ticket."""
    labels_str = ",".join(ticket_data.get("labels", []))
    assignee_id = ticket_data.get("assignee", {}).get("id", "m1")
    
    query = """
    MATCH (tk:Ticket {id: $ticket_id})
    SET tk.title = $title,
        tk.description = $description,
        tk.priority = $priority,
        tk.status = $status,
        tk.dueDate = $dueDate,
        tk.labels = $labels,
        tk.attachments = $attachments,
        tk.comments = $comments
    WITH tk
    OPTIONAL MATCH (old_m:Member)-[old_r:ASSIGNED_TO]->(tk)
    DELETE old_r
    WITH tk
    OPTIONAL MATCH (new_m:Member {id: $assignee_id})
    FOREACH (_ IN CASE WHEN new_m IS NOT NULL THEN [1] ELSE [] END |
        CREATE (new_m)-[:ASSIGNED_TO]->(tk)
    )
    RETURN tk { .* } as ticket
    """
    records, _ = neo4j_client.execute_query(query, {
        "ticket_id": ticket_id,
        "title": ticket_data.get("title", ""),
        "description": ticket_data.get("description", ""),
        "priority": ticket_data.get("priority", "Medium"),
        "status": ticket_data.get("status", "To Do"),
        "dueDate": ticket_data.get("dueDate", ""),
        "labels": labels_str,
        "attachments": ticket_data.get("attachments", 0),
        "comments": ticket_data.get("comments", 0),
        "assignee_id": assignee_id,
    })
    if records:
        t = dict(records[0]["ticket"])
        t["labels"] = labels_str.split(",") if labels_str else []
        return t
    return None


def update_ticket_status(ticket_id: str, new_status: str) -> Optional[Dict[str, Any]]:
    """Update just the status of a ticket (for drag-drop)."""
    query = """
    MATCH (tk:Ticket {id: $ticket_id})
    SET tk.status = $status
    RETURN tk { .* } as ticket
    """
    records, _ = neo4j_client.execute_query(query, {
        "ticket_id": ticket_id,
        "status": new_status,
    })
    if records:
        return dict(records[0]["ticket"])
    return None


def delete_ticket(ticket_id: str) -> bool:
    """Delete a ticket and its relationships."""
    query = """
    MATCH (tk:Ticket {id: $ticket_id})
    DETACH DELETE tk
    RETURN count(tk) as deleted
    """
    records, _ = neo4j_client.execute_query(query, {"ticket_id": ticket_id})
    return True


# ============================================================================
# MEMBERS
# ============================================================================

def get_all_members() -> List[Dict[str, Any]]:
    """Fetch all members."""
    query = """
    MATCH (m:Member)
    RETURN m { .* } as member
    ORDER BY m.name
    """
    records, _ = neo4j_client.execute_query(query)
    return [dict(r["member"]) for r in records]
