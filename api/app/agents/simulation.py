import numpy as np
import random
from typing import List, Dict, Any, Tuple
from .constraints import ConstraintAgent
from ..core.models import AnalysisResult, AgentOpinion, DecisionComparison
from ..core.constants import INTERVENTION_IMPACTS

# Monte Carlo distribution parameters per action
# Each gives (mean, std_dev) for risk_reduction and cost_penalty
MC_DISTRIBUTIONS = {
    "ADD_ENGINEER":          {"rr_mean": 0.30, "rr_std": 0.10, "cp_mean": 0.20, "cp_std": 0.05},
    "ESCALATE_DEPENDENCY":   {"rr_mean": 0.40, "rr_std": 0.12, "cp_mean": 0.10, "cp_std": 0.04},
    "REDUCE_SCOPE":          {"rr_mean": 0.50, "rr_std": 0.15, "cp_mean": 0.15, "cp_std": 0.05},
    "ACCEPT_DELAY":          {"rr_mean": 0.00, "rr_std": 0.02, "cp_mean": 0.00, "cp_std": 0.01},
}

N_SIMULATIONS = 1000  # Increased for NumPy performance

class SimulationAgent:
    """
    The 'What-If' Engine with Monte Carlo simulation.
    Runs N probabilistic trials per intervention to compute
    expected risk reduction, 95th-percentile bounds, and
    probability of positive net benefit.
    """
    def __init__(self):
        self.constraint_agent = ConstraintAgent()

    def _monte_carlo(self, action: str, context: Dict[str, Any]) -> Dict[str, float]:
        """
        Run N_SIMULATIONS trials for one action using Vectorized NumPy.
        Returns: mean_rr, p5_rr, p95_rr, mean_cp, prob_positive
        """
        dist = MC_DISTRIBUTIONS.get(action, {"rr_mean": 0, "rr_std": 0.05, "cp_mean": 0, "cp_std": 0.02})
        rr_mean = dist["rr_mean"]
        rr_std = dist["rr_std"]
        cp_mean = dist["cp_mean"]
        cp_std = dist["cp_std"]

        # ── Context-Aware Adjustments (The "Real Intelligence" Part) ──
        
        # Signal 1: Dependency Depth
        # If dependency chain is deep, adding engineers is LESS effective (Brooks' Law / coordination overhead)
        dep_depth = context.get("signals", {}).get("dependency_depth", 0)
        if dep_depth > 2 and action == "ADD_ENGINEER":
             rr_mean *= 0.7  # 30% penalty
             cp_mean *= 1.2  # 20% cost increase (onboarding)
             
        # Signal 2: Contention Score
        # If team is overloaded, reducing scope is MORE effective
        contention = context.get("signals", {}).get("contention_score", 0)
        if contention > 3 and action == "REDUCE_SCOPE":
            rr_mean *= 1.2   # 20% boost
            
        # Signal 3: Skill Match
        # If skills are missing, adding an engineer (presumably with skills) is highly effective
        skill_score = context.get("signals", {}).get("skill_match_score", 1.0)
        if skill_score < 0.8 and action == "ADD_ENGINEER":
            rr_mean *= 1.3   # 30% boost

        # Hard constraints from legacy context
        if action == "ESCALATE_DEPENDENCY" and context.get("is_blocked"):
            rr_mean = 0.55  # Higher mean when actually blocked
        
        if action == "ADD_ENGINEER" and context.get("days_to_deadline", 30) < 7:
            rr_mean *= 0.4  # Adding engineers late is barely effective
            cp_mean *= 1.8  # And very expensive

        # ── Vectorized Simulation ──
        # Generate N samples at once
        rr_samples = np.random.normal(loc=rr_mean, scale=rr_std, size=N_SIMULATIONS)
        cp_samples = np.random.normal(loc=cp_mean, scale=cp_std, size=N_SIMULATIONS)
        
        # Clip to [0, 1]
        rr_samples = np.clip(rr_samples, 0.0, 1.0)
        cp_samples = np.clip(cp_samples, 0.0, 1.0)
        
        net_samples = rr_samples - cp_samples

        # Calculate statistics
        return {
            "mean_rr": float(np.mean(rr_samples)),
            "p5_rr": float(np.percentile(rr_samples, 5)),
            "p95_rr": float(np.percentile(rr_samples, 95)),
            "mean_cp": float(np.mean(cp_samples)),
            "prob_positive": float(np.sum(net_samples > 0.05) / N_SIMULATIONS),
        }

    def simulate_interventions(self, risk_score: float, context: Dict[str, Any]) -> List[str]:
        """
        Returns a ranked list of recommended actions using Monte Carlo.
        """
        possible_actions = [
            "ADD_ENGINEER",
            "ESCALATE_DEPENDENCY",
            "REDUCE_SCOPE",
            "ACCEPT_DELAY"
        ]

        recommendations = []

        for action in possible_actions:
            constraint_result = self.constraint_agent.evaluate_intervention(action, context)
            if not constraint_result["feasible"]:
                continue

            mc = self._monte_carlo(action, context)
            net_benefit = mc["mean_rr"] - mc["mean_cp"] - constraint_result["penalty"]

            if net_benefit > 0.05 and mc["prob_positive"] > 0.5:
                msg = action.replace("_", " ").title()
                msg += f" (risk ↓{mc['mean_rr']:.0%}, {mc['prob_positive']:.0%} conf)"
                if constraint_result.get("reason") and constraint_result["penalty"] > 0:
                    msg += f" — Note: {constraint_result['reason']}"
                recommendations.append((net_benefit, msg))

        recommendations.sort(key=lambda x: x[0], reverse=True)
        return [r[1] for r in recommendations]

    def generate_decision_comparison(
        self, risk_score: float, context: Dict[str, Any]
    ) -> Tuple[List[DecisionComparison], AgentOpinion]:
        """
        Returns structured comparison with Monte Carlo stats + agent opinion.
        """
        possible_actions = [
            "ADD_ENGINEER",
            "ESCALATE_DEPENDENCY",
            "REDUCE_SCOPE",
            "ACCEPT_DELAY"
        ]

        comparisons = []
        evidence = []

        for action in possible_actions:
            constraint_result = self.constraint_agent.evaluate_intervention(action, context)
            mc = self._monte_carlo(action, context)

            total_penalty = mc["mean_cp"] + constraint_result["penalty"]
            net_benefit = mc["mean_rr"] - total_penalty

            if total_penalty < 0.15:
                cost = "Low"
            elif total_penalty < 0.3:
                cost = "Medium"
            else:
                cost = "High"

            recommended = (
                constraint_result["feasible"]
                and net_benefit > 0.05
                and mc["prob_positive"] > 0.5
            )

            if not constraint_result["feasible"]:
                reason = constraint_result["reason"]
            elif recommended:
                reason = (
                    f"Monte Carlo ({N_SIMULATIONS} runs): {mc['mean_rr']:.0%} avg reduction "
                    f"[{mc['p5_rr']:.0%}-{mc['p95_rr']:.0%}], "
                    f"{mc['prob_positive']:.0%} prob of success."
                )
            else:
                reason = (
                    f"Low expected benefit ({net_benefit:.2f}), "
                    f"only {mc['prob_positive']:.0%} chance of success"
                )

            comparisons.append(DecisionComparison(
                action=action.replace("_", " ").title(),
                risk_reduction=round(mc["mean_rr"], 3),
                cost=cost,
                feasible=constraint_result["feasible"],
                recommended=recommended,
                reason=reason,
            ))

            if recommended:
                evidence.append(
                    f"{action.replace('_', ' ').title()}: "
                    f"{mc['mean_rr']:.0%} ↓risk (P95: {mc['p95_rr']:.0%})"
                )

        comparisons.sort(key=lambda x: (x.recommended, x.risk_reduction), reverse=True)

        recommended_count = sum(1 for c in comparisons if c.recommended)

        if recommended_count == 0:
            claim = "No viable interventions found by simulation."
            confidence = 0.8
        elif recommended_count == 1:
            best = next(c for c in comparisons if c.recommended)
            claim = f"Simulation recommends: {best.action}."
            confidence = 0.85
        else:
            best = comparisons[0]
            claim = f"Simulation confirms {best.action} as optimal strategy."
            confidence = 0.88

        opinion = AgentOpinion(
            agent="SimulationAgent",
            claim=claim,
            confidence=confidence,
            evidence=evidence if evidence else ["Constraints block all options"],
        )

        return comparisons, opinion
