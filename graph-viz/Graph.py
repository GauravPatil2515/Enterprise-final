from neo4j import GraphDatabase
import random
import sys
import traceback

# Neo4j connection details
URI = "neo4j+s://a5564146.databases.neo4j.io"
AUTH = ("neo4j", "YMPv51IuGyP3goE4cBPitOwnqNOA0xfiUch0ncBgAjc")

# Data Definitions
DEPARTMENTS = ["Engineering", "Marketing", "Sales", "HR", "Finance", "Product", "Design"]

SKILLS_BY_DEPT = {
    "Engineering": ["Python", "JavaScript", "React", "Node.js", "C++", "Java", "AWS", "SQL", "Docker", "Machine Learning"],
    "Marketing": ["SEO", "Content Strategy", "Social Media", "Google Analytics", "Copywriting", "Branding", "Email Marketing"],
    "Sales": ["Negotiation", "CRM", "Lead Generation", "Cold Calling", "B2B Sales", "Presentation"],
    "HR": ["Recruitment", "Employee Relations", "Payroll", "Training", "Conflict Resolution", "Labor Law"],
    "Finance": ["Accounting", "Financial Modeling", "Budgeting", "Tax Compliance", "Excel", "Auditing"],
    "Product": ["Roadmapping", "Agile", "User Stories", "Market Research", "Stakeholder Management", "JIRA"],
    "Design": ["UI Design", "UX Research", "Figma", "Adobe Creative Suite", "Prototyping", "Wireframing"]
}

PROJECTS = [
    {"name": "AI Analytics Platform", "type": "Product Dev", "status": "Active"},
    {"name": "Website Rebranding", "type": "Marketing", "status": "In Progress"},
    {"name": "Q3 Sales Drive", "type": "Sales", "status": "Active"},
    {"name": "Internal HR Portal", "type": "Internal Tool", "status": "Review"},
    {"name": "Legacy System Migration", "type": "Infrastructure", "status": "Active"},
    {"name": "Mobile App Launch", "type": "Product Dev", "status": "Planning"}
]

ROLES = {
    "Engineering": ["Junior Engineer", "Senior Engineer", "Tech Lead", "DevOps Engineer", "Data Scientist"],
    "Marketing": ["Marketing Associate", "Marketing Manager", "SEO Specialist", "Content Writer"],
    "Sales": ["Sales Representative", "Account Executive", "Sales Manager"],
    "HR": ["HR Coordinator", "Recruiter", "HR Manager"],
    "Finance": ["Accountant", "Financial Analyst", "Finance Manager"],
    "Product": ["Product Owner", "Product Manager", "Senior PM"],
    "Design": ["UI Designer", "UX Designer", "Design Lead"]
}

FIRST_NAMES = ["James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda", "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen", "Christopher", "Nancy", "Daniel", "Lisa", "Matthew", "Margaret", "Anthony", "Betty", "Donald", "Sandra", "Mark", "Ashley", "Paul", "Dorothy", "Steven", "Kimberly", "Andrew", "Emily", "Kenneth", "Donna", "Joshua", "Michelle", "Kevin", "Carol", "Brian", "Amanda", "George", "Melissa", "Edward", "Deborah", "Ronald", "Stephanie"]
LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores", "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell", "Carter", "Roberts"]


def clear_db(tx):
    tx.run("MATCH (n) DETACH DELETE n")

def create_schema_indexes(tx):
    try:
        tx.run("CREATE INDEX employee_name IF NOT EXISTS FOR (e:Employee) ON (e.name)")
        tx.run("CREATE INDEX skill_name IF NOT EXISTS FOR (s:Skill) ON (s.name)")
        tx.run("CREATE INDEX dept_name IF NOT EXISTS FOR (d:Department) ON (d.name)")
        tx.run("CREATE INDEX proj_name IF NOT EXISTS FOR (p:Project) ON (p.name)")
    except Exception as e:
        print(f"Index creation warning: {e}")

