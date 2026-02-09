"""
Business Assumptions & Configuration Constants
These are organizational assumptions, not AI guesses.
Modify these based on your enterprise context.
"""

# ============================================================================
# RISK SCORING WEIGHTS  (Only what the graph can prove)
# ============================================================================

RISK_WEIGHTS = {
    "blocked_dependency": 0.4,   # A ticket is blocked by another ticket
    "deadline_proximity": 0.3,   # Ticket due within 7 days and not done
    "overdue_ticket": 0.3,       # Ticket past its due date
}

# ============================================================================
# ORGANIZATIONAL CONSTRAINTS
# ============================================================================

RAMP_UP_PENALTY_DAYS = 10          # Days for new engineer to be productive
URGENT_DEADLINE_THRESHOLD_DAYS = 7 # Below this, adding people hurts
BLOCKER_CRITICAL_DAYS = 3          # Blocked > 3 days = critical

# ============================================================================
# INTERVENTION COSTS & IMPACTS
# ============================================================================

INTERVENTION_IMPACTS = {
    "ADD_ENGINEER": {
        "risk_reduction": 0.3,
        "cost_penalty": 0.2,
        "ramp_up_required": True,
    },
    "ESCALATE_DEPENDENCY": {
        "risk_reduction": 0.4,
        "cost_penalty": 0.1,
        "ramp_up_required": False,
    },
    "REDUCE_SCOPE": {
        "risk_reduction": 0.5,
        "cost_penalty": 0.15,
        "ramp_up_required": False,
    },
    "ACCEPT_DELAY": {
        "risk_reduction": 0.0,
        "cost_penalty": 0.0,
        "ramp_up_required": False,
    },
}

# ============================================================================
# RISK LEVEL THRESHOLDS
# ============================================================================

RISK_THRESHOLDS = {
    "LOW": 0.3,
    "MEDIUM": 0.7,
    "HIGH": 1.0,
}

def get_risk_level(score: float) -> str:
    """Convert numeric risk score to categorical level."""
    if score <= RISK_THRESHOLDS["LOW"]:
        return "LOW"
    elif score <= RISK_THRESHOLDS["MEDIUM"]:
        return "MEDIUM"
    else:
        return "HIGH"


# ============================================================================
# ROLE DEFINITIONS  (What each role can see / do)
# ============================================================================

ROLE_DEFINITIONS = {
    "engineer": {
        "label": "Engineer",
        "permissions": ["view_own_tickets", "update_tickets", "view_project", "view_team"],
        "dashboard_sections": ["kanban", "my_tickets", "project_progress"],
    },
    "hr": {
        "label": "HR Manager",
        "permissions": ["view_all_members", "view_workload", "view_team", "view_burnout"],
        "dashboard_sections": ["team_overview", "workload_distribution", "member_list"],
    },
    "chairperson": {
        "label": "Chairperson",
        "permissions": ["view_all", "view_risk", "approve_decisions", "view_all_teams"],
        "dashboard_sections": ["risk_dashboard", "decision_matrix", "all_projects", "agent_opinions"],
    },
    "finance": {
        "label": "Finance Manager",
        "permissions": ["view_costs", "view_resource_allocation", "view_budget_impact"],
        "dashboard_sections": ["cost_overview", "intervention_costs", "resource_utilization"],
    },
}
