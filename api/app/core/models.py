"""
Core Pydantic models for the Decision Intelligence Platform.
Clean schema: only what agents need to reason + what the API returns.
"""
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class AgentOpinion(BaseModel):
    """Structured opinion from a single agent."""
    agent: str          # "RiskAgent", "ConstraintAgent", "SimulationAgent"
    claim: str          # What the agent believes
    confidence: float   # 0.0 to 1.0
    evidence: List[str] # Supporting data points


class DecisionComparison(BaseModel):
    """Comparative analysis of a possible intervention."""
    action: str
    risk_reduction: float   # 0.0 to 1.0
    cost: str               # "Low", "Medium", "High"
    feasible: bool
    recommended: bool
    reason: str             # Why recommended or rejected


class AnalysisResult(BaseModel):
    """Final output from the agentic analysis pipeline."""
    project_id: str
    project_name: str = ""
    risk_score: float               # 0.0 to 1.0
    risk_level: str                 # LOW, MEDIUM, HIGH
    primary_reason: str             # LLM-generated explanation
    supporting_signals: List[str]   # Evidence from graph
    recommended_actions: List[str]  # Legacy action list
    agent_opinions: List[AgentOpinion] = Field(default_factory=list)
    decision_comparison: List[DecisionComparison] = Field(default_factory=list)
    debate_log: List[dict] = Field(default_factory=list) # Phase 2: Structured debate turns


# ── Role-Based Access Models ──

class UserRole(BaseModel):
    """A user with a role in the system."""
    id: str
    name: str
    email: str
    role: str           # "engineer", "hr", "chairperson", "finance"
    avatar: str = ""
    team_id: Optional[str] = None


class RoleDashboard(BaseModel):
    """What a role can see and do."""
    role: str
    label: str
    permissions: List[str]
    dashboard_sections: List[str]


class RiskSnapshot(BaseModel):
    """Point-in-time risk snapshot for trend tracking."""
    project_id: str
    project_name: str = ""
    risk_score: float
    risk_level: str
    blocked_count: int = 0
    overdue_count: int = 0
    total_tickets: int = 0
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
