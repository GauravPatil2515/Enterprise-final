"""
Seed Script for Knowledge Graph Expansion
Adds synthetic data: Skills, Tickets, Dependencies, Communication Links
"""
import random
from neo4j import GraphDatabase
import os
from dotenv import load_dotenv

load_dotenv()

# Neo4j connection
NEO4J_URI = os.getenv("NEO4J_URI", "")
NEO4J_USER = os.getenv("NEO4J_USERNAME", "neo4j")
NEO4J_PASS = os.getenv("NEO4J_PASSWORD", "")

driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASS))

# ============== DATA ==============

SKILLS = [
    ("React", "Frontend"), ("Vue.js", "Frontend"), ("Angular", "Frontend"),
    ("TypeScript", "Frontend"), ("CSS/Tailwind", "Frontend"),
    ("Python", "Backend"), ("Node.js", "Backend"), ("Go", "Backend"),
    ("Java", "Backend"), ("Rust", "Backend"),
    ("PostgreSQL", "Database"), ("MongoDB", "Database"), ("Neo4j", "Database"),
    ("Redis", "Database"),
    ("AWS", "Cloud"), ("Azure", "Cloud"), ("GCP", "Cloud"), ("Docker", "DevOps"),
    ("Kubernetes", "DevOps"), ("Terraform", "DevOps"), ("CI/CD", "DevOps"),
    ("Figma", "Design"), ("UI/UX", "Design"),
    ("Machine Learning", "AI"), ("Data Analysis", "AI"),
    ("Agile", "Management"), ("Scrum", "Management"), ("Leadership", "Management")
]

TICKET_TEMPLATES = [
    ("Fix login timeout issue", "Bug", "High"),
    ("Implement dark mode", "Feature", "Medium"),
    ("Optimize API response time", "Task", "High"),
    ("Add user analytics dashboard", "Feature", "Medium"),
    ("Fix memory leak in graph render", "Bug", "Critical"),
    ("Update dependencies", "Task", "Low"),
    ("Implement SSO integration", "Feature", "High"),
    ("Fix mobile responsive layout", "Bug", "Medium"),
    ("Add export to PDF", "Feature", "Low"),
    ("Performance audit", "Task", "Medium"),
    ("Implement caching layer", "Feature", "High"),
    ("Fix date formatting bug", "Bug", "Low"),
    ("Add notification system", "Feature", "Medium"),
    ("Database migration script", "Task", "High"),
    ("Implement rate limiting", "Feature", "Medium"),
]

TICKET_STATUSES = ["Open", "In Progress", "Review", "Done"]

# ============== SEEDING FUNCTIONS ==============

def clear_seeded_data(tx):
    """Remove previously seeded data (idempotent)"""
    tx.run("MATCH (s:Skill) DETACH DELETE s")
    tx.run("MATCH (t:Ticket) DETACH DELETE t")
    tx.run("MATCH ()-[r:COMMUNICATES_WITH]-() DELETE r")
    tx.run("MATCH ()-[r:DEPENDS_ON]-() DELETE r")
    print("✓ Cleared previous seeded data")

def seed_skills(tx):
    """Create Skill nodes"""
    for name, category in SKILLS:
        tx.run("""
            MERGE (s:Skill {name: $name})
            SET s.category = $category
        """, name=name, category=category)
    print(f"✓ Created {len(SKILLS)} Skill nodes")

def assign_skills_to_members(tx):
    """Connect members to random skills"""
    result = tx.run("MATCH (m:Member) RETURN m.id as id, m.name as name")
    members = list(result)
    
    count = 0
    for member in members:
        # Each member gets 2-5 random skills
        num_skills = random.randint(2, 5)
        selected_skills = random.sample(SKILLS, num_skills)
        
        for skill_name, _ in selected_skills:
            tx.run("""
                MATCH (m:Member {id: $member_id})
                MATCH (s:Skill {name: $skill_name})
                MERGE (m)-[:HAS_SKILL]->(s)
            """, member_id=member["id"], skill_name=skill_name)
            count += 1
    
    print(f"✓ Created {count} HAS_SKILL relationships")

def seed_tickets(tx):
    """Create Ticket nodes and connect to projects/members"""
    # Get all projects and members
    projects = list(tx.run("MATCH (p:Project) RETURN p.id as id, p.name as name"))
    members = list(tx.run("MATCH (m:Member) RETURN m.id as id, m.name as name"))
    
    if not projects or not members:
        print("⚠ No projects or members found, skipping tickets")
        return
    
    ticket_count = 0
    for project in projects:
        # Each project gets 3-6 tickets
        num_tickets = random.randint(3, 6)
        
        for i in range(num_tickets):
            template = random.choice(TICKET_TEMPLATES)
            title, ticket_type, priority = template
            status = random.choice(TICKET_STATUSES)
            ticket_id = f"TKT-{project['id'][-4:]}-{i+1:03d}"
            
            # Create ticket
            tx.run("""
                MERGE (t:Ticket {id: $id})
                SET t.title = $title,
                    t.type = $type,
                    t.priority = $priority,
                    t.status = $status,
                    t.project_id = $project_id
            """, id=ticket_id, title=f"{title} ({project['name'][:10]})", 
                type=ticket_type, priority=priority, status=status, project_id=project["id"])
            
            # Connect to project
            tx.run("""
                MATCH (p:Project {id: $project_id})
                MATCH (t:Ticket {id: $ticket_id})
                MERGE (p)-[:HAS_TICKET]->(t)
            """, project_id=project["id"], ticket_id=ticket_id)
            
            # Assign to random member
            assignee = random.choice(members)
            tx.run("""
                MATCH (m:Member {id: $member_id})
                MATCH (t:Ticket {id: $ticket_id})
                MERGE (m)-[:ASSIGNED_TO]->(t)
            """, member_id=assignee["id"], ticket_id=ticket_id)
            
            ticket_count += 1
    
    print(f"✓ Created {ticket_count} Ticket nodes with assignments")

