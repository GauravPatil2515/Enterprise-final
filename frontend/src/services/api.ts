/**
 * API Service Layer
 * Connects frontend to FastAPI backend at /api/*
 */

const API_BASE = '/api';

// ============================================================================
// Generic fetch wrapper
// ============================================================================

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `API Error ${res.status}`);
  }

  return res.json();
}


// ============================================================================
// Teams
// ============================================================================

export interface Member {
  id: string;
  name: string;
  avatar: string;
  role: string;
  email: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  assignee: Member;
  priority: 'High' | 'Medium' | 'Low';
  status: 'To Do' | 'In Progress' | 'Review' | 'Done';
  dueDate: string;
  createdAt: string;
  attachments: number;
  comments: number;
  labels: string[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'Ongoing' | 'Completed' | 'On Hold';
  progress: number;
  tickets: Ticket[];
  createdAt: string;
  icon: string;
}

export interface Team {
  id: string;
  name: string;
  description: string;
  members: Member[];
  projects: Project[];
  color: string;
}

// ── Risk Analysis Types ──

export interface AgentOpinion {
  agent: string;
  claim: string;
  confidence: number;
  evidence: string[];
}

export interface DecisionComparison {
  action: string;
  risk_reduction: number;
  cost: string;
  feasible: boolean;
  recommended: boolean;
  reason: string;
}

export interface AnalysisResult {
  project_id: string;
  project_name: string;
  risk_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  primary_reason: string;
  supporting_signals: string[];
  recommended_actions: string[];
  agent_opinions: AgentOpinion[];
  decision_comparison: DecisionComparison[];
}

export interface RiskSnapshot {
  project_id: string;
  project_name: string;
  risk_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  blocked_count: number;
  overdue_count: number;
  total_tickets: number;
  timestamp: string;
}


// ── Role-Based Types ──

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: 'engineer' | 'hr' | 'chairperson' | 'finance';
  avatar: string;
  team_id: string;
}

export interface RoleDashboard {
  role: string;
  label: string;
  permissions: string[];
  dashboard_sections: string[];
}

export interface DashboardData {
  role: string;
  config: RoleDashboard;
  projects?: any[];
  members?: any[];
  teams?: any[];
  intervention_costs?: Record<string, any>;
}


// ============================================================================
// API Functions
// ============================================================================

export const api = {
  // Teams
  getTeams: () => apiFetch<Team[]>('/teams'),
  getTeam: (teamId: string) => apiFetch<Team>(`/teams/${teamId}`),
  getTeamProjects: (teamId: string) => apiFetch<Project[]>(`/teams/${teamId}/projects`),

  // Projects
  getProject: (projectId: string) => apiFetch<Project>(`/projects/${projectId}`),
  getProjectTickets: (projectId: string) => apiFetch<Ticket[]>(`/projects/${projectId}/tickets`),

  // Tickets
  createTicket: (projectId: string, ticket: Ticket) =>
    apiFetch<Ticket>(`/projects/${projectId}/tickets`, {
      method: 'POST',
      body: JSON.stringify(ticket),
    }),

  updateTicket: (ticketId: string, data: Partial<Ticket>) =>
    apiFetch<Ticket>(`/tickets/${ticketId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  updateTicketStatus: (ticketId: string, status: string) =>
    apiFetch<Ticket>(`/tickets/${ticketId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  deleteTicket: (ticketId: string) =>
    apiFetch<{ status: string; id: string }>(`/tickets/${ticketId}`, {
      method: 'DELETE',
    }),

  // Members
  getMembers: () => apiFetch<Member[]>('/members'),

  // Risk Analysis (AI)
  analyzeProject: (projectId: string) =>
    apiFetch<AnalysisResult>(`/analyze/${projectId}`),

  // Risk History / Trends
  saveRiskSnapshot: (projectId: string) =>
    apiFetch<RiskSnapshot>(`/risk-snapshot/${projectId}`, { method: 'POST' }),

  getRiskHistory: (projectId: string, limit = 30) =>
    apiFetch<RiskSnapshot[]>(`/risk-history/${projectId}?limit=${limit}`),

  // Postmortem Generator
  generatePostmortem: (projectId: string) =>
    apiFetch<{
      project_id: string;
      project_name: string;
      risk_score: number;
      risk_level: string;
      postmortem: string;
      generated_from: { signals_count: number; actions_count: number; agents_consulted: string[] };
    }>(`/postmortem/${projectId}`),

  // Graph Visualisation
  getGraphData: () =>
    apiFetch<{
      nodes: { neo_id: number; id: string; label: string; name: string; props: Record<string, any> }[];
      edges: { source: string; target: string; type: string }[];
    }>('/graph'),

  // Role-Based System
  getRoles: () => apiFetch<Record<string, RoleDashboard>>('/roles'),
  getRoleDashboard: (role: string) => apiFetch<RoleDashboard>(`/roles/${role}`),
  getSystemUsers: () => apiFetch<SystemUser[]>('/system-users'),
  getSystemUser: (userId: string) => apiFetch<SystemUser>(`/system-users/${userId}`),
  getDashboardData: (role: string) => apiFetch<DashboardData>(`/dashboard/${role}`),

  // Executive AI Narrative
  getNarrative: (role: string) =>
    apiFetch<{ role: string; narrative: string }>(`/narrative/${role}`),

  // Company Report (Chairperson)
  getCompanyReport: () =>
    apiFetch<{
      teams: any[];
      projects: any[];
      workforce: any[];
      summary: {
        total_teams: number;
        total_members: number;
        total_projects: number;
        total_active_tickets: number;
        total_done_tickets: number;
        total_blocked: number;
        avg_progress: number;
        completion_rate: number;
        overloaded_members: number;
        idle_members: number;
      };
    }>('/company-report'),

  generateCompanyReport: () =>
    apiFetch<{
      report: string;
      summary: any;
      generated_at: string;
    }>('/company-report/generate', { method: 'POST' }),

  // Team Composition Simulator
  getSimulatorRoles: () =>
    apiFetch<Record<string, {
      velocity_boost: number;
      ramp_up_days: number;
      cost_per_day: number;
      blocked_resolution: number;
    }>>('/simulate-team/roles'),

  simulateTeam: (projectId: string, mutations: { action: string; role: string; member_name?: string }[], baselineRisk?: number) =>
    apiFetch<{
      project_id: string;
      baseline_risk: number;
      simulations: {
        mutation: { action: string; role: string; project_id: string; member_name?: string };
        baseline_risk: number;
        projected_risk: number;
        risk_delta: number;
        cost_delta: number;
        velocity_change: number;
        confidence: number;
        reasoning: string;
        feasible: boolean;
        warning: string | null;
      }[];
      available_roles: string[];
    }>('/simulate-team', {
      method: 'POST',
      body: JSON.stringify({ project_id: projectId, mutations, baseline_risk: baselineRisk }),
    }),
};
