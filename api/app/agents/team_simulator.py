"""
TeamCompositionSimulator — Counterfactual team analysis.

'What if we add a Senior Engineer to Alpha team?'
'What if we move a member from Beta to Gamma?'

Uses Monte Carlo simulation on modified team compositions to
predict risk impact of team changes before they happen.
"""

import random
from typing import List, Dict, Any, Optional
from ..core.neo4j_client import neo4j_client
from ..core.context_manager import context_assembler
from .simulation import SimulationAgent, MC_DISTRIBUTIONS, N_SIMULATIONS

import logging

logger = logging.getLogger(__name__)


# ── Role effectiveness profiles ───────────────────────────────────────────

ROLE_PROFILES = {
    "Senior Engineer": {
        "velocity_boost": 0.20,      # +20% team velocity
        "ramp_up_days": 3,           # Fast onboarding
        "cost_per_day": 700,
        "blocked_resolution": 0.15,   # 15% chance of resolving blockers
    },
    "Mid Engineer": {
        "velocity_boost": 0.12,
        "ramp_up_days": 7,
        "cost_per_day": 450,
        "blocked_resolution": 0.05,
    },
    "Junior Engineer": {
        "velocity_boost": 0.05,
        "ramp_up_days": 14,
        "cost_per_day": 250,
        "blocked_resolution": 0.02,
    },
    "Tech Lead": {
        "velocity_boost": 0.10,
        "ramp_up_days": 5,
        "cost_per_day": 800,
        "blocked_resolution": 0.25,
    },
    "QA Engineer": {
        "velocity_boost": 0.08,
        "ramp_up_days": 5,
        "cost_per_day": 400,
        "blocked_resolution": 0.03,
    },
    "DevOps Engineer": {
        "velocity_boost": 0.06,
        "ramp_up_days": 5,
        "cost_per_day": 550,
        "blocked_resolution": 0.20,
    },
}


class TeamMutation:
    """Describes a hypothetical team change."""
    __slots__ = ("action", "role", "project_id", "member_name", "source_team")

    def __init__(
        self,
        action: str,        # "add" | "remove" | "transfer"
        role: str,           # from ROLE_PROFILES
        project_id: str,
        member_name: Optional[str] = None,
        source_team: Optional[str] = None,
    ):
        self.action = action
        self.role = role
        self.project_id = project_id
        self.member_name = member_name
        self.source_team = source_team


class SimulationResult:
    """Result of a team composition simulation."""
    __slots__ = (
        "mutation", "baseline_risk", "projected_risk",
        "risk_delta", "cost_delta", "velocity_change",
        "confidence", "reasoning", "feasible", "warning",
    )

    def __init__(self, **kwargs):
        for k in self.__slots__:
            setattr(self, k, kwargs.get(k))

    def to_dict(self) -> dict:
        return {
            "mutation": {
                "action": self.mutation.action,
                "role": self.mutation.role,
                "project_id": self.mutation.project_id,
                "member_name": self.mutation.member_name,
            },
            "baseline_risk": round(self.baseline_risk, 3),
            "projected_risk": round(self.projected_risk, 3),
            "risk_delta": round(self.risk_delta, 3),
            "cost_delta": round(self.cost_delta, 2),
            "velocity_change": round(self.velocity_change, 3),
            "confidence": round(self.confidence, 2),
            "reasoning": self.reasoning,
            "feasible": self.feasible,
            "warning": self.warning,
        }


