from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from typing import List, Dict, Optional
import logging
import time
from .agents.risk import DeliveryRiskAgent
from .agents.team_simulator import TeamCompositionSimulator, TeamMutation, ROLE_PROFILES, team_simulator
from .core.models import AnalysisResult, RiskSnapshot
from .core.constants import ROLE_DEFINITIONS
from .core.config import settings
from .api.routes import router as crud_router
from .core.neo4j_client import neo4j_client
from .core.llm import llm_client
from .core.model_router import model_router, TaskType
from .core.context_manager import context_assembler

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AI-Driven Delivery Intelligence",
    description="Decision Intelligence Platform for Engineering Operations",
    version="2.0.0"
)

# ── CORS — restricted to known frontend origins ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Risk analysis cache (TTL-based, avoids re-running LLM per chat msg) ──
_risk_cache: Dict[str, dict] = {}  # { project_id: { "result": ..., "ts": ... } }
RISK_CACHE_TTL = 300  # 5 minutes


def _get_cached_risk(project_id: str) -> Optional[AnalysisResult]:
    entry = _risk_cache.get(project_id)
    if entry and (time.time() - entry["ts"]) < RISK_CACHE_TTL:
        return entry["result"]
    return None


def _set_cached_risk(project_id: str, result: AnalysisResult):
    _risk_cache[project_id] = {"result": result, "ts": time.time()}


# ── Shutdown: close Neo4j driver ──
@app.on_event("shutdown")
async def shutdown_event():
    neo4j_client.close()
    logger.info("Neo4j connection closed")


# Include CRUD routes
app.include_router(crud_router)

# Initialize risk agent (reads Neo4j directly)
risk_agent = DeliveryRiskAgent()


@app.get("/api/analyze/{project_id}", response_model=AnalysisResult)
async def analyze_project(project_id: str):
    """
    Analyze project delivery risk.
    Graph → Agents → LLM → Human pipeline. No fake data.
    Results are cached for 5 minutes to speed up chat.
    """
    try:
        cached = _get_cached_risk(project_id)
        if cached:
            return cached
        result = risk_agent.analyze(project_id)
        _set_cached_risk(project_id, result)
        return result
    except Exception as e:
        logger.error(f"Analysis failed for {project_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis error: {str(e)}")


# ── Chat Models ──

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    project_id: Optional[str] = None
    messages: List[ChatMessage]


def _build_project_context(project_id: str) -> str:
    """Build a rich context block from Neo4j for the given project using ContextAssembler."""
    try:
        # Get risk analysis result from cache or run fresh
        risk_result = None
        try:
            risk_result = _get_cached_risk(project_id)
            if not risk_result:
                risk_result = risk_agent.analyze(project_id)
                _set_cached_risk(project_id, risk_result)
        except Exception:
            pass

        ctx = context_assembler.assemble_project_context(project_id, risk_result)
        return f"{ctx}\n=== END CONTEXT ==="
    except Exception as e:
        return f"Error loading project context: {str(e)}"


@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    """
    Conversational AI chat — answers questions about projects using real Neo4j data.
    Uses ModelRouter for intent classification and task-specific model selection.
    """
    try:
        # Build context from project data
        context = ""
        if req.project_id:
            context = _build_project_context(req.project_id)

        # Prepare messages: inject context into first user message
        messages = [{"role": m.role, "content": m.content} for m in req.messages]
        if context and messages:
            messages[0]["content"] = f"{context}\n\nUser question: {messages[0]['content']}"

        # Classify intent and route to appropriate model
        user_query = req.messages[-1].content if req.messages else ""
        intent = model_router.classify_intent(user_query)
        task = model_router.task_for_intent(intent)

        response = model_router.generate(task, messages)
        return {
            "role": "assistant",
            "content": response,
            "meta": {
                "intent": intent,
                "task_type": task.value,
                "model": "multi-model-router",
            },
        }

    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat/stream")
