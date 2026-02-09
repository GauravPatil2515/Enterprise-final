import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { Team, Project, Ticket, TicketStatus } from '@/utils/types';
import { api } from '@/services/api';
import { toast } from 'sonner';

interface TeamsState {
  teams: Team[];
  selectedTeamId: string | null;
  selectedProjectId: string | null;
  loading: boolean;
}

type TeamsAction =
  | { type: 'SET_TEAMS'; payload: Team[] }
  | { type: 'SELECT_TEAM'; payload: string }
  | { type: 'SELECT_PROJECT'; payload: string }
  | { type: 'UPDATE_TICKET_STATUS'; payload: { teamId: string; projectId: string; ticketId: string; newStatus: TicketStatus } }
  | { type: 'ADD_TICKET'; payload: { teamId: string; projectId: string; ticket: Ticket } }
  | { type: 'UPDATE_TICKET'; payload: { teamId: string; projectId: string; ticket: Ticket } }
  | { type: 'DELETE_TICKET'; payload: { teamId: string; projectId: string; ticketId: string } }
  | { type: 'SET_LOADING'; payload: boolean };

const teamsReducer = (state: TeamsState, action: TeamsAction): TeamsState => {
  switch (action.type) {
    case 'SET_TEAMS':
      return { ...state, teams: action.payload, loading: false };

    case 'SELECT_TEAM':
      return { ...state, selectedTeamId: action.payload, selectedProjectId: null };

    case 'SELECT_PROJECT':
      return { ...state, selectedProjectId: action.payload };

    case 'UPDATE_TICKET_STATUS':
      return {
        ...state,
        teams: state.teams.map(team => {
          if (team.id !== action.payload.teamId) return team;
          return {
            ...team,
            projects: team.projects.map(project => {
              if (project.id !== action.payload.projectId) return project;
              return {
                ...project,
                tickets: project.tickets.map(ticket => {
                  if (ticket.id !== action.payload.ticketId) return ticket;
                  return { ...ticket, status: action.payload.newStatus };
                }),
              };
            }),
          };
        }),
      };

    case 'ADD_TICKET':
      return {
        ...state,
        teams: state.teams.map(team => {
          if (team.id !== action.payload.teamId) return team;
          return {
            ...team,
            projects: team.projects.map(project => {
              if (project.id !== action.payload.projectId) return project;
              return {
                ...project,
                tickets: [...project.tickets, action.payload.ticket],
              };
            }),
          };
        }),
      };

    case 'UPDATE_TICKET':
      return {
        ...state,
        teams: state.teams.map(team => {
          if (team.id !== action.payload.teamId) return team;
          return {
            ...team,
            projects: team.projects.map(project => {
              if (project.id !== action.payload.projectId) return project;
              return {
                ...project,
                tickets: project.tickets.map(ticket =>
                  ticket.id === action.payload.ticket.id ? action.payload.ticket : ticket
                ),
              };
            }),
          };
        }),
      };

    case 'DELETE_TICKET':
      return {
        ...state,
        teams: state.teams.map(team => {
          if (team.id !== action.payload.teamId) return team;
          return {
            ...team,
            projects: team.projects.map(project => {
              if (project.id !== action.payload.projectId) return project;
              return {
                ...project,
                tickets: project.tickets.filter(ticket => ticket.id !== action.payload.ticketId),
              };
            }),
          };
        }),
      };

    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    default:
      return state;
  }
};

interface TeamsContextType {
  state: TeamsState;
  dispatch: React.Dispatch<TeamsAction>;
  getSelectedTeam: () => Team | undefined;
  getSelectedProject: () => Project | undefined;
  getAllProjects: () => Project[];
  getAllTickets: () => Ticket[];
}

const TeamsContext = createContext<TeamsContextType | undefined>(undefined);

export const TeamsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(teamsReducer, {
    teams: [],
    selectedTeamId: null,
    selectedProjectId: null,
    loading: true,
  });

  // Load from API on mount, fallback to localStorage, then mockData
  useEffect(() => {
    let cancelled = false;

    const loadFromAPI = async () => {
      try {
        const teams = await api.getTeams();
        if (!cancelled && teams && teams.length > 0) {
          // Normalize: ensure tickets have proper labels arrays
          const normalized = teams.map((team: any) => ({
            ...team,
            projects: (team.projects || []).map((project: any) => ({
              ...project,
              tickets: (project.tickets || []).map((ticket: any) => ({
                ...ticket,
                labels: Array.isArray(ticket.labels)
                  ? ticket.labels.filter((l: string) => l !== '')
                  : typeof ticket.labels === 'string'
                    ? ticket.labels.split(',').filter((l: string) => l !== '')
                    : [],
                attachments: Number(ticket.attachments) || 0,
                comments: Number(ticket.comments) || 0,
              })),
            })),
          }));
          dispatch({ type: 'SET_TEAMS', payload: normalized });
          return;
        }
      } catch (err) {
        console.error('❌ API unavailable:', err);
        // Try localStorage as offline cache only (data was originally from API)
        if (!cancelled) {
          const stored = localStorage.getItem('jira-clone-teams');
          if (stored) {
            try {
              dispatch({ type: 'SET_TEAMS', payload: JSON.parse(stored) });
              toast.warning('Loaded cached data — backend is unreachable');
              return;
            } catch { /* ignore corrupt cache */ }
          }
          // No cache available — show empty state with error
          dispatch({ type: 'SET_TEAMS', payload: [] });
          toast.error('Failed to connect to backend. Please ensure the server is running.');
        }
      }
    };

    loadFromAPI();
    return () => { cancelled = true; };
  }, []);

  const getSelectedTeam = (): Team | undefined => {
    return state.teams.find(team => team.id === state.selectedTeamId);
  };

  const getSelectedProject = (): Project | undefined => {
    const team = getSelectedTeam();
    if (!team) return undefined;
    return team.projects.find(project => project.id === state.selectedProjectId);
  };

  const getAllProjects = (): Project[] => {
    return state.teams.flatMap(team => team.projects);
  };

  const getAllTickets = (): Ticket[] => {
    return getAllProjects().flatMap(project => project.tickets);
  };

  return (
    <TeamsContext.Provider value={{
      state,
      dispatch,
      getSelectedTeam,
      getSelectedProject,
      getAllProjects,
      getAllTickets,
    }}>
      {children}
    </TeamsContext.Provider>
  );
};

export const useTeams = (): TeamsContextType => {
  const context = useContext(TeamsContext);
  if (context === undefined) {
    throw new Error('useTeams must be used within a TeamsProvider');
  }
  return context;
};