class TeamCompositionSimulator:
    """
    Simulates the impact of team composition changes on project risk.
    Uses Monte Carlo trials with role-specific effectiveness profiles.
    """

    def __init__(self):
        self.sim_agent = SimulationAgent()

    def _get_current_team_size(self, project_id: str) -> int:
        """Get current number of assigned members for a project."""
        try:
            raw = context_assembler.get_project_raw(project_id)
            assignees = set()
            for t in raw["tickets"]:
                if t.get("assignee"):
                    assignees.add(t["assignee"])
            return max(len(assignees), 1)
        except Exception:
            return 3  # default fallback

    def _get_project_context(self, project_id: str) -> Dict[str, Any]:
        """Build simulation context from Neo4j data."""
        raw = context_assembler.get_project_raw(project_id)
        tickets = raw["tickets"]

        blocked = [t for t in tickets if t.get("blocker_id") and t.get("blocker_status") != "Done"]
        active = [t for t in tickets if t.get("status") != "Done"]

        from datetime import datetime
        now = datetime.now()
        days_to_deadline = 30
        if raw["project"].get("deadline"):
            try:
                dl = datetime.strptime(raw["project"]["deadline"], "%Y-%m-%d")
                days_to_deadline = max(0, (dl - now).days)
            except ValueError:
                pass

        return {
            "is_blocked": len(blocked) > 0,
            "blocked_count": len(blocked),
            "active_tickets": len(active),
            "total_tickets": len(tickets),
            "days_to_deadline": days_to_deadline,
            "team_size": self._get_current_team_size(project_id),
            "team_capacity_percent": int(len(active) / max(self._get_current_team_size(project_id), 1) * 40),
        }

    def simulate_mutation(
        self,
        mutation: TeamMutation,
        baseline_risk_score: Optional[float] = None,
    ) -> SimulationResult:
        """
        Simulate the impact of a single team mutation using Monte Carlo.
        """
        role_profile = ROLE_PROFILES.get(mutation.role, ROLE_PROFILES["Mid Engineer"])
        context = self._get_project_context(mutation.project_id)

        # Baseline risk from risk agent cache or estimate
        if baseline_risk_score is None:
            baseline_risk_score = self._estimate_baseline_risk(context)

        team_size = context["team_size"]
        days_to_deadline = context["days_to_deadline"]

        # ── Check feasibility ─────────────────────────────────────
        feasible = True
        warning = None

        if mutation.action == "add":
            if role_profile["ramp_up_days"] >= days_to_deadline:
                warning = (
                    f"Ramp-up time ({role_profile['ramp_up_days']}d) exceeds "
                    f"deadline ({days_to_deadline}d). Member won't be effective in time."
                )
                feasible = False
            if team_size >= 8:
                warning = "Team already at maximum recommended size (8). Brooks's Law applies."
                feasible = False

        elif mutation.action == "remove":
            if team_size <= 1:
                warning = "Cannot remove the only team member."
                feasible = False
            elif team_size <= 2 and context["active_tickets"] > 3:
                warning = "Removing a member leaves insufficient capacity for active tickets."
                feasible = False

        # ── Monte Carlo simulation ────────────────────────────────
        N = N_SIMULATIONS
        risk_samples = []
        velocity_samples = []

        for _ in range(N):
            if mutation.action == "add":
                # Risk reduction from adding a capable person
                velocity_boost = random.gauss(
                    role_profile["velocity_boost"],
                    role_profile["velocity_boost"] * 0.3,
                )
                # Ramp-up penalty proportional to how close deadline is
                ramp_penalty = (role_profile["ramp_up_days"] / max(days_to_deadline, 1)) * 0.1
                # Blocker resolution chance
                blocker_relief = 0
                if context["is_blocked"]:
                    if random.random() < role_profile["blocked_resolution"]:
                        blocker_relief = random.uniform(0.10, 0.25)

                net_rr = max(0, velocity_boost + blocker_relief - ramp_penalty)
                # Brooks's Law: diminishing returns above 5 members
                if team_size > 5:
                    brooks_factor = max(0.3, 1.0 - (team_size - 5) * 0.15)
                    net_rr *= brooks_factor

                projected = max(0, min(1, baseline_risk_score - net_rr))
                risk_samples.append(projected)
                velocity_samples.append(velocity_boost - ramp_penalty)

            elif mutation.action == "remove":
                # Risk increase from removing capacity
                velocity_loss = random.gauss(
                    role_profile["velocity_boost"],
                    role_profile["velocity_boost"] * 0.2,
                )
                # Smaller teams may get a focus benefit (inverse Brooks)
                if team_size > 5:
                    focus_bonus = random.uniform(0, 0.05)
                else:
                    focus_bonus = 0

                net_increase = max(0, velocity_loss - focus_bonus)
                projected = max(0, min(1, baseline_risk_score + net_increase))
                risk_samples.append(projected)
                velocity_samples.append(-velocity_loss + focus_bonus)

            else:
                # Transfer = remove from source + add to target (simplified)
                velocity_boost = random.gauss(
                    role_profile["velocity_boost"] * 0.8,
                    role_profile["velocity_boost"] * 0.3,
                )
                ramp_penalty = (role_profile["ramp_up_days"] / max(days_to_deadline, 1)) * 0.08
                net_rr = max(0, velocity_boost - ramp_penalty)
                projected = max(0, min(1, baseline_risk_score - net_rr))
                risk_samples.append(projected)
                velocity_samples.append(velocity_boost - ramp_penalty)

        risk_samples.sort()
        mean_risk = sum(risk_samples) / N
        mean_velocity = sum(velocity_samples) / N

        # Cost calculation
        if mutation.action == "add":
            cost_delta = role_profile["cost_per_day"] * 30  # Monthly cost
        elif mutation.action == "remove":
            cost_delta = -role_profile["cost_per_day"] * 30
        else:
            cost_delta = role_profile["cost_per_day"] * 5  # Transition overhead

        risk_delta = mean_risk - baseline_risk_score
        confidence_in_result = self._calc_confidence(risk_samples, N)

        # Build reasoning text
        reasoning = self._build_reasoning(
            mutation, baseline_risk_score, mean_risk, risk_delta,
            cost_delta, mean_velocity, context, role_profile, feasible, warning,
        )

        return SimulationResult(
            mutation=mutation,
            baseline_risk=baseline_risk_score,
            projected_risk=mean_risk,
            risk_delta=risk_delta,
            cost_delta=cost_delta,
            velocity_change=mean_velocity,
            confidence=confidence_in_result,
            reasoning=reasoning,
            feasible=feasible,
            warning=warning,
        )

    def simulate_batch(
        self,
        mutations: List[TeamMutation],
        baseline_risk_score: Optional[float] = None,
    ) -> List[SimulationResult]:
        """Simulate multiple mutations and return ranked results."""
        results = [self.simulate_mutation(m, baseline_risk_score) for m in mutations]
        # Sort by risk delta (most beneficial first)
        results.sort(key=lambda r: r.risk_delta)
        return results

    # ── Helpers ───────────────────────────────────────────────────────────

    def _estimate_baseline_risk(self, context: Dict[str, Any]) -> float:
        """Quick risk estimate when no cached analysis exists."""
        risk = 0.3  # default moderate
        if context["is_blocked"]:
            risk += 0.25
        if context["days_to_deadline"] < 7:
            risk += 0.20
        if context["active_tickets"] > 5:
            risk += 0.10
        return min(risk, 1.0)

    def _calc_confidence(self, samples: List[float], n: int) -> float:
        """Confidence based on how tight the distribution is."""
        if n < 10:
            return 0.3
        mean = sum(samples) / n
        variance = sum((s - mean) ** 2 for s in samples) / n
        std = variance ** 0.5
        # Tighter distribution = higher confidence
        return min(0.95, max(0.4, 1.0 - std * 2))

    def _build_reasoning(
        self, mutation, baseline, projected, delta,
        cost, velocity, context, profile, feasible, warning,
    ) -> str:
        """Generate human-readable reasoning for the simulation."""
        direction = "↓" if delta < 0 else "↑"
        action_verb = {
            "add": "Adding",
            "remove": "Removing",
            "transfer": "Transferring",
        }.get(mutation.action, mutation.action.title())

        lines = [
            f"**{action_verb} {mutation.role}** to project `{mutation.project_id}`",
            "",
            f"| Metric | Value |",
            f"|---|---|",
            f"| Baseline Risk | {baseline:.0%} |",
            f"| Projected Risk | {projected:.0%} ({direction}{abs(delta):.0%}) |",
            f"| Monthly Cost Δ | ${cost:+,.0f} |",
            f"| Velocity Impact | {velocity:+.1%} |",
            f"| Team Size | {context['team_size']} → {context['team_size'] + (1 if mutation.action == 'add' else -1 if mutation.action == 'remove' else 0)} |",
            "",
        ]

        if not feasible and warning:
            lines.append(f"⚠️ **Not Feasible**: {warning}")
        elif warning:
            lines.append(f"⚠️ **Warning**: {warning}")

        if mutation.action == "add" and context["team_size"] > 5:
            lines.append("📉 *Brooks's Law*: Diminishing returns expected above 5 members.")

        if context["is_blocked"]:
            lines.append(f"🔒 Project has active blockers — {mutation.role} has "
                        f"{profile['blocked_resolution']:.0%} chance of resolving them.")

        return "\n".join(lines)


# Singleton
team_simulator = TeamCompositionSimulator()