def populate_graph(tx):
    # 1. Create Departments
    print("Creating Departments...")
    for dept in DEPARTMENTS:
        tx.run("MERGE (d:Department {name: $name})", name=dept)

    # 2. Create Skills
    print("Creating Skills...")
    for dept, skills in SKILLS_BY_DEPT.items():
        for skill in skills:
            tx.run("""
                MERGE (s:Skill {name: $name})
                SET s.category = $category
            """, name=skill, category=dept)

    # 3. Create Projects
    print("Creating Projects...")
    project_nodes = []
    for proj in PROJECTS:
        result = tx.run("""
            CREATE (p:Project {name: $name, type: $type, status: $status})
            RETURN id(p) as id, p.name as name
        """, name=proj['name'], type=proj['type'], status=proj['status'])
        record = result.single()
        project_nodes.append({"id": record["id"], "name": record["name"]})

    # 4. Create Employees
    print("Creating Employees...")
    employees = []
    
    num_employees = 80  # Increased density
    
    for _ in range(num_employees):
        dept = random.choice(DEPARTMENTS)
        first = random.choice(FIRST_NAMES)
        last = random.choice(LAST_NAMES)
        name = f"{first} {last}"
        role = random.choice(ROLES[dept])
        performance = round(random.uniform(3.0, 5.0), 1)
        
        # Create Employee Node
        result = tx.run("""
            CREATE (e:Employee {name: $name, role: $role, performance: $perf})
            RETURN id(e) as id
        """, name=name, role=role, perf=performance)
        emp_id = result.single()["id"]
        
        employees.append({"id": emp_id, "dept": dept, "name": name})

        # Link to Department
        tx.run("""
            MATCH (e:Employee), (d:Department {name: $dept})
            WHERE id(e) = $eid
            MERGE (e)-[:WORKS_IN]->(d)
        """, eid=emp_id, dept=dept)

        # Assign Skills
        num_skills = random.randint(2, 6)
        my_dept_skills = SKILLS_BY_DEPT[dept]
        other_skills = [s for d, s_list in SKILLS_BY_DEPT.items() if d != dept for s in s_list]
        
        person_skills = []
        for _ in range(num_skills):
            if random.random() < 0.8:
                skill = random.choice(my_dept_skills)
            else:
                skill = random.choice(other_skills)
            person_skills.append(skill)
        
        person_skills = list(set(person_skills))
        
        for skill in person_skills:
            tx.run("""
                MATCH (e:Employee), (s:Skill {name: $skill})
                WHERE id(e) = $eid
                MERGE (e)-[:HAS_SKILL]->(s)
            """, eid=emp_id, skill=skill)

        # Assign to Projects (1-2 projects per person)
        if random.random() < 0.85: # 85% of people are on a project
            num_projects = random.choices([1, 2], weights=[0.8, 0.2])[0]
            assigned_projects = random.sample(project_nodes, k=min(num_projects, len(project_nodes)))
            
            for proj in assigned_projects:
                tx.run("""
                    MATCH (e:Employee), (p:Project)
                    WHERE id(e) = $eid AND id(p) = $pid
                    MERGE (e)-[:WORKS_ON]->(p)
                """, eid=emp_id, pid=proj['id'])

    # 5. Create Communication Links
    print("Creating Communication Links...")
    for i, emp1 in enumerate(employees):
        for j, emp2 in enumerate(employees):
            if i >= j: continue 
            
            p_comm = 0
            if emp1['dept'] == emp2['dept']: p_comm = 0.4
            if "Manager" in emp1['name'] or "Lead" in emp1['name']: p_comm += 0.1
            
            if random.random() < p_comm:
                 tx.run("""
                    MATCH (e1:Employee), (e2:Employee)
                    WHERE id(e1) = $id1 AND id(e2) = $id2
                    MERGE (e1)-[:COMMUNICATES_WITH]->(e2)
                 """, id1=emp1['id'], id2=emp2['id'])

def main():
    try:
        with GraphDatabase.driver(URI, auth=AUTH) as driver:
            with driver.session() as session:
                print("--- Resetting & Populating Graph Database with Projects ---")
                session.execute_write(clear_db)
                session.execute_write(create_schema_indexes)
                session.execute_write(populate_graph)
                print("--- Database Population Complete ---")
    except Exception:
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
