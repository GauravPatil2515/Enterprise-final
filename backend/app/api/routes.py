"""
REST API routes for Teams, Projects, Tickets CRUD + AI Analysis.
"""
from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
import logging

import logging
from ..core.cache import invalidate_project_risk

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["CRUD"])


# ============================================================================
# Request/Response Models
# ============================================================================

class TicketCreate(BaseModel):
    id: str
    title: str
    description: str = ""
    priority: str = "Medium"
    status: str = "To Do"
    dueDate: str = ""
    createdAt: str = ""
    labels: List[str] = []
    attachments: int = 0
    comments: int = 0
    assignee: Optional[Dict[str, Any]] = None


class TicketUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    dueDate: Optional[str] = None
    labels: Optional[List[str]] = None
    attachments: Optional[int] = None
    comments: Optional[int] = None
    assignee: Optional[Dict[str, Any]] = None


class TicketStatusUpdate(BaseModel):
    status: str


# ============================================================================
# Teams
# ============================================================================

@router.get("/teams")
async def list_teams():
    """Get all teams with members and projects."""
    try:
        from ..core.crud import get_all_teams
        teams = get_all_teams()
        return teams
    except Exception as e:
        logger.error(f"Failed to fetch teams: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/teams/{team_id}")
async def get_team_detail(team_id: str):
    """Get a single team with full details."""
    try:
        from ..core.crud import get_team
        team = get_team(team_id)
        if not team:
            raise HTTPException(status_code=404, detail="Team not found")
        return team
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch team {team_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/teams/{team_id}/projects")
async def list_team_projects(team_id: str):
    """Get all projects for a team."""
    try:
        from ..core.crud import get_projects_for_team
        return get_projects_for_team(team_id)
    except Exception as e:
        logger.error(f"Failed to fetch projects for team {team_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Projects
# ============================================================================

@router.get("/projects/{project_id}")
async def get_project_detail(project_id: str):
    """Get a project with its tickets."""
    try:
        from ..core.crud import get_project
        project = get_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        return project
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch project {project_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/projects/{project_id}/signals")
async def get_project_signals(project_id: str):
    """Get graph-derived signals for a project."""
    try:
        from ..core.graph_signals import signal_extractor
        return signal_extractor.get_signals(project_id)
    except Exception as e:
        logger.error(f"Failed to fetch signals for {project_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Tickets
# ============================================================================

@router.get("/projects/{project_id}/tickets")
async def list_project_tickets(project_id: str):
    """Get all tickets for a project."""
    try:
        from ..core.crud import get_tickets_for_project
        return get_tickets_for_project(project_id)
    except Exception as e:
        logger.error(f"Failed to fetch tickets for {project_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/projects/{project_id}/tickets")
async def create_project_ticket(project_id: str, ticket: TicketCreate):
    """Create a new ticket in a project."""
    try:
        from ..core.crud import create_ticket
        result = create_ticket(project_id, ticket.model_dump())
        invalidate_project_risk(project_id)
        return result
    except Exception as e:
        logger.error(f"Failed to create ticket in {project_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/tickets/{ticket_id}")
async def update_ticket_detail(ticket_id: str, ticket: TicketUpdate):
    """Update a ticket's fields."""
    try:
        from ..core.crud import update_ticket, get_ticket_project_id
        
        # Get project ID before update for invalidation
        project_id = get_ticket_project_id(ticket_id)
        
        data = {k: v for k, v in ticket.model_dump().items() if v is not None}
        result = update_ticket(ticket_id, data)
        if not result:
            raise HTTPException(status_code=404, detail="Ticket not found")
            
        if project_id:
            invalidate_project_risk(project_id)
            
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update ticket {ticket_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/tickets/{ticket_id}/status")
async def patch_ticket_status(ticket_id: str, body: TicketStatusUpdate):
    """Update just the status of a ticket (drag-drop)."""
    try:
        from ..core.crud import update_ticket_status, get_ticket_project_id
        
        # Get project ID before update
        project_id = get_ticket_project_id(ticket_id)
        
        result = update_ticket_status(ticket_id, body.status)
        if not result:
            raise HTTPException(status_code=404, detail="Ticket not found")
            
        if project_id:
            invalidate_project_risk(project_id)
            
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update status for {ticket_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/tickets/{ticket_id}")
async def remove_ticket(ticket_id: str):
    """Delete a ticket."""
    try:
        from ..core.crud import delete_ticket, get_ticket_project_id
        
        # Get project ID before delete because relationship will be gone
        project_id = get_ticket_project_id(ticket_id)
        
        delete_ticket(ticket_id)
        
        if project_id:
            invalidate_project_risk(project_id)
            
        return {"status": "deleted", "id": ticket_id}
    except Exception as e:
        logger.error(f"Failed to delete ticket {ticket_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Members
# ============================================================================

@router.get("/members")
async def list_members():
    """Get all team members."""
    try:
        from ..core.crud import get_all_members
        return get_all_members()
    except Exception as e:
        logger.error(f"Failed to fetch members: {e}")
        raise HTTPException(status_code=500, detail=str(e))
