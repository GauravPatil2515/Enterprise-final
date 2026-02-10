import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "api"))

from app.agents.simulation import SimulationAgent

def test_simulation_logic():
    print("🧪 Testing Real Monte Carlo Simulation Logic...")
    sim = SimulationAgent()
    
    # Baseline Context
    baseline_context = {
        "signals": {
            "dependency_depth": 1,
            "contention_score": 1,
            "skill_match_score": 1.0
        },
        "days_to_deadline": 30
    }
    
    # Adverse Context (High Dependency Depth)
    adverse_context = {
        "signals": {
            "dependency_depth": 5, # High depth -> penalized ADD_ENGINEER
            "contention_score": 1,
            "skill_match_score": 1.0
        },
        "days_to_deadline": 30
    }
    
    print("\n--- Running Baseline Simulation (ADD_ENGINEER) ---")
    baseline_mc = sim._monte_carlo("ADD_ENGINEER", baseline_context)
    print(f"Baseline Mean Risk Reduction: {baseline_mc['mean_rr']:.2%}")
    print(f"Baseline P95 Risk Reduction: {baseline_mc['p95_rr']:.2%}")
    
    print("\n--- Running Adverse Simulation (High Dependency Depth) ---")
    adverse_mc = sim._monte_carlo("ADD_ENGINEER", adverse_context)
    print(f"Adverse Mean Risk Reduction: {adverse_mc['mean_rr']:.2%}")
    print(f"Adverse P95 Risk Reduction: {adverse_mc['p95_rr']:.2%}")
    
    # Verification Rule: Adverse scenario should be WORSE (lower RR)
    if adverse_mc['mean_rr'] < baseline_mc['mean_rr']:
        print("\n✅ SUCCESS: Dependency depth correctly penalized the intervention.")
        return True
    else:
        print("\n❌ FAILURE: Signals did not affect the simulation outcome.")
        return False

if __name__ == "__main__":
    success = test_simulation_logic()
    sys.exit(0 if success else 1)
