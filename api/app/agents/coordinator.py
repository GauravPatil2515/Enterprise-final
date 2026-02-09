from typing import Dict, Any, List
from .debate_schema import DebateState, AgentResponse, AgentVote
from .risk import DeliveryRiskAgent
from .finance import FinanceAgent
from .constraints import ConstraintAgent
from ..core.graph_signals import signal_extractor

class DebateCoordinator:
    def __init__(self):
        self.risk_agent = DeliveryRiskAgent()
        self.finance_agent = FinanceAgent()
        # self.constraint_agent = ConstraintAgent() # Need to refactor constraint agent too

    def run_debate(self, project_id: str) -> Dict[str, Any]:
        # 1. Gather Context (Right now using risk agent's data fetcher, eventually move to shared)
        # For now, we rely on RiskAgent to fetch the base data + using signal_extractor
        
        # Get graph signals
        signals = signal_extractor.get_signals(project_id)
        
        # 2. Risk Agent (Proposer)
        # We need to adapt RiskAgent to return AgentResponse. 
        # For now, we will wrap the legacy analyze result.
        risk_analysis = self.risk_agent.analyze(project_id, signals=signals)
        
        # Convert legacy analysis to Debate State
        state = DebateState(
            project_id=project_id,
            project_name=risk_analysis.project_name,
            risk_score=risk_analysis.risk_score,
            context={
                "signals": signals, 
                "legacy_analysis": risk_analysis.dict()
            }
        )
        
        # Create Risk Proposal (Adapter Pattern until RiskAgent is fully refactored)
        risk_vote = AgentVote.PROPOSE if risk_analysis.risk_score > 0.4 else AgentVote.AGREE
        risk_proposal = AgentResponse(
            agent_name="RiskAgent",
            vote=risk_vote,
            claim=risk_analysis.primary_reason,
            reasoning=f"Risk Score: {risk_analysis.risk_score:.2f}. " + " ".join(risk_analysis.supporting_signals[:2]),
            confidence=0.85, # dynamic?
            evidence=risk_analysis.supporting_signals,
            proposed_action=risk_analysis.recommended_actions[0] if risk_analysis.recommended_actions else "Monitor"
        )
        
        debate_log = [risk_proposal]
        
        # 3. Finance Agent (Reviewer)
        finance_response = self.finance_agent.evaluate(state, risk_proposal)
        debate_log.append(finance_response)
        
        # 4. Arbiter (Simple Logic for now)
        final_consensus = self._arbitrate(debate_log)
        
        return {
            "project_id": project_id,
            "project_name": risk_analysis.project_name,
            "risk_score": risk_analysis.risk_score,
            "risk_level": risk_analysis.risk_level,
            "primary_reason": risk_analysis.primary_reason, # Keep original LLM reason or use consensus
            "debate_log": [resp.dict() for resp in debate_log],
            "consensus": final_consensus,
            "signals": signals,
            "supporting_signals": risk_analysis.supporting_signals,
            "recommended_actions": risk_analysis.recommended_actions,
            "decision_comparison": [d.dict() for d in risk_analysis.decision_comparison]
        }

    def _arbitrate(self, log: List[AgentResponse]) -> str:
        # Simple majority or veto logic
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Arbitrating log with {len(log)} entries")
        if log:
            logger.info(f"First entry type: {type(log[0])}")
            logger.info(f"First entry dict: {log[0].dict()}")

        vetoes = [r for r in log if r.vote == AgentVote.VETO]
        if vetoes:
            return f"Action Blocked by {vetoes[0].agent_name}: {vetoes[0].claim}"
        
        challenges = [r for r in log if r.vote == AgentVote.CHALLENGE]
        if challenges:
            return f"Action Challenged: {challenges[0].claim} - Requires Review"
            
        proposer = log[0]
        logger.info(f"Proposer proposed_action: {getattr(proposer, 'proposed_action', 'MISSING')}")
        if proposer.vote == AgentVote.PROPOSE:
            if isinstance(proposer, dict):
                action = proposer.get('proposed_action')
            else:
                action = getattr(proposer, 'proposed_action', None)
            return f"Approved: {action}"
            
        return "Status Quo Maintained (No Action Needed)"

coordinator = DebateCoordinator()
