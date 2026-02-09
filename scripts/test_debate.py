import requests
import json
import sys

BASE_URL = "http://127.0.0.1:8000/api"

def get_first_project():
    try:
        response = requests.get(f"{BASE_URL}/teams")
        response.raise_for_status()
        teams = response.json()
        for team in teams:
            if team.get("projects"):
                return team["projects"][0]["id"]
    except Exception as e:
        print(f"Error fetching teams: {e}")
        return None
    return None

def test_debate(project_id):
    print(f"Testing debate pipeline for project: {project_id}")
    url = f"{BASE_URL}/debate/{project_id}"
    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        print(json.dumps(data, indent=2))
        return True
    except Exception as e:
        print(f"Error fetching debate: {e}")
        print(f"Response: {response.text}")
        return False

if __name__ == "__main__":
    project_id = get_first_project()
    if not project_id:
        print("No projects found to test.")
        sys.exit(1)
    
    success = test_debate(project_id)
    if success:
        print("✅ Debate endpoint working!")
    else:
        print("❌ Debate endpoint failed!")
        sys.exit(1)
