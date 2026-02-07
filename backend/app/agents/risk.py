"""
RiskAgent — Deterministic reasoning unit.
Reads REAL ticket data from Neo4j and produces evidence-based risk opinions.

Mental model:
  Graph = State of reality
  Agent = Structured reasoning (this file)
  LLM   = Explanation layer
  Human = Decision maker
"""
from datetime import datetime, timedelta
from typing import List, Dict, Any
from ..core.models import AnalysisResult, AgentOpinion
from .simulation import SimulationAgent
from .constraints import ConstraintAgent
from ..core.neo4j_client import neo4j_client
from ..core.constants import (
    RISK_WEIGHTS,
    BLOCKER_CRITICAL_DAYS,
    get_risk_level
)
import logging

logger = logging.getLogger(__name__)


class DeliveryRiskAgent:
    """
    Analyzes REAL project data from Neo4j to detect delivery risks.
    No fake events. No fabricated scenarios. Only graph truth.
    """
    def __init__(self):
        self.simulator = SimulationAgent()
        self.constraint_agent = ConstraintAgent()

    def _get_project_data(self, project_id: str) -> Dict[str, Any]:
        """Query Neo4j for real project state."""
        query = """
        MATCH (p:Project {id: $pid})
        OPTIONAL MATCH (t:Team)-[:HAS_PROJECT]->(p)
        OPTIONAL MATCH (p)-[:HAS_TICKET]->(tk:Ticket)
        OPTIONAL MATCH (tk)<-[:ASSIGNED_TO]-(m:Member)
        OPTIONAL MATCH (tk)<-[:BLOCKED_BY]-(blocker:Ticket)
        RETURN p { .* } as project,
               t.name as team_name,
               t.id as team_id,
               collect(DISTINCT tk { .*, 
                   assignee_name: m.name, 
                   assignee_id: m.id,
                   blocker_id: blocker.id,
                   blocker_title: blocker.title,
                   blocker_status: blocker.status
               }) as tickets
        """
        records, _ = neo4j_client.execute_query(query, {"pid": project_id})
        if not records:
            return {}
        rec = records[0]
        return {
            "project": dict(rec["project"]) if rec["project"] else {},
            "team_name": rec["team_name"],
            "team_id": rec["team_id"],
            "tickets": [dict(t) for t in rec["tickets"] if t.get("id")],
        }

    def analyze(self, project_id: str) -> AnalysisResult:
        """
        Deterministic risk analysis from real Neo4j data.
        Rules:
          - IF critical ticket AND blocked > 3 days AND due within 7 days → HIGH
          - IF tickets overdue but not blocked → MEDIUM
          - Else → LOW
        """
        data = self._get_project_data(project_id)
        project = data.get("project", {})
        tickets = data.get("tickets", [])
        team_name = data.get("team_name", "Unknown")

        reasons: List[str] = []
        risk_score = 0.0
        now = datetime.now()
        blocked_tickets: List[Dict] = []
        overdue_tickets: List[Dict] = []
        near_deadline_tickets: List[Dict] = []

        for tk in tickets:
            tk_id = tk.get("id", "?")
            tk_title = tk.get("title", "?")
            status = tk.get("status", "")
            priority = tk.get("priority", "Medium")
            due_str = tk.get("dueDate", "")
            blocker_id = tk.get("blocker_id")
            blocker_title = tk.get("blocker_title")
            blocker_status = tk.get("blocker_status")

            # Skip done tickets
            if status == "Done":
                continue

            # ── Pattern 1: Blocked dependency ──
            if blocker_id and blocker_status != "Done":
                blocked_tickets.append(tk)
                reasons.append(
                    f"🔴 {tk_id} \"{tk_title}\" is blocked by {blocker_id} \"{blocker_title}\" (status: {blocker_status})"
                )
                risk_score += RISK_WEIGHTS["blocked_dependency"]

                # Extra weight for high-priority blocked tickets
                if priority == "High":
                    reasons.append(f"⚠️ Blocked ticket {tk_id} is HIGH priority")
                    risk_score += 0.1

            # ── Pattern 2: Deadline proximity ──
            if due_str:
                try:
                    due_date = datetime.strptime(due_str, "%Y-%m-%d")
                    days_left = (due_date - now).days

                    if days_left < 0:
                        # Overdue
                        overdue_tickets.append(tk)
                        reasons.append(
                            f"🕐 {tk_id} \"{tk_title}\" is {abs(days_left)} days OVERDUE (due: {due_str})"
                        )
                        risk_score += RISK_WEIGHTS["overdue_ticket"]

                    elif days_left <= 7:
                        # Near deadline
                        near_deadline_tickets.append(tk)
                        reasons.append(
                            f"📅 {tk_id} \"{tk_title}\" due in {days_left} days (status: {status})"
                        )
                        risk_score += RISK_WEIGHTS["deadline_proximity"]
                except ValueError:
                    pass  # Skip malformed dates

        # Normalize: weight by ticket count so projects with many tickets
        # aren't equally penalized as tiny projects with few tickets
        if total_active > 0 and risk_score > 0:
            # Base normalization: scale raw risk by the ratio of flagged tickets
            flagged_count = len(blocked_tickets) + len(overdue_tickets) + len(near_deadline_tickets)
            issue_ratio = flagged_count / max(total_active, 1)
            # Blend: 60% raw signal strength + 40% issue prevalence
            risk_score = (risk_score * 0.6) + (min(risk_score, 1.0) * issue_ratio * 0.4)
        risk_score = min(risk_score, 1.0)
        risk_level = get_risk_level(risk_score)

        # ── Compute real context for downstream agents ──
        total_active = len([t for t in tickets if t.get("status") != "Done"])
        earliest_due = None
        for tk in tickets:
            if tk.get("status") != "Done" and tk.get("dueDate"):
                try:
                    d = datetime.strptime(tk["dueDate"], "%Y-%m-%d")
                    if earliest_due is None or d < earliest_due:
                        earliest_due = d
                except ValueError:
                    pass

        days_to_deadline = (earliest_due - now).days if earliest_due else 30

        # Count tickets per assignee for capacity
        assignee_counts: Dict[str, int] = {}
        for tk in tickets:
            aid = tk.get("assignee_id", "unassigned")
            if aid and tk.get("status") != "Done":
                assignee_counts[aid] = assignee_counts.get(aid, 0) + 1
        max_load = max(assignee_counts.values()) if assignee_counts else 0
        capacity_pct = min(int((max_load / max(total_active, 1)) * 200), 150)

        sim_context = {
            "is_blocked": len(blocked_tickets) > 0,
            "days_to_deadline": max(days_to_deadline, 1),
            "blocker": blocked_tickets[0].get("blocker_id") if blocked_tickets else None,
            "team_capacity_percent": capacity_pct,
        }

        # ── Agent opinions ──
        agent_opinions: List[AgentOpinion] = []

        # 1. RiskAgent opinion
        risk_opinion = AgentOpinion(
            agent="RiskAgent",
            claim=(
                f"{risk_level} delivery risk: {len(blocked_tickets)} blocked, "
                f"{len(overdue_tickets)} overdue, {len(near_deadline_tickets)} near deadline"
            ) if risk_score > 0.1 else "No significant delivery risks detected",
            confidence=min(0.95, 0.4 + risk_score * 0.5),
            evidence=reasons if reasons else [
                f"All {total_active} active tickets are on track",
                f"Project: {project.get('name', project_id)}, Team: {team_name}"
            ]
        )
        agent_opinions.append(risk_opinion)

        # 2. ConstraintAgent opinion
        constraint_opinion = self.constraint_agent.evaluate_all_constraints(sim_context)
        agent_opinions.append(constraint_opinion)

        # 3. SimulationAgent opinion + decision comparison
        decision_comparison, simulation_opinion = self.simulator.generate_decision_comparison(
            risk_score, sim_context
        )
        agent_opinions.append(simulation_opinion)

        # Legacy actions list
        actions = self.simulator.simulate_interventions(risk_score, sim_context)

        # ── LLM Explanation (GenAI layer) ──
        primary_reason = "No significant risks detected — all tickets are on track."
        if reasons:
            try:
                from ..core.llm import llm_client

                agent_summary = "\n".join([
                    f"- {op.agent}: {op.claim} (confidence: {op.confidence:.0%})"
                    for op in agent_opinions
                ])

                decision_table = "\n".join([
                    f"- {d.action}: risk_reduction={d.risk_reduction:.0%}, cost={d.cost}, "
                    f"feasible={d.feasible}, recommended={d.recommended}"
                    for d in decision_comparison
                ])

                prompt = f"""
Project: {project.get('name', project_id)} (Team: {team_name})
Risk Score: {risk_score:.2f} ({risk_level})
Days to earliest deadline: {days_to_deadline}

Agent Opinions:
{agent_summary}

Evidence from Graph (REAL ticket data):
{chr(10).join(['- ' + r for r in reasons])}

Decision Comparison Table:
{decision_table}

Recommended Actions:
{chr(10).join(['- ' + a for a in actions])}

Task: Provide a 3-sentence analysis:
1. Summarize the PRIMARY risk driver using ONLY the evidence above.
2. COUNTERFACTUAL: State what happens if NO action is taken (e.g. "If we do nothing, delivery will slip by X days because ...").
3. CONTRAST the top two interventions from the Decision Comparison Table — explain which one is better and WHY (e.g. cost vs. risk-reduction trade-off).
Do NOT introduce new facts. Only use the evidence above.
"""
                primary_reason = llm_client.generate_reasoning(prompt)
            except Exception as e:
                logger.warning(f"LLM reasoning failed: {e}")
                primary_reason = reasons[0] if reasons else "Analysis complete."

        return AnalysisResult(
            project_id=project_id,
            project_name=project.get("name", ""),
            risk_score=risk_score,
            risk_level=risk_level,
            primary_reason=primary_reason,
            supporting_signals=reasons,
            recommended_actions=actions,
            agent_opinions=agent_opinions,
            decision_comparison=decision_comparison,
        )
