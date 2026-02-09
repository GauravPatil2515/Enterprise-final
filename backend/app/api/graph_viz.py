"""
Graph-Viz API Endpoints

Provides access to the graph-viz Neo4j database (separate from main project DB).
Used exclusively for the Knowledge Graph visualization page.
"""
from fastapi import APIRouter, Query
from neo4j import GraphDatabase
from typing import List, Dict, Any, Optional
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/graph-viz", tags=["graph-viz"])

# Initialize graph-viz Neo4j driver (separate database)
try:
    viz_driver = GraphDatabase.driver(
        settings.GRAPH_VIZ_NEO4J_URI,
        auth=(settings.GRAPH_VIZ_NEO4J_USERNAME, settings.GRAPH_VIZ_NEO4J_PASSWORD)
    )
    logger.info(f"✅ Connected to Graph-Viz Neo4j: {settings.GRAPH_VIZ_NEO4J_URI}")
except Exception as e:
    logger.error(f"❌ Failed to connect to Graph-Viz Neo4j: {e}")
    viz_driver = None


def get_filtered_graph_data(tx, departments: List[str], min_perf: float, show_skills: bool, project_id: Optional[str]):
    """
    Fetch filtered graph data from graph-viz Neo4j database.
    Ported from graph-viz/app.py
    """
    query = """
    // 1. Identify valid employees
    MATCH (e:Employee)-[:WORKS_IN]->(d:Department)
    WHERE ($all_depts OR d.name IN $depts) AND e.performance >= $min_perf
    
    // 2. Apply Project Filter if selected
    WITH e, d
    call {
        with e
        MATCH (e)-[:WORKS_ON]->(p:Project)
        WHERE $pid IS NULL OR elementId(p) = $pid
        RETURN count(p) as proj_match
    }
    WITH e, d, proj_match
    WHERE ($pid IS NULL) OR (proj_match > 0)
    
    // 3. Collect valid nodes
    WITH collect(DISTINCT e) as employees, collect(DISTINCT d) as departments
    
    // 4. Get relevant skills (only if toggled)
    CALL {
        WITH employees
        MATCH (e)-[:HAS_SKILL]->(s:Skill)
        WHERE $show_skills AND e IN employees
        RETURN collect(DISTINCT s) as skills
    }

    // 5. Get relevant projects (to show the project node itself)
    CALL {
        WITH employees
        MATCH (e)-[:WORKS_ON]->(p:Project)
        WHERE $pid IS NOT NULL AND elementId(p) = $pid
        RETURN collect(DISTINCT p) as projects
    }
    
    // 6. Combine all
    WITH employees, departments, skills, projects, (employees + departments + skills + projects) as all_nodes
    
    // 7. Find internal relationships
    MATCH (n)-[r]->(m)
    WHERE n IN all_nodes AND m IN all_nodes
    RETURN n, r, m
    """
    
    all_depts = True if not departments else False
    pid = project_id if project_id else None
    
    result = tx.run(query, all_depts=all_depts, depts=departments, min_perf=min_perf, show_skills=show_skills, pid=pid)
    
    nodes = {}
    links = []
    
    for record in result:
        n = record['n']
        m = record['m']
        r = record['r']
        
        if n.element_id not in nodes:
            nodes[n.element_id] = {
                "id": n.element_id, 
                "label": list(n.labels)[0] if n.labels else "Node",
                "properties": dict(n)
            }
        
        if m.element_id not in nodes:
            nodes[m.element_id] = {
                "id": m.element_id,
                "label": list(m.labels)[0] if m.labels else "Node",
                "properties": dict(m)
            }
            
        links.append({
            "source": n.element_id,
            "target": m.element_id,
            "type": r.type,
            "properties": dict(r)
        })
        
    return {"nodes": list(nodes.values()), "links": links}


def get_projects(tx):
    """Get all projects from graph-viz database"""
    query = "MATCH (p:Project) RETURN p.name as name, elementId(p) as id ORDER BY name"
    result = tx.run(query)
    return [{"name": r["name"], "id": r["id"]} for r in result]


def get_skills_by_category(tx):
    """Get skills grouped by category"""
    query = """
    MATCH (s:Skill)
    RETURN s.category as Category, collect(s.name) as Skills
    ORDER BY Category
    """
    result = tx.run(query)
    return {record["Category"]: record["Skills"] for record in result}


@router.get("/graph")
async def get_graph(
    departments: str = Query("", description="Comma-separated department names"),
    min_perf: float = Query(0, description="Minimum performance rating"),
    show_skills: bool = Query(False, description="Include skill nodes"),
    project_id: str = Query("", description="Filter by specific project ID")
) -> Dict[str, Any]:
    """
    Get filtered graph data from graph-viz Neo4j database.
    Returns nodes and links for 3D visualization.
    """
    if not viz_driver:
        return {"error": "Graph-Viz database not connected", "nodes": [], "links": []}
    
    dept_list = [d.strip() for d in departments.split(',') if d.strip()]
    
    with viz_driver.session() as session:
        data = session.execute_read(
            get_filtered_graph_data, 
            dept_list, 
            min_perf, 
            show_skills, 
            project_id if project_id else None
        )
    
    return data


@router.get("/projects")
async def list_projects() -> List[Dict[str, str]]:
    """Get all projects from graph-viz database"""
    if not viz_driver:
        return []
    
    with viz_driver.session() as session:
        data = session.execute_read(get_projects)
    
    return data


@router.get("/skills")
async def get_skills() -> Dict[str, List[str]]:
    """Get skills grouped by category"""
    if not viz_driver:
        return {}
    
    with viz_driver.session() as session:
        data = session.execute_read(get_skills_by_category)
    
    return data
