"""
HiringAnalytics — Real Neo4j-backed hiring intelligence.

Provides three core metrics:
1. Team Velocity — Ticket throughput per team member
2. Skill Gap Analysis — Required skills vs available team skills
3. Cost Efficiency — Cost-per-story-point calculation
"""
from typing import Dict, Any, List
from ..core.neo4j_client import neo4j_client
import logging

logger = logging.getLogger(__name__)


class HiringAnalyticsAgent:
    """
    Analyzes team composition and generates hiring recommendations
    based on real Neo4j graph data.
    """
    
    def get_team_velocity(self, team_id: str = None) -> Dict[str, Any]:
        """
        Calculate ticket completion velocity per team member.
        Returns: tickets_completed, avg_completion_time, velocity_score
        """
        query = """
        MATCH (m:Member)
        OPTIONAL MATCH (m)-[:ASSIGNED_TO]->(t:Ticket)
        WHERE t.status = 'Done'
        WITH m, count(t) as completed
        RETURN m.id as member_id, 
               m.name as member_name,
               m.role as role,
               completed,
               CASE WHEN completed > 5 THEN 'HIGH' 
                    WHEN completed > 2 THEN 'MEDIUM' 
                    ELSE 'LOW' END as velocity_tier
        ORDER BY completed DESC
        """
        records, _ = neo4j_client.execute_query(query, {})
        
        members = []
        total_completed = 0
        for rec in records:
            members.append({
                "id": rec["member_id"],
                "name": rec["member_name"],
                "role": rec["role"],
                "tickets_completed": rec["completed"],
                "velocity_tier": rec["velocity_tier"]
            })
            total_completed += rec["completed"]
        
        avg_velocity = total_completed / len(members) if members else 0
        
        # Identify bottlenecks (members with LOW velocity on critical path)
        bottlenecks = [m for m in members if m["velocity_tier"] == "LOW"]
        
        return {
            "total_completed": total_completed,
            "average_velocity": round(avg_velocity, 1),
            "member_count": len(members),
            "members": members[:10],  # Top 10
            "bottlenecks": bottlenecks[:5],
            "recommendation": self._velocity_recommendation(avg_velocity, bottlenecks)
        }
    
    def _velocity_recommendation(self, avg: float, bottlenecks: List) -> str:
        if avg < 2:
            return "Team velocity is low. Consider adding engineers or reducing scope."
        elif len(bottlenecks) > 2:
            return f"{len(bottlenecks)} team members are underperforming. Review workload distribution."
        else:
            return "Team velocity is healthy. No immediate hiring needed."
    
    def get_skill_gaps(self) -> Dict[str, Any]:
        """
        Analyze required skills from tickets vs available skills from team.
        Returns: missing_skills, coverage_score, hiring_recommendations
        """
        # Get required skills from open tickets
        required_query = """
        MATCH (t:Ticket)
        WHERE t.status <> 'Done'
        OPTIONAL MATCH (t)-[:REQUIRES_SKILL]->(s:Skill)
        WITH s.name as skill, count(t) as demand
        WHERE skill IS NOT NULL
        RETURN skill, demand
        ORDER BY demand DESC
        """
        required_records, _ = neo4j_client.execute_query(required_query, {})
        
        # Get available skills from team
        available_query = """
        MATCH (m:Member)-[:HAS_SKILL]->(s:Skill)
        WITH s.name as skill, count(m) as supply
        RETURN skill, supply
        """
        available_records, _ = neo4j_client.execute_query(available_query, {})
        
        required_skills = {rec["skill"]: rec["demand"] for rec in required_records}
        available_skills = {rec["skill"]: rec["supply"] for rec in available_records}
        
        # Calculate gaps
        gaps = []
        for skill, demand in required_skills.items():
            supply = available_skills.get(skill, 0)
            gap = demand - supply
            if gap > 0:
                gaps.append({
                    "skill": skill,
                    "demand": demand,
                    "supply": supply,
                    "gap": gap,
                    "severity": "HIGH" if gap > 3 else "MEDIUM" if gap > 1 else "LOW"
                })
        
        # Sort by severity
        gaps.sort(key=lambda x: x["gap"], reverse=True)
        
        # Calculate coverage
        total_required = sum(required_skills.values())
        total_covered = sum(min(required_skills.get(s, 0), c) for s, c in available_skills.items())
        coverage = (total_covered / total_required * 100) if total_required > 0 else 100
        
        return {
            "coverage_score": round(coverage, 1),
            "total_skills_required": len(required_skills),
            "total_skills_available": len(available_skills),
            "critical_gaps": gaps[:5],
            "all_gaps": gaps,
            "hiring_recommendations": self._skill_recommendations(gaps)
        }
    
    def _skill_recommendations(self, gaps: List) -> List[Dict]:
        recommendations = []
        for gap in gaps[:3]:  # Top 3 critical gaps
            recommendations.append({
                "role": f"{gap['skill']} Engineer",
                "reason": f"{gap['gap']} tickets require {gap['skill']} but only {gap['supply']} team members have this skill.",
                "priority": gap["severity"],
                "estimated_impact": f"Could reduce delivery risk by ~{min(gap['gap'] * 10, 40)}%"
            })
        return recommendations
    
    def get_cost_efficiency(self) -> Dict[str, Any]:
        """
        Calculate cost-per-story-point based on ticket completion.
        Uses synthetic cost data (avg salary / tickets completed).
        """
        query = """
        MATCH (m:Member)
        OPTIONAL MATCH (m)-[:ASSIGNED_TO]->(t:Ticket {status: 'Done'})
        WITH m, count(t) as completed
        RETURN m.id as member_id,
               m.name as member_name,
               m.role as role,
               completed,
               CASE m.role 
                   WHEN 'Senior Engineer' THEN 12000
                   WHEN 'Lead Engineer' THEN 15000
                   WHEN 'Junior Engineer' THEN 7000
                   ELSE 10000
               END as monthly_cost
        """
        records, _ = neo4j_client.execute_query(query, {})
        
        total_cost = 0
        total_points = 0
        members = []
        
        for rec in records:
            cost = rec["monthly_cost"]
            points = rec["completed"] * 3  # Assume 3 story points per ticket
            cpp = cost / points if points > 0 else float('inf')
            
            members.append({
                "id": rec["member_id"],
                "name": rec["member_name"],
                "role": rec["role"],
                "monthly_cost": cost,
                "story_points": points,
                "cost_per_point": round(cpp, 2) if cpp != float('inf') else None
            })
            
            total_cost += cost
            total_points += points
        
        avg_cpp = total_cost / total_points if total_points > 0 else 0
        
        # Efficiency score (lower CPP = better)
        efficiency_score = 100 - min(avg_cpp / 10, 100)  # Normalize
        
        return {
            "average_cost_per_point": round(avg_cpp, 2),
            "total_monthly_cost": total_cost,
            "total_story_points": total_points,
            "efficiency_score": round(efficiency_score, 1),
            "members": sorted(members, key=lambda x: x["cost_per_point"] or float('inf'))[:10],
            "recommendation": self._cost_recommendation(avg_cpp)
        }
    
    def _cost_recommendation(self, avg_cpp: float) -> str:
        if avg_cpp > 500:
            return "High cost per story point. Consider hiring junior engineers or improving velocity."
        elif avg_cpp > 300:
            return "Moderate cost efficiency. Focus on reducing blockers to improve throughput."
        else:
            return "Excellent cost efficiency. Team is performing well."
    
    def get_full_analysis(self) -> Dict[str, Any]:
        """
        Run all three analyses and return combined results.
        """
        velocity = self.get_team_velocity()
        skill_gaps = self.get_skill_gaps()
        cost = self.get_cost_efficiency()
        
        # Overall hiring score (0-100)
        hiring_urgency = 0
        if velocity["average_velocity"] < 3:
            hiring_urgency += 30
        if skill_gaps["coverage_score"] < 70:
            hiring_urgency += 40
        if cost["efficiency_score"] < 50:
            hiring_urgency += 30
        
        return {
            "status": "connected",
            "velocity": velocity,
            "skill_gaps": skill_gaps,
            "cost_efficiency": cost,
            "hiring_urgency_score": min(hiring_urgency, 100),
            "top_recommendation": skill_gaps["hiring_recommendations"][0] if skill_gaps["hiring_recommendations"] else None
        }


# Singleton
hiring_analytics = HiringAnalyticsAgent()