async def chat_stream_endpoint(req: ChatRequest):
    """
    Streaming conversational AI — returns SSE tokens as they are generated.
    Uses ModelRouter for task-specific model selection.
    """
    try:
        context = ""
        if req.project_id:
            context = _build_project_context(req.project_id)

        messages = [{"role": m.role, "content": m.content} for m in req.messages]
        if context and messages:
            messages[0]["content"] = f"{context}\n\nUser question: {messages[0]['content']}"

        # Classify intent for task-specific model
        user_query = req.messages[-1].content if req.messages else ""
        intent = model_router.classify_intent(user_query)
        task = model_router.task_for_intent(intent)

        def generate():
            try:
                # Send metadata as first event
                import json
                meta = json.dumps({"intent": intent, "task_type": task.value})
                yield f"data: [META]{meta}\n\n"
                for token in model_router.stream(task, messages):
                    yield f"data: {token}\n\n"
                yield "data: [DONE]\n\n"
            except Exception as e:
                yield f"data: [ERROR] {str(e)}\n\n"

        return StreamingResponse(generate(), media_type="text/event-stream")

    except Exception as e:
        logger.error(f"Chat stream error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Role-Based Endpoints ──

@app.get("/api/roles")
async def list_roles():
    """Return all available roles and their dashboard config."""
    return ROLE_DEFINITIONS


@app.get("/api/roles/{role}")
async def get_role_dashboard(role: str):
    """Return dashboard configuration for a specific role."""
    if role not in ROLE_DEFINITIONS:
        raise HTTPException(status_code=404, detail=f"Role '{role}' not found")
    return ROLE_DEFINITIONS[role]


@app.get("/api/system-users")
async def list_system_users():
    """Return all system users (for role selector)."""
    try:
        records, _ = neo4j_client.execute_query(
            "MATCH (su:SystemUser) RETURN su { .* } as user ORDER BY su.role"
        )
        return [dict(r["user"]) for r in records]
    except Exception as e:
        logger.error(f"Failed to fetch system users: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/system-users/{user_id}")
async def get_system_user(user_id: str):
    """Get a specific system user."""
    try:
        records, _ = neo4j_client.execute_query(
            "MATCH (su:SystemUser {id: $id}) RETURN su { .* } as user",
            {"id": user_id},
        )
        if not records:
            raise HTTPException(status_code=404, detail="User not found")
        return dict(records[0]["user"])
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/dashboard/{role}")
async def get_dashboard_data(role: str):
    """
    Role-filtered dashboard data.
    engineer  → own team's tickets + project progress
    hr        → all members + workload per person
    chairperson → all projects + risk summary
    finance   → cost overview of interventions
    """
    if role not in ROLE_DEFINITIONS:
        raise HTTPException(status_code=404, detail=f"Role '{role}' not found")

    try:
        data: dict = {"role": role, "config": ROLE_DEFINITIONS[role]}

        if role == "engineer":
            # Team tickets & project progress
            records, _ = neo4j_client.execute_query("""
                MATCH (t:Team)-[:HAS_PROJECT]->(p:Project)
                OPTIONAL MATCH (p)-[:HAS_TICKET]->(tk:Ticket)
                OPTIONAL MATCH (tk)<-[:ASSIGNED_TO]-(m:Member)
                WITH t, p, collect(DISTINCT tk { .*, assignee: m.name }) as tickets
                RETURN t.name as team, p { .* } as project, tickets
                ORDER BY t.name, p.name
            """)
            projects = []
            for r in records:
                proj = dict(r["project"]) if r["project"] else {}
                proj["team"] = r["team"]
                proj["tickets"] = [dict(tk) for tk in r["tickets"] if tk.get("id")]
                projects.append(proj)
            data["projects"] = projects

        elif role == "hr":
            # All members + ticket counts (workload)
            records, _ = neo4j_client.execute_query("""
                MATCH (m:Member)
                OPTIONAL MATCH (m)-[:ASSIGNED_TO]->(tk:Ticket)
                WHERE tk.status <> 'Done'
                OPTIONAL MATCH (m)-[:MEMBER_OF]->(t:Team)
                RETURN m { .* } as member, t.name as team,
                       count(tk) as active_tickets
                ORDER BY count(tk) DESC
            """)
            members = []
            for r in records:
                mem = dict(r["member"])
                mem["team"] = r["team"] or "Unassigned"
                mem["active_tickets"] = r["active_tickets"]
                members.append(mem)
            data["members"] = members

        elif role == "chairperson":
            # All projects with risk overview
            records, _ = neo4j_client.execute_query("""
                MATCH (t:Team)-[:HAS_PROJECT]->(p:Project)
                OPTIONAL MATCH (p)-[:HAS_TICKET]->(tk:Ticket)
                WHERE tk.status <> 'Done'
                OPTIONAL MATCH (tk)<-[:BLOCKED_BY]-(blocker:Ticket)
                WHERE blocker.status <> 'Done'
                RETURN t.name as team, t.id as team_id, p { .* } as project,
                       count(DISTINCT tk) as active_tickets,
                       count(DISTINCT blocker) as blocked_count
                ORDER BY count(DISTINCT blocker) DESC
            """)
            projects = []
            for r in records:
                proj = dict(r["project"]) if r["project"] else {}
                proj["team"] = r["team"]
                proj["team_id"] = r["team_id"]
                proj["active_tickets"] = r["active_tickets"]
                proj["blocked_count"] = r["blocked_count"]
                projects.append(proj)
            data["projects"] = projects

        elif role == "finance":
            # Decision Economics: cost-impact modeling, risk-adjusted cost exposure
            from .core.constants import INTERVENTION_IMPACTS

            # Average cost per member per day (enterprise assumption)
            AVG_DAILY_COST = 180  # USD/day per member
            AVG_TICKET_REVENUE_UNIT = 8000  # estimated revenue per delivered ticket
            BASE_REVENUE_PER_MEMBER = 3000  # base monthly revenue contribution per member

            # 1. Team resource data
            records, _ = neo4j_client.execute_query("""
                MATCH (t:Team)
                OPTIONAL MATCH (t)<-[:MEMBER_OF]-(m:Member)
                OPTIONAL MATCH (t)-[:HAS_PROJECT]->(p:Project)
                OPTIONAL MATCH (p)-[:HAS_TICKET]->(tk:Ticket)
                WHERE tk.status <> 'Done'
                OPTIONAL MATCH (p)-[:HAS_TICKET]->(done:Ticket)
                WHERE done.status = 'Done'
                RETURN t { .* } as team,
                       count(DISTINCT m) as member_count,
                       count(DISTINCT p) as project_count,
                       count(DISTINCT tk) as active_ticket_count,
                       count(DISTINCT done) as done_ticket_count
            """)
            teams = []
            total_active_tickets = 0
            for r in records:
                team = dict(r["team"])
                mc = r["member_count"]
                active = r["active_ticket_count"]
                done = r["done_ticket_count"]
                team["member_count"] = mc
                team["project_count"] = r["project_count"]
                team["active_ticket_count"] = active
                team["done_ticket_count"] = done
                # Cost to Company (CTC): member_count * daily_cost * 30 days
                ctc = mc * AVG_DAILY_COST * 30
                # Revenue: base per-member contribution + delivered tickets * revenue unit
                revenue = (mc * BASE_REVENUE_PER_MEMBER) + (done * AVG_TICKET_REVENUE_UNIT)
                profit = revenue - ctc
                roi = round((profit / ctc) * 100, 1) if ctc > 0 else 0
                team["cost_to_company"] = ctc
                team["revenue"] = revenue
                team["profit"] = profit
                team["roi"] = roi
                total_active_tickets += active
                teams.append(team)
            data["teams"] = teams
            data["intervention_costs"] = INTERVENTION_IMPACTS

            # 2. Per-project cost exposure + ROI analysis
            proj_records, _ = neo4j_client.execute_query("""
                MATCH (t:Team)-[:HAS_PROJECT]->(p:Project)
                OPTIONAL MATCH (p)-[:HAS_TICKET]->(tk:Ticket)
                WHERE tk.status <> 'Done'
                OPTIONAL MATCH (p)-[:HAS_TICKET]->(done:Ticket)
                WHERE done.status = 'Done'
                OPTIONAL MATCH (tk)<-[:BLOCKED_BY]-(blocker:Ticket)
                WHERE blocker.status <> 'Done'
                OPTIONAL MATCH (t)<-[:MEMBER_OF]-(m:Member)
                WITH p, t, tk, done, blocker, m
                OPTIONAL MATCH (t)-[:HAS_PROJECT]->(tp:Project)
                RETURN p { .* } as project, t.name as team,
                       count(DISTINCT tk) as active_tickets,
                       count(DISTINCT done) as done_tickets,
                       count(DISTINCT blocker) as blocked_count,
                       count(DISTINCT m) as team_size,
                       count(DISTINCT tp) as project_count
            """)
            cost_analysis = []
            for r in proj_records:
                proj = dict(r["project"]) if r["project"] else {}
                active = r["active_tickets"]
                done = r["done_tickets"]
                blocked = r["blocked_count"]
                team_size = r["team_size"] or 1

                cost_per_ticket = round(team_size * 0.5 / max(active, 1), 2)
                risk_cost = round((active * cost_per_ticket) + (blocked * cost_per_ticket * 3), 1)
                burn_rate = round(team_size * 0.5, 1)

                # Financial metrics per project
                total_tickets = active + done
                project_count = r["project_count"] or 1
                proj_ctc = round(team_size * AVG_DAILY_COST * 30 / max(project_count, 1))  # share of team CTC
                # Revenue from delivered tickets + base member contribution share
                proj_revenue = (done * AVG_TICKET_REVENUE_UNIT) + round(team_size * BASE_REVENUE_PER_MEMBER / max(project_count, 1))
                # Expected future revenue from active tickets (weighted by progress)
                progress_val = proj.get("progress", 0) or 0
                expected_revenue = round(active * AVG_TICKET_REVENUE_UNIT * (progress_val / 100), 0)
                proj_profit = proj_revenue - proj_ctc
                proj_roi = round((proj_profit / proj_ctc) * 100, 1) if proj_ctc > 0 else 0

                cost_analysis.append({
                    "project_id": proj.get("id"),
                    "project_name": proj.get("name", "Unknown"),
                    "team": r["team"],
                    "active_tickets": active,
                    "done_tickets": done,
                    "total_tickets": total_tickets,
                    "blocked_count": blocked,
                    "team_size": team_size,
                    "cost_per_ticket": cost_per_ticket,
                    "risk_adjusted_cost": risk_cost,
                    "burn_rate": burn_rate,
                    "cost_to_company": proj_ctc,
                    "revenue": proj_revenue,
                    "expected_revenue": expected_revenue,
                    "profit": proj_profit,
                    "roi": proj_roi,
                    "status": proj.get("status", "Unknown"),
                    "progress": proj.get("progress", 0),
                })
            data["cost_analysis"] = cost_analysis
            data["total_active_tickets"] = total_active_tickets

        return data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Dashboard error for role {role}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/graph")
async def get_graph_data():
    """
    Return every node and relationship in Neo4j for the graph visualisation page.
    Returns { nodes: [...], edges: [...] }
    """
    try:
        # ── Nodes ──
        node_records, _ = neo4j_client.execute_query("""
            MATCH (n)
            WHERE n:Team OR n:Project OR n:Ticket OR n:Member OR n:SystemUser
            RETURN id(n) AS neo_id,
                   labels(n)[0] AS label,
                   n { .* } AS props
        """)
        nodes = []
        for r in node_records:
            props = dict(r["props"]) if r["props"] else {}
            nodes.append({
                "neo_id": r["neo_id"],
                "id": props.get("id", str(r["neo_id"])),
                "label": r["label"],
                "name": props.get("name") or props.get("title") or props.get("id", ""),
                "props": props,
            })

        # ── Edges ──
        edge_records, _ = neo4j_client.execute_query("""
            MATCH (a)-[r]->(b)
            WHERE (a:Team OR a:Project OR a:Ticket OR a:Member OR a:SystemUser)
              AND (b:Team OR b:Project OR b:Ticket OR b:Member OR b:SystemUser)
            RETURN id(a) AS source_neo, id(b) AS target_neo, type(r) AS rel_type
        """)
        # build neo_id -> id map
        neo_map = {n["neo_id"]: n["id"] for n in nodes}
        edges = []
        for r in edge_records:
            src = neo_map.get(r["source_neo"])
            tgt = neo_map.get(r["target_neo"])
            if src and tgt:
                edges.append({"source": src, "target": tgt, "type": r["rel_type"]})

        return {"nodes": nodes, "edges": edges}
    except Exception as e:
        logger.error(f"Graph data error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Company-wide Report (Chairperson)
# ============================================================================

@app.get("/api/company-report")
async def get_company_report():
    """
    Full company analysis: teams, projects, tickets, workforce, risk summary.
    Used by chairperson for report generation.
    """
    try:
        # 1. All teams with projects and ticket stats
        records, _ = neo4j_client.execute_query("""
            MATCH (t:Team)-[:HAS_PROJECT]->(p:Project)
            OPTIONAL MATCH (t)<-[:MEMBER_OF]-(m:Member)
            WITH t, p, collect(DISTINCT m) as members
            OPTIONAL MATCH (p)-[:HAS_TICKET]->(tk:Ticket)
            WHERE tk.status <> 'Done'
            WITH t, p, members, collect(DISTINCT tk) as active_tks
            OPTIONAL MATCH (p)-[:HAS_TICKET]->(done:Ticket)
            WHERE done.status = 'Done'
            WITH t, p, members, active_tks, collect(DISTINCT done) as done_tks
            OPTIONAL MATCH (p)-[:HAS_TICKET]->(blocked:Ticket)<-[:BLOCKED_BY]-(blocker:Ticket)
            WHERE blocker.status <> 'Done'
            WITH t, p, members, active_tks, done_tks, count(DISTINCT blocked) as blocked_count
            RETURN t { .* } as team,
                   p { .* } as project,
                   size(members) as team_members,
                   size(active_tks) as active_tickets,
                   size(done_tks) as done_tickets,
                   blocked_count
            ORDER BY t.name, p.name
        """)

        teams_map = {}
        all_projects = []
        for r in records:
            team = dict(r["team"]) if r["team"] else {}
            proj = dict(r["project"]) if r["project"] else {}
            tid = team.get("id", "unknown")

            if tid not in teams_map:
                teams_map[tid] = {
                    **team,
                    "member_count": r["team_members"],
                    "projects": [],
                    "total_active": 0,
                    "total_done": 0,
                    "total_blocked": 0,
                }

            proj_data = {
                **proj,
                "team": team.get("name"),
                "team_id": tid,
                "active_tickets": r["active_tickets"],
                "done_tickets": r["done_tickets"],
                "blocked_count": r["blocked_count"],
            }
            teams_map[tid]["projects"].append(proj_data)
            teams_map[tid]["total_active"] += r["active_tickets"]
            teams_map[tid]["total_done"] += r["done_tickets"]
            teams_map[tid]["total_blocked"] += r["blocked_count"]
            all_projects.append(proj_data)

        # 2. Workforce summary
        mem_records, _ = neo4j_client.execute_query("""
            MATCH (m:Member)
            OPTIONAL MATCH (m)-[:ASSIGNED_TO]->(tk:Ticket)
            WHERE tk.status <> 'Done'
            OPTIONAL MATCH (m)-[:MEMBER_OF]->(t:Team)
            RETURN m.name as name, m.role as role, t.name as team,
                   count(tk) as active_tickets
            ORDER BY count(tk) DESC
        """)
        workforce = [dict(r) for r in mem_records]
        overloaded = [w for w in workforce if w["active_tickets"] >= 3]
        idle = [w for w in workforce if w["active_tickets"] == 0]

        # 3. Aggregated stats
        total_members = len(workforce)
        total_projects = len(all_projects)
        total_active = sum(p["active_tickets"] for p in all_projects)
        total_done = sum(p["done_tickets"] for p in all_projects)
        total_blocked = sum(p["blocked_count"] for p in all_projects)
        avg_progress = round(sum(p.get("progress", 0) for p in all_projects) / max(total_projects, 1), 1)
        completion_rate = round((total_done / max(total_active + total_done, 1)) * 100, 1)

        return {
            "teams": list(teams_map.values()),
            "projects": all_projects,
            "workforce": workforce,
            "summary": {
                "total_teams": len(teams_map),
                "total_members": total_members,
                "total_projects": total_projects,
                "total_active_tickets": total_active,
                "total_done_tickets": total_done,
                "total_blocked": total_blocked,
                "avg_progress": avg_progress,
                "completion_rate": completion_rate,
                "overloaded_members": len(overloaded),
                "idle_members": len(idle),
            },
        }
    except Exception as e:
        logger.error(f"Company report error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/company-report/generate")
async def generate_company_report():
    """
    Generate a full AI-powered company analysis report using LLM.
    Returns structured markdown report.
    """
    try:
        # Get company data
        report_data = await get_company_report()
        summary = report_data["summary"]
        teams = report_data["teams"]
        projects = report_data["projects"]
        workforce = report_data["workforce"]

        # Build context for LLM
        teams_ctx = "\n".join([
            f"  - {t.get('name')}: {t.get('member_count')} members, "
            f"{len(t.get('projects', []))} projects, "
            f"{t.get('total_active')} active tickets, "
            f"{t.get('total_done')} completed, "
            f"{t.get('total_blocked')} blocked"
            for t in teams
        ])

        projects_ctx = "\n".join([
            f"  - {p.get('name')} ({p.get('team')}): {p.get('status')}, "
            f"{p.get('progress', 0)}% done, "
            f"{p.get('active_tickets')} active, "
            f"{p.get('done_tickets')} done, "
            f"{p.get('blocked_count')} blocked"
            for p in projects
        ])

        overloaded_ctx = "\n".join([
            f"  - {w['name']} ({w.get('role')}, {w.get('team')}): {w['active_tickets']} active tickets"
            for w in workforce if w["active_tickets"] >= 3
        ]) or "  None"

        prompt = f"""Generate a comprehensive COMPANY ANALYSIS REPORT based on the following live organizational data.
Use ONLY the provided data — do NOT invent information.

COMPANY OVERVIEW:
  Teams: {summary['total_teams']}
  Total Members: {summary['total_members']}
  Total Projects: {summary['total_projects']}
  Active Tickets: {summary['total_active_tickets']}
  Completed Tickets: {summary['total_done_tickets']}
  Blocked Items: {summary['total_blocked']}
  Average Progress: {summary['avg_progress']}%
  Completion Rate: {summary['completion_rate']}%
  Overloaded Members: {summary['overloaded_members']}
  Idle Members: {summary['idle_members']}

TEAMS:
{teams_ctx}

PROJECTS:
{projects_ctx}

OVERLOADED MEMBERS (3+ tickets):
{overloaded_ctx}

Format the report with these sections:
1. **Executive Summary** — 3-4 sentence overview of company health
2. **Team Performance** — analysis of each team's delivery velocity and bottlenecks
3. **Project Status Overview** — table/list of all projects with risk assessment
4. **Workforce Analysis** — workload distribution, burnout risks, utilization
5. **Risk & Blockers** — critical blocked items and dependency chains
6. **Financial Impact** — cost implications of current trajectory (assume $450/member/day)
7. **Strategic Recommendations** — ranked list of 5 actionable items
8. **90-Day Outlook** — projected trajectory if current trends continue

Use markdown formatting with headers, bullet points, and bold for key metrics.
Be data-driven, strategic, and actionable.
"""

        report_text = model_router.generate(
            TaskType.EXPLANATION,
            [{"role": "system", "content": "You are a chief strategy officer producing a company analysis report for the board. Be thorough, data-driven, and strategic."},
             {"role": "user", "content": prompt}],
        )

        return {
            "report": report_text,
            "summary": summary,
            "generated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        }
    except Exception as e:
        logger.error(f"Company report generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Risk History / Trend Tracking
# ============================================================================

@app.post("/api/risk-snapshot/{project_id}")
async def save_risk_snapshot(project_id: str):
    """
    Run risk analysis and persist a snapshot node in Neo4j.
    Returns the snapshot.
    """
    try:
        result = risk_agent.analyze(project_id)

        # Count blocked & overdue from supporting_signals
        blocked = sum(1 for s in result.supporting_signals if "blocked" in s.lower())
        overdue = sum(1 for s in result.supporting_signals if "overdue" in s.lower())
        total = len(result.supporting_signals)

        snapshot = RiskSnapshot(
            project_id=project_id,
            project_name=result.project_name,
            risk_score=result.risk_score,
            risk_level=result.risk_level,
            blocked_count=blocked,
            overdue_count=overdue,
            total_tickets=total,
        )

        # Persist to Neo4j
        neo4j_client.execute_query(
            """
            MATCH (p:Project {id: $pid})
            CREATE (s:RiskSnapshot {
                project_id: $pid,
                project_name: $pname,
                risk_score: $score,
                risk_level: $level,
                blocked_count: $blocked,
                overdue_count: $overdue,
                total_tickets: $total,
                timestamp: $ts
            })
            CREATE (p)-[:HAS_SNAPSHOT]->(s)
            """,
            {
                "pid": snapshot.project_id,
                "pname": snapshot.project_name,
                "score": snapshot.risk_score,
                "level": snapshot.risk_level,
                "blocked": snapshot.blocked_count,
                "overdue": snapshot.overdue_count,
                "total": snapshot.total_tickets,
                "ts": snapshot.timestamp,
            },
        )

        return snapshot.model_dump()
    except Exception as e:
        logger.error(f"Snapshot save error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/risk-history/{project_id}")
async def get_risk_history(project_id: str, limit: int = 30):
    """
    Retrieve risk snapshots for a project, ordered by timestamp desc.
    """
    try:
        records, _ = neo4j_client.execute_query(
            """
            MATCH (p:Project {id: $pid})-[:HAS_SNAPSHOT]->(s:RiskSnapshot)
            RETURN s { .* } as snapshot
            ORDER BY s.timestamp DESC
            LIMIT $lim
            """,
            {"pid": project_id, "lim": limit},
        )
        snapshots = [dict(r["snapshot"]) for r in records]
        snapshots.reverse()  # chronological order for charting
        return snapshots
    except Exception as e:
        logger.error(f"Risk history error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Postmortem Generator
# ============================================================================

@app.get("/api/postmortem/{project_id}")
async def generate_postmortem(project_id: str):
    """
    Generate a structured postmortem report for a project using
    risk analysis data + LLM reasoning.
    """
    try:
        # Get full analysis
        result = risk_agent.analyze(project_id)

        # Build evidence summary
        signals = "\n".join([f"- {s}" for s in result.supporting_signals]) or "- No issues detected"
        actions = "\n".join([f"- {a}" for a in result.recommended_actions]) or "- None"
        decisions = "\n".join([
            f"- {d.action}: risk_reduction={d.risk_reduction:.0%}, "
            f"cost={d.cost}, feasible={d.feasible}, recommended={d.recommended}"
            for d in result.decision_comparison
        ])

        prompt = f"""
Generate a structured POSTMORTEM report for this project.
Use ONLY the evidence provided below — do NOT invent facts.

Project: {result.project_name} (ID: {result.project_id})
Risk Score: {result.risk_score:.2f} ({result.risk_level})
AI Summary: {result.primary_reason}

Evidence Signals:
{signals}

Recommended Actions:
{actions}

Decision Comparison (Monte Carlo results):
{decisions}

Format the postmortem with these sections:
1. **Executive Summary** (2 sentences)
2. **What Went Wrong** (bullet points from evidence)
3. **Root Cause Analysis** (why these issues happened)
4. **Impact Assessment** (what's at stake if unresolved)
5. **Action Items** (ranked by priority, from the recommended actions)
6. **Lessons Learned** (what to do differently next time)

Be direct, data-driven, and actionable.
"""
        postmortem_text = model_router.generate(
            TaskType.POSTMORTEM,
            [{"role": "user", "content": prompt}],
        )

        return {
            "project_id": result.project_id,
            "project_name": result.project_name,
            "risk_score": result.risk_score,
            "risk_level": result.risk_level,
            "postmortem": postmortem_text,
            "generated_from": {
                "signals_count": len(result.supporting_signals),
                "actions_count": len(result.recommended_actions),
                "agents_consulted": [op.agent for op in result.agent_opinions],
            },
        }
    except Exception as e:
        logger.error(f"Postmortem generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/narrative/{role}")
async def get_narrative(role: str):
    """
    LLM-powered executive narrative for each role.
    Reads real Neo4j data, runs it through the LLM for a plain-English intelligence briefing.
    """
    if role not in ROLE_DEFINITIONS:
        raise HTTPException(status_code=404, detail=f"Role '{role}' not found")

    try:
        # Gather live data from Neo4j
        context_parts = []

        if role in ("chairperson", "engineer", "finance"):
            records, _ = neo4j_client.execute_query("""
                MATCH (t:Team)-[:HAS_PROJECT]->(p:Project)
                OPTIONAL MATCH (p)-[:HAS_TICKET]->(tk:Ticket)
                OPTIONAL MATCH (tk)<-[:BLOCKED_BY]-(blocker:Ticket)
                WHERE blocker.status <> 'Done'
                RETURN p.name as project, p.status as status, p.progress as progress,
                       t.name as team,
                       count(DISTINCT tk) as tickets,
                       count(DISTINCT blocker) as blockers
            """)
            context_parts.append("PROJECTS:\n" + "\n".join([
                f"  - {r['project']} ({r['team']}): {r['status']}, {r['progress']}% done, {r['tickets']} tickets, {r['blockers']} blockers"
                for r in records
            ]))

        if role in ("hr", "chairperson"):
            records, _ = neo4j_client.execute_query("""
                MATCH (m:Member)
                OPTIONAL MATCH (m)-[:ASSIGNED_TO]->(tk:Ticket)
                WHERE tk.status <> 'Done'
                OPTIONAL MATCH (m)-[:MEMBER_OF]->(t:Team)
                RETURN m.name as name, m.role as role, t.name as team,
                       count(tk) as active_tickets
                ORDER BY count(tk) DESC
            """)
            overloaded = [r for r in records if r['active_tickets'] >= 3]
            idle = [r for r in records if r['active_tickets'] == 0]
            context_parts.append(
                f"WORKFORCE ({len(records)} members, {len(overloaded)} overloaded, {len(idle)} idle):\n" +
                "\n".join([f"  - {r['name']} ({r['role']}, {r['team']}): {r['active_tickets']} tickets" for r in records[:15]])
            )

        if role == "finance":
            from .core.constants import INTERVENTION_IMPACTS
            context_parts.append(
                "INTERVENTIONS:\n" +
                "\n".join([f"  - {action}: risk_reduction={v.get('risk_reduction','?')}, cost={v.get('cost_penalty','?')}" for action, v in INTERVENTION_IMPACTS.items()])
            )

        combined_context = "\n\n".join(context_parts)

        role_prompts = {
            "engineer": "You are a senior engineering lead. Based on the project data below, provide a 2-3 sentence briefing on what engineers should focus on today. Highlight blockers, overdue items, and priority work. Be direct and actionable.",
            "hr": "You are an HR strategist. Based on the workforce data below, provide a 2-3 sentence briefing on team health, workload distribution, and any staffing concerns. Flag overloaded or idle team members.",
            "chairperson": "You are a chief delivery officer. Based on the project and workforce data below, provide a 2-3 sentence executive briefing on delivery health, top risks, and recommended decisions. Be concise and strategic.",
            "finance": "You are a finance analyst. Based on the resource and intervention data below, provide a 2-3 sentence briefing on cost efficiency, resource utilization, and ROI of potential interventions. Focus on numbers and impact.",
        }

        messages = [
            {"role": "system", "content": role_prompts.get(role, "Provide a brief intelligence summary.")},
            {"role": "user", "content": f"Here is the live organizational data:\n\n{combined_context}\n\nProvide your intelligence briefing now."},
        ]

        narrative = model_router.generate(TaskType.SUMMARY, messages)
        return {"role": role, "narrative": narrative}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Narrative error for {role}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Team Composition Simulator
# ============================================================================

class TeamSimulationRequest(BaseModel):
    project_id: str
    mutations: List[dict]  # [{"action": "add", "role": "Senior Engineer"}, ...]
    baseline_risk: Optional[float] = None


@app.post("/api/simulate-team")
async def simulate_team_changes(req: TeamSimulationRequest):
    """
    Simulate the impact of team composition changes on project risk.
    Accepts hypothetical mutations and returns Monte Carlo projections.
    """
    try:
        mutations = []
        for m in req.mutations:
            role = m.get("role", "Mid Engineer")
            if role not in ROLE_PROFILES:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unknown role '{role}'. Available: {list(ROLE_PROFILES.keys())}",
                )
            mutations.append(TeamMutation(
                action=m.get("action", "add"),
                role=role,
                project_id=req.project_id,
                member_name=m.get("member_name"),
                source_team=m.get("source_team"),
            ))

        # Get baseline risk from cache or let simulator estimate
        baseline = req.baseline_risk
        if baseline is None:
            cached = _get_cached_risk(req.project_id)
            if cached:
                baseline = cached.risk_score

        results = team_simulator.simulate_batch(mutations, baseline)

        return {
            "project_id": req.project_id,
            "baseline_risk": baseline or results[0].baseline_risk if results else 0.3,
            "simulations": [r.to_dict() for r in results],
            "available_roles": list(ROLE_PROFILES.keys()),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Team simulation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/simulate-team/roles")
async def get_available_roles():
    """Return available roles and their profiles for the simulator."""
    return {
        role: {
            "velocity_boost": p["velocity_boost"],
            "ramp_up_days": p["ramp_up_days"],
            "cost_per_day": p["cost_per_day"],
            "blocked_resolution": p["blocked_resolution"],
        }
        for role, p in ROLE_PROFILES.items()
    }


@app.get("/")
def health_check():
    connected = False
    try:
        connected = neo4j_client.verify_connection()
    except Exception:
        pass

    return {
        "status": "ok",
        "system": "Decision Intelligence Platform",
        "tagline": "Graph → Agents → LLM → Human",
        "agents": ["RiskAgent", "ConstraintAgent", "SimulationAgent", "TeamCompositionSimulator", "ModelRouter", "ContextAssembler"],
        "roles": list(ROLE_DEFINITIONS.keys()),
        "neo4j_status": "connected" if connected else "unavailable",
        "endpoints": {
            "crud": ["/api/teams", "/api/projects/{id}", "/api/tickets/{id}"],
            "ai": ["/api/analyze/{project_id}", "/api/chat", "/api/chat/stream", "/api/risk-snapshot/{project_id}", "/api/risk-history/{project_id}", "/api/postmortem/{project_id}", "/api/narrative/{role}"],
            "simulator": ["/api/simulate-team", "/api/simulate-team/roles"],
            "reports": ["/api/company-report", "/api/company-report/generate"],
            "roles": ["/api/roles", "/api/system-users", "/api/dashboard/{role}"],
        }
    }
