from typing import Dict, Any, List
from .debate_schema import AgentResponse, AgentVote, DebateState

class FinanceAgent:
    """
    Evaluates proposals based on budget, ROI, and resource costs.
    """
    
    COST_PER_DEV_DAY = 800 # Estimated daily loaded cost
    
    def evaluate(self, state: DebateState, risk_proposal: AgentResponse) -> AgentResponse:
        project_context = state.context
        team_size = len(project_context.get("team_members", []))
        
        # Calculate burn rate
        daily_burn = team_size * self.COST_PER_DEV_DAY
        
        # Default response
        vote = AgentVote.AGREE
        claim = "Budget allows for standard remediation."
        confidence = 0.9
        reasons = []
        cost_impact = 0.0
        
        proposal = risk_proposal.proposed_action or ""
        
        # Heuristic Logic for Debate
        if "Add Senior Engineer" in proposal:
            cost_impact = 1200 * 30 # 30 days of senior eng
            if cost_impact > daily_burn * 10: # If cost > 10 days of team burn
                vote = AgentVote.CHALLENGE
                claim = f"Proposed addition is too expensive (${cost_impact/1000:.1f}k)."
                reasons.append(f"Cost of Senior Engineer exceeds budget threshold.")
                confidence = 0.85
            else:
                claim = f"Investment of ${cost_impact/1000:.1f}k is justified for risk reduction."
                
        elif "Reduce Scope" in proposal:
            cost_impact = 0.0
            claim = "Scope reduction is cost-neutral and effectively reduces burn risk."
            vote = AgentVote.AGREE
            
        elif "Escalate" in proposal:
            vote = AgentVote.AGREE
            claim = "Escalation incurs no direct financial cost but uses management capital."
            
        # Construct response
        return AgentResponse(
            agent_name="FinanceAgent",
            vote=vote,
            claim=claim,
            reasoning=" ".join(reasons) or "Cost-benefit analysis matches organization parameters.",
            confidence=confidence,
            evidence=[f"Daily Team Burn: ${daily_burn}", f"Projected Impact: ${cost_impact}"],
            cost_projection=cost_impact,
            proposed_action=proposal
        )
