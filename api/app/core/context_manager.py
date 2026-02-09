"""
ContextAssembler — Unified context assembly for LLM prompts.

Aggregates Neo4j project data, agent outputs, risk analysis,
and team info into a structured context block with TTL caching.
"""

import logging
import time
from typing import Dict, List, Optional, Any
from datetime import datetime

from .neo4j_client import neo4j_client

logger = logging.getLogger(__name__)

CONTEXT_TTL = 300  # 5 minutes


class ContextAssembler:
    """
    Builds rich context blocks for LLM consumption by querying
    Neo4j and aggregating multiple data sources with caching.
    """

    def __init__(self):
        self._cache: Dict[str, dict] = {}  # key → {"data": ..., "ts": ...}

    # ── Cache helpers ─────────────────────────────────────────────────────

    def _get_cached(self, key: str) -> Optional[Any]:
        entry = self._cache.get(key)
        if entry and (time.time() - entry["ts"]) < CONTEXT_TTL:
            return entry["data"]
        return None

    def _set_cached(self, key: str, data: Any):
        self._cache[key] = {"data": data, "ts": time.time()}

    def invalidate(self, key: str):
        self._cache.pop(key, None)

    # ── Core data fetchers ────────────────────────────────────────────────

    def get_project_raw(self, project_id: str) -> dict:
        """Fetch raw project + tickets + blockers from Neo4j."""
        cache_key = f"project_raw:{project_id}"
        cached = self._get_cached(cache_key)
        if cached:
            return cached

        records, _ = neo4j_client.execute_query("""
            MATCH (p:Project {id: $pid})
            OPTIONAL MATCH (t:Team)-[:HAS_PROJECT]->(p)
            OPTIONAL MATCH (p)-[:HAS_TICKET]->(tk:Ticket)
            OPTIONAL MATCH (tk)<-[:ASSIGNED_TO]-(m:Member)
            OPTIONAL MATCH (tk)<-[:BLOCKED_BY]-(blocker:Ticket)
            RETURN p { .* } AS project,
                   t.name AS team,
                   collect(DISTINCT tk {
                       .*, assignee: m.name,
                       blocker_id: blocker.id,
                       blocker_title: blocker.title,
                       blocker_status: blocker.status
                   }) AS tickets
        """, {"pid": project_id})

        if not records:
            return {"project": {}, "team": "Unknown", "tickets": []}

        rec = records[0]
        result = {
            "project": dict(rec["project"]) if rec["project"] else {},
            "team": rec["team"] or "Unknown",
            "tickets": [dict(t) for t in rec["tickets"] if t.get("id")],
        }

        self._set_cached(cache_key, result)
        return result

    def get_team_members(self, team_name: str) -> List[dict]:
        """Fetch team members from Neo4j."""
        cache_key = f"team_members:{team_name}"
        cached = self._get_cached(cache_key)
        if cached:
            return cached

        records, _ = neo4j_client.execute_query("""
            MATCH (t:Team {name: $team})-[:HAS_MEMBER]->(m:Member)
            RETURN m { .* } AS member
        """, {"team": team_name})

        members = [dict(r["member"]) for r in records]
        self._set_cached(cache_key, members)
        return members

    def get_all_projects_summary(self) -> List[dict]:
        """Lightweight summary of all projects for overview context."""
        cache_key = "all_projects_summary"
        cached = self._get_cached(cache_key)
        if cached:
            return cached

        records, _ = neo4j_client.execute_query("""
            MATCH (t:Team)-[:HAS_PROJECT]->(p:Project)
            OPTIONAL MATCH (p)-[:HAS_TICKET]->(tk:Ticket)
            WITH t, p,
                 count(tk) AS total_tickets,
                 sum(CASE WHEN tk.status = 'Done' THEN 1 ELSE 0 END) AS done_tickets,
                 sum(CASE WHEN tk.status = 'In Progress' THEN 1 ELSE 0 END) AS in_progress
            RETURN t.name AS team, p.id AS project_id, p.name AS project_name,
                   p.status AS status, p.deadline AS deadline,
                   total_tickets, done_tickets, in_progress
            ORDER BY t.name, p.name
        """)

        summaries = [dict(r) for r in records]
        self._set_cached(cache_key, summaries)
        return summaries

    # ── Derived analytics ─────────────────────────────────────────────────

    def _compute_ticket_analytics(self, tickets: List[dict]) -> dict:
        """Compute blocking, overdue, velocity signals from tickets."""
        now = datetime.now()
        active = [t for t in tickets if t.get("status") != "Done"]
        done = [t for t in tickets if t.get("status") == "Done"]
        blocked = [
            t for t in tickets
            if t.get("blocker_id") and t.get("blocker_status") != "Done"
        ]
        overdue = []
        for t in tickets:
            if t.get("status") != "Done" and t.get("dueDate"):
                try:
                    d = datetime.strptime(t["dueDate"], "%Y-%m-%d")
                    if d < now:
                        overdue.append(t)
                except ValueError:
                    pass

        return {
            "total": len(tickets),
            "active": len(active),
            "done": len(done),
            "blocked_count": len(blocked),
            "overdue_count": len(overdue),
            "blocked_tickets": blocked,
            "overdue_tickets": overdue,
            "completion_pct": round(len(done) / max(len(tickets), 1) * 100, 1),
        }

    # ── Formatted context assembly ────────────────────────────────────────

    def assemble_project_context(
        self,
        project_id: str,
        risk_result: Optional[Any] = None,
    ) -> str:
        """
        Build a full text context block for LLM prompts.
        Optionally includes risk analysis results.
        """
        raw = self.get_project_raw(project_id)
        proj = raw["project"]
        team = raw["team"]
        tickets = raw["tickets"]
        analytics = self._compute_ticket_analytics(tickets)

        active = [t for t in tickets if t.get("status") != "Done"]

        lines = [
            "=== PROJECT CONTEXT (live from Neo4j) ===",
            f"Project: {proj.get('name', project_id)} (id: {project_id})",
            f"Team: {team}",
            f"Status: {proj.get('status', 'Unknown')}",
            f"Deadline: {proj.get('deadline', 'Not set')}",
            "",
            f"Tickets ({analytics['active']} active / {analytics['total']} total, {analytics['completion_pct']}% complete):",
        ]

        for t in active[:12]:
            lines.append(
                f"  - [{t.get('status')}] {t.get('id')}: {t.get('title')} "
                f"(priority: {t.get('priority')}, assignee: {t.get('assignee', 'unassigned')}, "
                f"due: {t.get('dueDate', 'none')})"
            )

        lines.append(f"\nBlocked ({analytics['blocked_count']}):")
        if analytics["blocked_tickets"]:
            for t in analytics["blocked_tickets"]:
                lines.append(f"  - {t.get('id')} blocked by {t.get('blocker_id')} \"{t.get('blocker_title')}\"")
        else:
            lines.append("  None")

        lines.append(f"\nOverdue ({analytics['overdue_count']}):")
        if analytics["overdue_tickets"]:
            for t in analytics["overdue_tickets"]:
                lines.append(f"  - {t.get('id')}: {t.get('title')} (due: {t.get('dueDate')})")
        else:
            lines.append("  None")

        # Append risk analysis if available
        if risk_result:
            lines.append(f"\nCurrent Risk Analysis:")
            lines.append(f"  Risk Score: {risk_result.risk_score:.2f} ({risk_result.risk_level})")
            lines.append(f"  Primary Reason: {risk_result.primary_reason}")
            lines.append(f"  Recommended Actions: {', '.join(risk_result.recommended_actions[:3])}")
            lines.append("  Decision Options:")
            for d in risk_result.decision_comparison:
                lines.append(
                    f"    - {d.action}: risk_reduction={d.risk_reduction:.0%}, "
                    f"cost={d.cost}, feasible={d.feasible}, recommended={d.recommended}"
                )

        return "\n".join(lines)

    def assemble_company_context(self) -> str:
        """Build context for company-wide analysis (Chairperson view)."""
        summaries = self.get_all_projects_summary()

        lines = ["=== COMPANY OVERVIEW (live from Neo4j) ==="]
        current_team = None
        for s in summaries:
            if s["team"] != current_team:
                current_team = s["team"]
                lines.append(f"\nTeam: {current_team}")
            pct = round(s["done_tickets"] / max(s["total_tickets"], 1) * 100)
            lines.append(
                f"  - {s['project_name']} [{s['status']}] "
                f"Deadline: {s.get('deadline', 'N/A')} | "
                f"Tickets: {s['done_tickets']}/{s['total_tickets']} ({pct}%) | "
                f"In Progress: {s['in_progress']}"
            )

        return "\n".join(lines)


# Singleton
context_assembler = ContextAssembler()
