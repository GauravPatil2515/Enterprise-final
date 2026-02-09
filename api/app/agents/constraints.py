from typing import Dict, Any, List
from ..core.models import AgentOpinion
from ..core.constants import (
    RAMP_UP_PENALTY_DAYS, 
    URGENT_DEADLINE_THRESHOLD_DAYS,
    INTERVENTION_IMPACTS
)

class ConstraintAgent:
    """
    The 'Realist' agent. 
    Checks if proposed interventions are feasible given organizational constraints.
    """
    
    def evaluate_intervention(self, action_type: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Returns { "feasible": bool, "penalty": float, "reason": str }
        """
        
        if action_type == "ADD_ENGINEER":
            # Constraint 1: Ramp-up Cost
            # If deadline is < threshold days, adding a person hurts more than helps.
            days_to_deadline = context.get("days_to_deadline", 7)
            if days_to_deadline < RAMP_UP_PENALTY_DAYS:
                return {
                    "feasible": False,
                    "penalty": 0.8,
                    "reason": f"Ramp-up time (avg {RAMP_UP_PENALTY_DAYS} days) exceeds deadline window."
                }
            return {"feasible": True, "penalty": 0.2, "reason": "Standard onboarding cost applies."}

        if action_type == "ESCALATE_DEPENDENCY":
            # Constraint 2: Relationship Capital
            # Always feasible but costs 'goodwill'.
            return {
                "feasible": True,
                "penalty": 0.1,
                "reason": "Uses social capital but clears blockage."
            }

        return {"feasible": True, "penalty": 0.0, "reason": "No constraints detected."}
    
    def evaluate_all_constraints(self, context: Dict[str, Any]) -> AgentOpinion:
        """
        Returns consolidated constraint analysis as an agent opinion.
        """
        evidence = []
        constraints_found = []
        
        days_to_deadline = context.get("days_to_deadline", 14)
        is_blocked = context.get("is_blocked", False)
        team_capacity = context.get("team_capacity_percent", 100)
        
        # Check various constraints
        if days_to_deadline < URGENT_DEADLINE_THRESHOLD_DAYS:
            constraints_found.append(f"URGENT: Only {days_to_deadline} days to deadline")
            evidence.append(f"Deadline pressure: {days_to_deadline}d remaining")
        
        if days_to_deadline < RAMP_UP_PENALTY_DAYS:
            constraints_found.append("Adding engineers is unsafe due to ramp-up time")
            evidence.append(f"Ramp-up ({RAMP_UP_PENALTY_DAYS}d) > deadline ({days_to_deadline}d)")
        
        if team_capacity > 100:
            constraints_found.append("Team already over-capacity")
            evidence.append(f"Team load at {team_capacity}%")
        
        if is_blocked:
            constraints_found.append("External dependency blocks progress")
            evidence.append(f"Blocked by: {context.get('blocker', 'Unknown')}")
        
        # Determine confidence and claim
        confidence = min(0.9, 0.5 + (len(constraints_found) * 0.15))
        
        if len(constraints_found) >= 2:
            claim = "Multiple organizational constraints limit available options"
        elif len(constraints_found) == 1:
            claim = constraints_found[0]
        else:
            claim = "No significant constraints detected"
            confidence = 0.3
        
        return AgentOpinion(
            agent="ConstraintAgent",
            claim=claim,
            confidence=confidence,
            evidence=evidence if evidence else ["No constraints detected"]
        )
