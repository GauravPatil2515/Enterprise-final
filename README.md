# DeliverIQ - AI-Driven Enterprise Decision Intelligence Platform
### *The GPS for Engineering Leadership*

> **"Don't just track the traffic jam. Re-route around it."**

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 🚀 The Vision: Active Decision Intelligence

Most engineering analytics tools are **Passive Maps**—they show you where you *were* (velocity charts, commit counts). 

**DeliverIQ is Waze/Google Maps for Delivery**. It consumes raw signals (GitHub/Jira/Neo4j) to:

1. **Predict** delays before they happen ("High Risk: Stalled Critical Path")
2. **Evaluate** constraints ("Ramp-up time > Deadline")
3. **Recommend** the best route ("Escalate Dependency" vs. "Add Engineer")

---

## 💡 Core Innovation: The "Agentic Boardroom"

Instead of a simple dashboard, we deploy a team of AI Agents that "reason" about your project:

- **🕵️ Risk Agent**: The Skeptic. Detects stalled work and hidden risks
- **⚖️ Constraint Agent**: The Realist. Checks if hiring is actually feasible given ramp-up costs
- **🧠 Simulation Agent**: The Strategist. Runs "What-If" scenarios to find the optimal path
- **💰 Finance Agent**: The Analyst. Tracks ROI, cost efficiency, and revenue projections
- **🛡️ Governance Agent**: The Conscience. Ensures privacy and compliance

---

## 🎯 Business Impact

| From (Passive Analytics) | To (Active Intelligence) |
| :--- | :--- |
| "We missed the deadline." | "We spotted the stall 3 weeks ago." |
| "We added 5 devs (and got slower)." | "We escalated the blocker instead." |
| "I think we are on track." | "The data says 60% probability of delay." |
| "What's our ROI?" | "Here's a detailed financial breakdown with recommendations." |

---

## ✨ Key Features

### **Role-Based Dashboards**
- **👨‍💻 Engineer**: Project tracking, ticket management, AI Co-Pilot
- **👥 HR Manager**: Team composition, hiring optimizer, burnout risk analysis
- **💰 Finance Manager**: ROI tracking, cost analysis, revenue projections, PDF reports
- **🎯 Chairperson**: Executive overview, risk analysis, company-wide insights

### **AI-Powered Intelligence**
- **AI Co-Pilot**: Conversational interface for project insights
- **Team Simulator**: AI-driven team composition optimization
- **Risk Analysis**: Multi-agent decision framework for delivery risk assessment
- **Financial Intelligence**: Automated ROI calculations and cost-benefit analysis

### **Advanced Analytics**
- Real-time project health monitoring
- Predictive delivery risk scoring
- Team workload and burnout detection
- Financial performance tracking
- Comprehensive PDF report generation

### **Interactive Visualizations**
- Project progress tracking
- Team performance metrics
- Financial charts and graphs
- Risk heat maps

---

## 🛠️ Tech Stack

### **Backend**
- **Framework**: FastAPI (Python 3.11+)
- **Database**: Neo4j AuraDB (Graph Database)
- **AI/LLM**: Featherless AI (Qwen 2.5 32B Instruct)
- **Agent Framework**: Custom multi-agent system
- **Data Validation**: Pydantic
- **API**: RESTful + Server-Sent Events (SSE)

### **Frontend**
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v6
- **State Management**: React Context API
- **UI Components**: shadcn/ui + Radix UI
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Animations**: Framer Motion
- **PDF Generation**: jsPDF + jspdf-autotable

---

## 📦 Project Structure

```
Enterprise/
├── frontend/                      # React Frontend Application
│   ├── src/
│   │   ├── components/            # Reusable UI components
│   │   │   ├── Sidebar.tsx        # Navigation with role-based filtering
│   │   │   ├── Navbar.tsx         # Top navigation bar
│   │   │   └── ui/                # shadcn/ui components
│   │   ├── pages/                 # Dashboard pages
│   │   │   ├── ChairpersonDashboard.tsx  # Executive dashboard
│   │   │   ├── FinanceDashboard.tsx      # Financial intelligence
│   │   │   ├── HRDashboard.tsx           # HR analytics
│   │   │   └── EngineerDashboard.tsx     # Engineering view
│   │   ├── context/               # React Context providers
│   │   │   ├── RoleContext.tsx    # Role management
│   │   │   └── TeamsContext.tsx   # Team data state
│   │   ├── services/              # API services
│   │   │   └── api.ts             # Backend API client
│   │   └── utils/                 # Utility functions
│   │       ├── pdfGenerator.ts    # Financial PDF reports
│   │       └── projectPdfGenerator.ts  # Project analysis PDFs
│   └── package.json
└── backend/                       # FastAPI Backend
    ├── app/
    │   ├── agents/                # AI agent implementations
    │   │   ├── risk.py            # Delivery risk agent
    │   │   └── team_simulator.py  # Team composition simulator
    │   ├── api/                   # API routes
    │   │   └── routes.py          # CRUD endpoints
    │   ├── core/                  # Core utilities & config
    │   │   ├── config.py          # Environment configuration
    │   │   ├── neo4j_client.py    # Database client
    │   │   ├── llm.py             # LLM integration
    │   │   └── model_router.py    # AI model routing
    │   └── main.py                # FastAPI application
    ├── requirements.txt
    └── .env.example               # Environment template
```

