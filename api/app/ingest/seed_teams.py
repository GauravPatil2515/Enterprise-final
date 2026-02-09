"""
Seed Neo4j with Teams, Projects, Tickets, Members, BLOCKED_BY edges,
and role-based SystemUsers.
Run: python -m backend.app.ingest.seed_teams
"""
import sys
import os
from datetime import datetime, timedelta

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))

from backend.app.core.neo4j_client import neo4j_client


# Helper: future date strings relative to today for realistic risk signals
def _future(days: int) -> str:
    return (datetime.now() + timedelta(days=days)).strftime("%Y-%m-%d")

def _past(days: int) -> str:
    return (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")


def clear_database():
    """Remove all nodes and relationships."""
    neo4j_client.execute_query("MATCH (n) DETACH DELETE n")
    print("✅ Database cleared")


def seed_members():
    """Create Member nodes."""
    members = [
        {"id": "m1", "name": "You",          "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=you",     "role": "Tech Lead",          "email": "you@datalis.com"},
        {"id": "m2", "name": "Sarah Chen",   "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah",   "role": "Senior Developer",   "email": "sarah@datalis.com"},
        {"id": "m3", "name": "Mike Johnson", "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=mike",    "role": "Frontend Developer", "email": "mike@datalis.com"},
        {"id": "m4", "name": "Emma Wilson",  "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=emma",    "role": "UX Designer",        "email": "emma@datalis.com"},
        {"id": "m5", "name": "Alex Kim",     "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=alex",    "role": "Backend Developer",  "email": "alex@datalis.com"},
        {"id": "m6", "name": "Jordan Lee",   "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=jordan",  "role": "DevOps Engineer",    "email": "jordan@datalis.com"},
        {"id": "m7", "name": "Intern1",      "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=intern1", "role": "Intern",             "email": "intern1@datalis.com"},
        {"id": "m8", "name": "Chris Taylor", "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=chris",   "role": "Product Manager",    "email": "chris@datalis.com"},
    ]
    for m in members:
        neo4j_client.execute_query(
            "CREATE (m:Member {id: $id, name: $name, avatar: $avatar, role: $role, email: $email})",
            m,
        )
    print(f"✅ Created {len(members)} members")


def seed_system_users():
    """Create SystemUser nodes for role-based access."""
    users = [
        {"id": "su1", "name": "Alice Engineer",   "email": "alice@datalis.com",   "role": "engineer",     "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=alice",   "team_id": "t1"},
        {"id": "su2", "name": "Bob HR Manager",   "email": "bob@datalis.com",     "role": "hr",           "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=bob",     "team_id": ""},
        {"id": "su3", "name": "Carol Chairperson","email": "carol@datalis.com",   "role": "chairperson",  "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=carol",   "team_id": ""},
        {"id": "su4", "name": "Dave Finance",     "email": "dave@datalis.com",    "role": "finance",      "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=dave",    "team_id": ""},
    ]
    for u in users:
        neo4j_client.execute_query(
            "CREATE (u:SystemUser {id: $id, name: $name, email: $email, role: $role, avatar: $avatar, team_id: $team_id})",
            u,
        )
    print(f"✅ Created {len(users)} system users (role-based)")


def seed_teams_and_projects():
    """Create Team, Project nodes and relationships. Projects now have deadlines."""

    # ── Team 1: Datalis Team ──
    neo4j_client.execute_query("""
        CREATE (t:Team {id: 't1', name: 'Datalis Team', description: 'Core development team building the main platform', color: '#0052CC'})
    """)
    for mid in ["m1", "m2", "m3", "m7"]:
        neo4j_client.execute_query("""
            MATCH (t:Team {id: 't1'}), (m:Member {id: $mid})
            CREATE (m)-[:MEMBER_OF]->(t)
        """, {"mid": mid})

    # Project p1: Blockchain App  — deadline in 5 days (tight!)
    neo4j_client.execute_query("""
        MATCH (t:Team {id: 't1'})
        CREATE (p:Project {id: 'p1', name: 'Blockchain App', description: 'Decentralized application for secure transactions',
            status: 'Ongoing', progress: 65, icon: 'Link', createdAt: '2024-01-15', deadline: $deadline})
        CREATE (t)-[:HAS_PROJECT]->(p)
    """, {"deadline": _future(5)})

    # Project p2: Analytics Dashboard — deadline in 14 days (comfortable)
    neo4j_client.execute_query("""
        MATCH (t:Team {id: 't1'})
        CREATE (p:Project {id: 'p2', name: 'Analytics Dashboard', description: 'Real-time analytics and reporting platform',
            status: 'Ongoing', progress: 40, icon: 'BarChart', createdAt: '2024-02-01', deadline: $deadline})
        CREATE (t)-[:HAS_PROJECT]->(p)
    """, {"deadline": _future(14)})

    # ── Team 2: Frontend Team ──
    neo4j_client.execute_query("""
        CREATE (t:Team {id: 't2', name: 'Frontend Team', description: 'UI/UX experts crafting beautiful interfaces', color: '#00875A'})
    """)
    for mid in ["m3", "m4", "m8"]:
        neo4j_client.execute_query("""
            MATCH (t:Team {id: 't2'}), (m:Member {id: $mid})
            CREATE (m)-[:MEMBER_OF]->(t)
        """, {"mid": mid})

    # Project p3: Design System — deadline in 10 days
    neo4j_client.execute_query("""
        MATCH (t:Team {id: 't2'})
        CREATE (p:Project {id: 'p3', name: 'Design System', description: 'Component library and design tokens',
            status: 'Ongoing', progress: 80, icon: 'Palette', createdAt: '2023-11-01', deadline: $deadline})
        CREATE (t)-[:HAS_PROJECT]->(p)
    """, {"deadline": _future(10)})

    # Project p4: Marketing Website — already completed, deadline in the past
    neo4j_client.execute_query("""
        MATCH (t:Team {id: 't2'})
        CREATE (p:Project {id: 'p4', name: 'Marketing Website', description: 'Public-facing company website',
            status: 'Completed', progress: 100, icon: 'Globe', createdAt: '2023-09-15', deadline: $deadline})
        CREATE (t)-[:HAS_PROJECT]->(p)
    """, {"deadline": _past(30)})

    # ── Team 3: Blockchain Team ──
    neo4j_client.execute_query("""
        CREATE (t:Team {id: 't3', name: 'Blockchain Team', description: 'Web3 and smart contract specialists', color: '#6554C0'})
    """)
    for mid in ["m5", "m6", "m1"]:
        neo4j_client.execute_query("""
            MATCH (t:Team {id: 't3'}), (m:Member {id: $mid})
            CREATE (m)-[:MEMBER_OF]->(t)
        """, {"mid": mid})

    # Project p5: NFT Marketplace — deadline in 6 days (tight + has blocking)
    neo4j_client.execute_query("""
        MATCH (t:Team {id: 't3'})
        CREATE (p:Project {id: 'p5', name: 'NFT Marketplace', description: 'Platform for creating and trading NFTs',
            status: 'Ongoing', progress: 55, icon: 'Image', createdAt: '2024-01-01', deadline: $deadline})
        CREATE (t)-[:HAS_PROJECT]->(p)
    """, {"deadline": _future(6)})

    # Project p6: DeFi Protocol — on hold, deadline far out
    neo4j_client.execute_query("""
        MATCH (t:Team {id: 't3'})
        CREATE (p:Project {id: 'p6', name: 'DeFi Protocol', description: 'Decentralized finance protocol',
            status: 'On Hold', progress: 25, icon: 'Coins', createdAt: '2023-12-01', deadline: $deadline})
        CREATE (t)-[:HAS_PROJECT]->(p)
    """, {"deadline": _future(45)})

    print("✅ Created 3 teams with 6 projects (with deadlines)")


def seed_tickets():
    """Create Ticket nodes with assignee relationships.
    Due dates use relative offsets so risk analysis always produces fresh results."""
    tickets = [
        # ── Project p1: Blockchain App ──
        {"id": "TKT-001", "project": "p1", "title": "Fix UI Bug in Dashboard",      "description": "The dashboard widgets are not aligned properly on mobile devices.",                "assignee": "m1", "priority": "High",   "status": "In Progress", "dueDate": _future(3),   "createdAt": _past(14), "attachments": 2, "comments": 5, "labels": "bug,ui,mobile"},
        {"id": "TKT-002", "project": "p1", "title": "Implement Wallet Connection",   "description": "Add support for MetaMask and WalletConnect integration.",                           "assignee": "m2", "priority": "High",   "status": "To Do",       "dueDate": _future(4),   "createdAt": _past(10), "attachments": 1, "comments": 3, "labels": "feature,blockchain"},
        {"id": "TKT-003", "project": "p1", "title": "Smart Contract Audit",          "description": "Review and audit all smart contracts for security vulnerabilities.",                 "assignee": "m2", "priority": "High",   "status": "Review",      "dueDate": _past(2),     "createdAt": _past(12), "attachments": 4, "comments": 8, "labels": "security,blockchain"},
        {"id": "TKT-004", "project": "p1", "title": "Add Transaction History",       "description": "Display user transaction history with filtering and export options.",                "assignee": "m3", "priority": "Medium", "status": "In Progress", "dueDate": _future(7),   "createdAt": _past(7),  "attachments": 0, "comments": 2, "labels": "feature,ui"},
        {"id": "TKT-005", "project": "p1", "title": "Documentation Update",          "description": "Update API documentation with new endpoints.",                                      "assignee": "m7", "priority": "Low",    "status": "Done",        "dueDate": _past(5),     "createdAt": _past(14), "attachments": 1, "comments": 1, "labels": "docs"},
        {"id": "TKT-006", "project": "p1", "title": "Optimize Gas Fees",             "description": "Reduce gas consumption for contract interactions.",                                  "assignee": "m1", "priority": "Medium", "status": "To Do",       "dueDate": _future(12),  "createdAt": _past(5),  "attachments": 0, "comments": 4, "labels": "optimization,blockchain"},
        # ── Project p2: Analytics Dashboard ──
        {"id": "TKT-007", "project": "p2", "title": "Design Chart Components",       "description": "Create reusable chart components using Recharts library.",                          "assignee": "m3", "priority": "High",   "status": "In Progress", "dueDate": _future(8),   "createdAt": _past(3),  "attachments": 3, "comments": 6, "labels": "design,component"},
        {"id": "TKT-008", "project": "p2", "title": "Implement Data Export",         "description": "Allow users to export reports in CSV and PDF formats.",                              "assignee": "m2", "priority": "Medium", "status": "To Do",       "dueDate": _future(14),  "createdAt": _past(1),  "attachments": 0, "comments": 2, "labels": "feature"},
        # ── Project p3: Design System ──
        {"id": "TKT-009", "project": "p3", "title": "Create Button Variants",        "description": "Add primary, secondary, ghost, and destructive button variants.",                   "assignee": "m4", "priority": "High",   "status": "Done",        "dueDate": _past(5),     "createdAt": _past(25), "attachments": 2, "comments": 4, "labels": "component,design-system"},
        {"id": "TKT-010", "project": "p3", "title": "Dark Mode Support",             "description": "Implement dark mode across all components.",                                        "assignee": "m3", "priority": "Medium", "status": "In Progress", "dueDate": _future(10),  "createdAt": _past(10), "attachments": 1, "comments": 7, "labels": "enhancement,accessibility"},
        {"id": "TKT-011", "project": "p3", "title": "Form Components",               "description": "Build input, select, checkbox, and radio components.",                              "assignee": "m4", "priority": "High",   "status": "Review",      "dueDate": _future(5),   "createdAt": _past(7),  "attachments": 0, "comments": 3, "labels": "component,forms"},
        # ── Project p4: Marketing Website (completed) ──
        {"id": "TKT-012", "project": "p4", "title": "SEO Optimization",              "description": "Improve meta tags and add structured data.",                                        "assignee": "m8", "priority": "Medium", "status": "Done",        "dueDate": _past(30),    "createdAt": _past(45), "attachments": 1, "comments": 2, "labels": "seo,marketing"},
        # ── Project p5: NFT Marketplace ──
        {"id": "TKT-013", "project": "p5", "title": "Implement Minting Flow",        "description": "Create user flow for minting new NFTs with metadata.",                             "assignee": "m5", "priority": "High",   "status": "In Progress", "dueDate": _future(4),   "createdAt": _past(5),  "attachments": 2, "comments": 5, "labels": "feature,nft"},
        {"id": "TKT-014", "project": "p5", "title": "Auction System",                "description": "Build bidding and auction functionality for NFTs.",                                 "assignee": "m6", "priority": "High",   "status": "To Do",       "dueDate": _future(12),  "createdAt": _past(3),  "attachments": 1, "comments": 3, "labels": "feature,marketplace"},
        {"id": "TKT-015", "project": "p5", "title": "IPFS Integration",              "description": "Store NFT metadata and images on IPFS.",                                            "assignee": "m5", "priority": "Medium", "status": "Review",      "dueDate": _past(1),     "createdAt": _past(7),  "attachments": 0, "comments": 4, "labels": "infrastructure,storage"},
        # ── Project p6: DeFi Protocol ──
        {"id": "TKT-016", "project": "p6", "title": "Liquidity Pool Design",         "description": "Design the liquidity pool smart contract architecture.",                            "assignee": "m1", "priority": "Low",    "status": "To Do",       "dueDate": _future(40),  "createdAt": _past(14), "attachments": 3, "comments": 6, "labels": "design,defi"},
    ]

    for t in tickets:
        neo4j_client.execute_query("""
            MATCH (p:Project {id: $project})
            CREATE (tk:Ticket {
                id: $id, title: $title, description: $description,
                priority: $priority, status: $status, dueDate: $dueDate,
                createdAt: $createdAt, attachments: $attachments,
                comments: $comments, labels: $labels
            })
            CREATE (p)-[:HAS_TICKET]->(tk)
            WITH tk
            MATCH (m:Member {id: $assignee})
            CREATE (m)-[:ASSIGNED_TO]->(tk)
        """, t)

    print(f"✅ Created {len(tickets)} tickets")


def seed_blocked_by_relationships():
    """Create BLOCKED_BY edges between tickets for real risk detection.
    
    Scenario 1 (p1): TKT-002 (Wallet Connection) is blocked by TKT-003 (Smart Contract Audit)
      → Can't integrate wallet until audit passes.  TKT-003 is in Review and overdue.
    
    Scenario 2 (p5): TKT-013 (Minting Flow) is blocked by TKT-015 (IPFS Integration)
      → Can't mint NFTs until IPFS storage is ready.  TKT-015 is in Review and overdue.
    """
    blockers = [
        {"blocked": "TKT-002", "blocker": "TKT-003"},
        {"blocked": "TKT-013", "blocker": "TKT-015"},
    ]
    for b in blockers:
        neo4j_client.execute_query("""
            MATCH (blocked:Ticket {id: $blocked}), (blocker:Ticket {id: $blocker})
            CREATE (blocked)<-[:BLOCKED_BY]-(blocker)
        """, b)

    print(f"✅ Created {len(blockers)} BLOCKED_BY relationships")


def create_indexes():
    """Create Neo4j indexes for performance."""
    indexes = [
        "CREATE INDEX IF NOT EXISTS FOR (t:Team) ON (t.id)",
        "CREATE INDEX IF NOT EXISTS FOR (p:Project) ON (p.id)",
        "CREATE INDEX IF NOT EXISTS FOR (tk:Ticket) ON (tk.id)",
        "CREATE INDEX IF NOT EXISTS FOR (m:Member) ON (m.id)",
        "CREATE INDEX IF NOT EXISTS FOR (su:SystemUser) ON (su.id)",
        "CREATE INDEX IF NOT EXISTS FOR (su:SystemUser) ON (su.role)",
    ]
    for idx in indexes:
        try:
            neo4j_client.execute_query(idx)
        except Exception:
            pass
    print("✅ Indexes created")


if __name__ == "__main__":
    print("🚀 Seeding Neo4j with Teams/Projects/Tickets + Role System...")
    print("=" * 55)

    if not neo4j_client.verify_connection():
        print("❌ Cannot connect to Neo4j. Check credentials.")
        sys.exit(1)

    clear_database()
    create_indexes()
    seed_members()
    seed_system_users()
    seed_teams_and_projects()
    seed_tickets()
    seed_blocked_by_relationships()

    print("=" * 55)
    print("✅ Seeding complete! Database ready.")
    print("   3 Teams, 6 Projects, 16 Tickets, 8 Members")
    print("   4 SystemUsers (engineer, hr, chairperson, finance)")
    print("   2 BLOCKED_BY relationships (real risk scenarios)")
