from flask import Flask, jsonify, request
from neo4j import GraphDatabase
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

# Neo4j connection details
URI = "neo4j+s://a5564146.databases.neo4j.io"
AUTH = ("neo4j", "YMPv51IuGyP3goE4cBPitOwnqNOA0xfiUch0ncBgAjc")

driver = GraphDatabase.driver(URI, auth=AUTH)

def get_filtered_graph_data(tx, departments, min_perf, show_skills, project_id):
    # Filter Logic:
    # 1. Base Criteria: Filter Employees by Department & Performance
    # 2. Project Context: If project_id provided, ONLY keep Employees working on that project
    
    query = """
    // 1. Identify valid employees
    MATCH (e:Employee)-[:WORKS_IN]->(d:Department)
    WHERE ($all_depts OR d.name IN $depts) AND e.performance >= $min_perf
    
    // 2. Apply Project Filter if selected
    WITH e, d
    call {
        with e
        MATCH (e)-[:WORKS_ON]->(p:Project)
        WHERE $pid IS NULL OR elementId(p) = $pid
        RETURN count(p) as proj_match
    }
    WITH e, d, proj_match
    WHERE ($pid IS NULL) OR (proj_match > 0)
    
    // 3. Collect valid nodes
    WITH collect(DISTINCT e) as employees, collect(DISTINCT d) as departments
    
    // 4. Get relevant skills (only if toggled)
    CALL {
        WITH employees
        MATCH (e)-[:HAS_SKILL]->(s:Skill)
        WHERE $show_skills AND e IN employees
        RETURN collect(DISTINCT s) as skills
    }

    // 5. Get relevant projects (to show the project node itself)
    CALL {
        WITH employees
        MATCH (e)-[:WORKS_ON]->(p:Project)
        WHERE $pid IS NOT NULL AND elementId(p) = $pid
        RETURN collect(DISTINCT p) as projects
    }
    
    // 6. Combine all
    WITH employees, departments, skills, projects, (employees + departments + skills + projects) as all_nodes
    
    // 7. Find internal relationships
    MATCH (n)-[r]->(m)
    WHERE n IN all_nodes AND m IN all_nodes
    RETURN n, r, m
    """
    
    all_depts = True if not departments else False
    # If no project selected, pid is None
    pid = project_id if project_id else None
    
    result = tx.run(query, all_depts=all_depts, depts=departments, min_perf=min_perf, show_skills=show_skills, pid=pid)
    
    nodes = {}
    links = []
    
    for record in result:
        n = record['n']
        m = record['m']
        r = record['r']
        
        if n.element_id not in nodes:
            nodes[n.element_id] = {
                "id": n.element_id, 
                "label": list(n.labels)[0] if n.labels else "Node",
                "properties": dict(n)
            }
        
        if m.element_id not in nodes:
            nodes[m.element_id] = {
                "id": m.element_id,
                "label": list(m.labels)[0] if m.labels else "Node",
                "properties": dict(m)
            }
            
        links.append({
            "source": n.element_id,
            "target": m.element_id,
            "type": r.type,
            "properties": dict(r)
        })
        
    return {"nodes": list(nodes.values()), "links": links}

def get_projects(tx):
    query = "MATCH (p:Project) RETURN p.name as name, elementId(p) as id ORDER BY name"
    result = tx.run(query)
    return [{"name": r["name"], "id": r["id"]} for r in result]

def get_skills_by_category(tx):
    query = """
    MATCH (s:Skill)
    RETURN s.category as Category, collect(s.name) as Skills
    ORDER BY Category
    """
    result = tx.run(query)
    return {record["Category"]: record["Skills"] for record in result}

def find_best_fit_employees(tx, required_skills):
    if not required_skills:
        return []
        
    query = """
    MATCH (e:Employee)-[:HAS_SKILL]->(s:Skill)
    WHERE s.name IN $skills
    WITH e, count(s) AS matching_skills, collect(s.name) AS skills_found
    WHERE matching_skills > 0
    RETURN e.name AS Name, e.role AS Role, matching_skills, skills_found, e.performance as Performance
    ORDER BY matching_skills DESC, e.performance DESC
    LIMIT 10
    """
    result = tx.run(query, skills=required_skills)
    return [record.data() for record in result]

def check_department_communication_gap(tx, dept1_name, dept2_name):
    query = """
    MATCH (d1:Department {name: $dept1})<-[:WORKS_IN]-(e1:Employee)
    MATCH (d2:Department {name: $dept2})<-[:WORKS_IN]-(e2:Employee)
    OPTIONAL MATCH p = shortestPath((e1)-[:COMMUNICATES_WITH*]-(e2))
    WITH e1, e2, p
    RETURN e1.name AS Emp1, e2.name AS Emp2, 
           CASE WHEN p IS NULL THEN 'No Path' ELSE toString(length(p)) END as PathLength
    ORDER BY PathLength ASC
    LIMIT 50
    """
    result = tx.run(query, dept1=dept1_name, dept2=dept2_name)
    return [record.data() for record in result]

@app.route('/api/graph', methods=['GET'])
def get_graph():
    depts_param = request.args.get('departments', '')
    departments = [d for d in depts_param.split(',') if d]
    
    min_perf = float(request.args.get('min_perf', 0))
    show_skills = request.args.get('show_skills', 'false').lower() == 'true'
    project_id = request.args.get('project_id', '')
    
    with driver.session() as session:
        data = session.execute_read(get_filtered_graph_data, departments, min_perf, show_skills, project_id)
    return jsonify(data)

@app.route('/api/projects', methods=['GET'])
def list_projects():
    with driver.session() as session:
        data = session.execute_read(get_projects)
    return jsonify(data)

@app.route('/api/skills', methods=['GET'])
def get_skills():
    with driver.session() as session:
        data = session.execute_read(get_skills_by_category)
    return jsonify(data)

@app.route('/api/project-fit', methods=['POST'])
def project_fit():
    data = request.json
    skills = data.get('skills', [])
    with driver.session() as session:
        results = session.execute_read(find_best_fit_employees, skills)
    return jsonify(results)

@app.route('/api/comm-gap', methods=['GET'])
def comm_gap():
    dept1 = request.args.get('dept1', 'Tech')
    dept2 = request.args.get('dept2', 'Marketing')
    with driver.session() as session:
        results = session.execute_read(check_department_communication_gap, dept1, dept2)
    return jsonify(results)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