def seed_project_dependencies(tx):
    """Create DEPENDS_ON relationships between projects"""
    projects = list(tx.run("MATCH (p:Project) RETURN p.id as id, p.name as name"))
    
    if len(projects) < 2:
        print("⚠ Not enough projects for dependencies")
        return
    
    count = 0
    # Create some logical dependencies
    for i in range(min(8, len(projects) - 1)):
        p1 = projects[i]
        p2 = random.choice([p for p in projects if p["id"] != p1["id"]])
        
        tx.run("""
            MATCH (p1:Project {id: $p1_id})
            MATCH (p2:Project {id: $p2_id})
            MERGE (p1)-[:DEPENDS_ON]->(p2)
        """, p1_id=p1["id"], p2_id=p2["id"])
        count += 1
    
    print(f"✓ Created {count} DEPENDS_ON relationships")

def seed_communication_links(tx):
    """Create COMMUNICATES_WITH relationships between members"""
    members = list(tx.run("MATCH (m:Member) RETURN m.id as id, m.name as name"))
    
    if len(members) < 2:
        print("⚠ Not enough members for communication")
        return
    
    count = 0
    frequencies = ["daily", "weekly", "monthly"]
    
    # Create communication links (each member talks to 2-4 others)
    for member in members:
        num_connections = random.randint(2, min(4, len(members) - 1))
        contacts = random.sample([m for m in members if m["id"] != member["id"]], num_connections)
        
        for contact in contacts:
            # Only create if not already exists (to avoid duplicates)
            existing = tx.run("""
                MATCH (m1:Member {id: $m1_id})-[r:COMMUNICATES_WITH]-(m2:Member {id: $m2_id})
                RETURN count(r) as cnt
            """, m1_id=member["id"], m2_id=contact["id"]).single()["cnt"]
            
            if existing == 0:
                tx.run("""
                    MATCH (m1:Member {id: $m1_id})
                    MATCH (m2:Member {id: $m2_id})
                    CREATE (m1)-[:COMMUNICATES_WITH {frequency: $freq}]->(m2)
                """, m1_id=member["id"], m2_id=contact["id"], freq=random.choice(frequencies))
                count += 1
    
    print(f"✓ Created {count} COMMUNICATES_WITH relationships")

def add_risk_levels_to_projects(tx):
    """Add risk_level property to projects"""
    risk_levels = ["low", "medium", "high", "critical"]
    weights = [0.4, 0.35, 0.2, 0.05]  # More low/medium, fewer high/critical
    
    projects = list(tx.run("MATCH (p:Project) RETURN p.id as id"))
    
    for project in projects:
        risk = random.choices(risk_levels, weights=weights)[0]
        tx.run("""
            MATCH (p:Project {id: $id})
            SET p.risk_level = $risk
        """, id=project["id"], risk=risk)
    
    print(f"✓ Added risk levels to {len(projects)} projects")

def print_stats(tx):
    """Print graph statistics"""
    print("\n" + "="*50)
    print("GRAPH STATISTICS")
    print("="*50)
    
    stats = [
        ("Teams", "MATCH (n:Team) RETURN count(n) as c"),
        ("Members", "MATCH (n:Member) RETURN count(n) as c"),
        ("Projects", "MATCH (n:Project) RETURN count(n) as c"),
        ("Skills", "MATCH (n:Skill) RETURN count(n) as c"),
        ("Tickets", "MATCH (n:Ticket) RETURN count(n) as c"),
        ("HAS_SKILL", "MATCH ()-[r:HAS_SKILL]->() RETURN count(r) as c"),
        ("HAS_TICKET", "MATCH ()-[r:HAS_TICKET]->() RETURN count(r) as c"),
        ("ASSIGNED_TO", "MATCH ()-[r:ASSIGNED_TO]->() RETURN count(r) as c"),
        ("DEPENDS_ON", "MATCH ()-[r:DEPENDS_ON]->() RETURN count(r) as c"),
        ("COMMUNICATES_WITH", "MATCH ()-[r:COMMUNICATES_WITH]->() RETURN count(r) as c"),
    ]
    
    total_nodes = 0
    total_edges = 0
    
    for name, query in stats:
        count = tx.run(query).single()["c"]
        print(f"  {name}: {count}")
        if name in ["Teams", "Members", "Projects", "Skills", "Tickets"]:
            total_nodes += count
        else:
            total_edges += count
    
    print("-"*50)
    print(f"  TOTAL NODES: {total_nodes}")
    print(f"  TOTAL EDGES: {total_edges}")
    print("="*50)

# ============== MAIN ==============

def main():
    print("\n🚀 Starting Knowledge Graph Expansion Seed\n")
    
    with driver.session() as session:
        # Clear and seed
        session.execute_write(clear_seeded_data)
        session.execute_write(seed_skills)
        session.execute_write(assign_skills_to_members)
        session.execute_write(seed_tickets)
        session.execute_write(seed_project_dependencies)
        session.execute_write(seed_communication_links)
        session.execute_write(add_risk_levels_to_projects)
        
        # Print final stats
        session.execute_read(print_stats)
    
    driver.close()
    print("\n✅ Seeding complete!\n")

if __name__ == "__main__":
    main()
