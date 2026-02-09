import requests
import json

API_BASE = "http://localhost:8000"

def test_hiring_analytics():
    print("🧪 Testing Hiring Analytics API...")
    
    try:
        resp = requests.get(f"{API_BASE}/api/hiring/analytics", timeout=10)
        resp.raise_for_status()
        data = resp.json()
        
        print(f"\n✅ API Status: {data.get('status', 'unknown')}")
        print(f"📊 Hiring Urgency Score: {data.get('hiring_urgency_score', 0)}%")
        
        # Velocity
        velocity = data.get('velocity', {})
        print(f"\n📈 Team Velocity:")
        print(f"   - Average: {velocity.get('average_velocity', 0)} tickets/member")
        print(f"   - Total Completed: {velocity.get('total_completed', 0)}")
        print(f"   - Bottlenecks: {len(velocity.get('bottlenecks', []))}")
        
        # Skill Gaps
        skill_gaps = data.get('skill_gaps', {})
        print(f"\n🧠 Skill Coverage:")
        print(f"   - Coverage Score: {skill_gaps.get('coverage_score', 0)}%")
        print(f"   - Critical Gaps: {len(skill_gaps.get('critical_gaps', []))}")
        for gap in skill_gaps.get('critical_gaps', [])[:3]:
            print(f"     • {gap['skill']}: {gap['supply']}/{gap['demand']} (gap: {gap['gap']})")
        
        # Cost
        cost = data.get('cost_efficiency', {})
        print(f"\n💰 Cost Efficiency:")
        print(f"   - Avg Cost/Point: ${cost.get('average_cost_per_point', 0)}")
        print(f"   - Efficiency Score: {cost.get('efficiency_score', 0)}%")
        
        # Top Recommendation
        top_rec = data.get('top_recommendation')
        if top_rec:
            print(f"\n🎯 Top Recommendation:")
            print(f"   - Role: {top_rec['role']}")
            print(f"   - Reason: {top_rec['reason']}")
            print(f"   - Impact: {top_rec['estimated_impact']}")
        
        print("\n✅ Hiring Analytics API working!")
        return True
        
    except requests.exceptions.RequestException as e:
        print(f"❌ API Error: {e}")
        return False

if __name__ == "__main__":
    test_hiring_analytics()
