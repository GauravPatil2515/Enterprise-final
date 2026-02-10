# AI Agents

This directory contains the logic for the specialized AI agents in the Multi-Agent System.

## Agents List

| Agent | File | Purpose |
|---|---|---|
| **DeliveryRiskAgent** | `risk.py` | Analyzes graph strategy to find blockers, overdue tickets, and timeline risks. Deterministic. |
| **FinanceAgent** | `finance.py` | Evaluates cost implications of proposed interventions (e.g. hiring vs scope reduction). |
| **ConstraintAgent** | `constraints.py` | Checks organizational constraints (e.g. "Can we actually hire in 2 days?"). |
| **SimulationAgent** | `simulation.py` | Runs Monte Carlo simulations to predict *probability* of success for interventions. |
| **TeamSimulator** | `team_simulator.py` | Extends simulation to team composition changes ("What if we add a Senior Dev?"). |
| **HiringAnalytics** | `hiring.py` | Analyzes skill gaps and team velocity using Neo4j data. |
| **DebateCoordinator** | `coordinator.py` | Orchestrates the "debate" between Risk (Proposer) and Finance (Reviewer). |

## Architecture Note

All agents are designed to be **stateless** (fetching data from Neo4j per request) or use **lazy singletons**. This ensures compatibility with Serverless environments.