---

## ⚙️ Prerequisites

- **Python 3.11+** ([Download](https://www.python.org/downloads/))
- **Node.js 18+** ([Download](https://nodejs.org/))
- **Neo4j AuraDB Account** (Free tier: [neo4j.com/cloud/aura](https://neo4j.com/aura/))
- **Featherless AI API Key** ([Get one here](https://featherless.ai/))

---

## 🚀 Quick Start

### **1. Clone the Repository**

```bash
git clone <your-repo-url>
cd Enterprise
```

### **2. Setup Backend**

```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows PowerShell:
.venv\Scripts\activate
# Linux/Mac:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file from template
# Windows:
Copy-Item .env.example .env
# Linux/Mac:
cp .env.example .env

# Edit .env and add your credentials:
# - FEATHERLESS_API_KEY
# - NEO4J_URI
# - NEO4J_PASSWORD
```

### **3. Setup Frontend**

```bash
cd ../frontend
npm install
```

### **4. Run the Application**

**Terminal 1 - Backend:**
```bash
cd backend
.venv\Scripts\activate  # Windows
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

**Access**: Open `http://localhost:5173` in your browser

---

## 🔑 Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Featherless AI Configuration
FEATHERLESS_API_KEY=your_api_key_here
FEATHERLESS_BASE_URL=https://api.featherless.ai/v1
MODEL_ID=Qwen/Qwen2.5-32B-Instruct

# Neo4j AuraDB Configuration
NEO4J_URI=neo4j+s://xxxxx.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_password_here
NEO4J_DATABASE=neo4j
```

**See `.env.example` for a complete template.**

---

## 👥 User Roles & Access

| Role | Dashboard Access | Special Features |
|------|------------------|------------------|
| **Engineer** | Projects, Tickets, Teams | AI Co-Pilot |
| **HR Manager** | Teams, Hiring, Workload | Team Simulator, Knowledge Graph, Hiring Optimizer |
| **Finance Manager** | Financial Metrics, ROI | Cost Analysis, PDF Reports, Revenue Tracking |
| **Chairperson** | All Projects, Company Overview | Risk Analysis, Executive Reports, Full Access |

**Note**: Engineers cannot access Team Simulator and Knowledge Graph features (role-based filtering).

---

## 📊 Recent Updates (v2.0.0)

### **UI/UX Improvements**
- ✅ Removed unprofessional emojis from Chairperson Dashboard
- ✅ Enhanced project cards with better layout and financial metrics
- ✅ Improved Finance Dashboard visualizations
- ✅ Added role-based navigation filtering
- ✅ Better responsive design across all dashboards

### **New Features**
- ✅ Downloadable Project Analysis PDF (Chairperson)
- ✅ Enhanced Financial Summary PDF with detailed explanations
- ✅ Fixed PDF layout issues (no more overlapping text)
- ✅ Added comprehensive financial health indicators
- ✅ Improved chart clarity and tooltips

### **Backend Enhancements**
- ✅ Multi-agent risk analysis system
- ✅ Team composition simulator
- ✅ Financial intelligence calculations
- ✅ Server-sent events for real-time AI streaming

---

## 📚 API Documentation

Once the backend is running, visit:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

---

## 🛠️ Development

### **Running Tests**
```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

### **Building for Production**
```bash
# Frontend build
cd frontend
npm run build

# Backend (use production ASGI server)
cd backend
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
```

---

## 🔧 Troubleshooting

### **Common Issues**

**"Module not found" errors**
```bash
# Ensure virtual environment is activated
.venv\Scripts\activate
pip install -r requirements.txt
```

**"Failed to connect to Neo4j"**
- Verify your Neo4j AuraDB instance is running
- Check credentials in `.env` file
- Ensure IP whitelist includes your IP (if configured)

**"Port already in use"**
```bash
# Windows - Kill process on port 8000
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:8000 | xargs kill -9
```

**"White screen" in browser**
- Ensure both frontend and backend are running
- Check browser console (F12) for errors
- Verify CORS settings in backend

---

## 🧠 Architecture Highlights

### **Multi-Agent System**
The platform uses a sophisticated multi-agent architecture where specialized AI agents collaborate to provide comprehensive insights:

1. **Risk Agent**: Analyzes project health, blocked tickets, and delivery risks
2. **Finance Agent**: Calculates ROI, cost efficiency, and financial projections
3. **Team Agent**: Evaluates team composition and workload distribution
4. **Simulation Agent**: Runs what-if scenarios for decision support

### **Graph Database Design**
Neo4j enables powerful relationship queries:
- Team → Project → Ticket relationships
- Member → Team assignments
- Project dependencies and blockers
- Historical risk snapshots

### **Real-Time Intelligence**
- Server-Sent Events (SSE) for streaming AI responses
- Context-aware LLM prompting
- Dynamic model routing based on task complexity

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

- **Neo4j** for the graph database platform
- **Featherless AI** for LLM infrastructure
- **shadcn/ui** for beautiful UI components
- **FastAPI** and **React** communities

---

## 📧 Support

For issues and questions:
- Open an issue on GitHub
- Check API documentation at `/docs`
- Review troubleshooting section above

---

**Built with ❤️ for enterprise decision intelligence**

*This platform is the foundation for 2026 Digital Transformation—integrating tools to connect work.*
