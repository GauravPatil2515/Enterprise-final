from pydantic import BaseModel
from typing import List, Optional, Any, Dict
from enum import Enum

class AgentVote(str, Enum):
    PROPOSE = "PROPOSE"    # Valid for lead agent (Risk)
    AGREE = "AGREE"        # Valid for reviewers
    CHALLENGE = "CHALLENGE" # Soft block with alternative
    VETO = "VETO"          # Hard block
    ABSTAIN = "ABSTAIN"

class AgentSignal(BaseModel):
    source: str
    value: Any
    description: str

class DebateState(BaseModel):
    project_id: str
    project_name: str
    risk_score: float
    context: Dict[str, Any] # Graph signals & raw data
    current_proposal: Optional[str] = None

class AgentResponse(BaseModel):
    agent_name: str
    vote: AgentVote
    claim: str # One sentence summary
    reasoning: str # Detailed explanation
    confidence: float
    evidence: List[str]
    risk_reduction_projection: Optional[float] = None
    cost_projection: Optional[float] = None
    feasible: bool = True
    proposed_action: Optional[str] = None
