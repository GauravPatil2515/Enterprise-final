import { useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Ticket, TicketStatus, Priority } from '@/utils/mockData';
import { useTeams } from '@/context/TeamsContext';
import { api } from '@/services/api';

interface UseTicketsOptions {
  teamId?: string;
  projectId?: string;
}

interface TicketFilters {
  search: string;
  status: TicketStatus | 'all';
  priority: Priority | 'all';
  assigneeId: string | 'all';
}

export const useTickets = (options: UseTicketsOptions = {}) => {
  const { state, dispatch } = useTeams();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<TicketFilters>({
    search: '',
    status: 'all',
    priority: 'all',
    assigneeId: 'all',
  });
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);

  const getTickets = useCallback((): Ticket[] => {
    const { teamId, projectId } = options;

    if (teamId && projectId) {
      const team = state.teams.find(t => t.id === teamId);
      const project = team?.projects.find(p => p.id === projectId);
      return project?.tickets || [];
    }

    if (teamId) {
      const team = state.teams.find(t => t.id === teamId);
      return team?.projects.flatMap(p => p.tickets) || [];
    }

    return state.teams.flatMap(t => t.projects.flatMap(p => p.tickets));
  }, [state.teams, options]);

  const filteredTickets = useMemo(() => {
    let tickets = getTickets();

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      tickets = tickets.filter(
        t =>
          t.title.toLowerCase().includes(searchLower) ||
          t.description.toLowerCase().includes(searchLower) ||
          t.id.toLowerCase().includes(searchLower)
      );
    }

    if (filters.status !== 'all') {
      tickets = tickets.filter(t => t.status === filters.status);
    }

    if (filters.priority !== 'all') {
      tickets = tickets.filter(t => t.priority === filters.priority);
    }

    if (filters.assigneeId !== 'all') {
      tickets = tickets.filter(t => t.assignee.id === filters.assigneeId);
    }

    return tickets;
  }, [getTickets, filters]);

  const ticketsByStatus = useMemo(() => {
    const tickets = getTickets();
    return {
      'To Do': tickets.filter(t => t.status === 'To Do'),
      'In Progress': tickets.filter(t => t.status === 'In Progress'),
      'Review': tickets.filter(t => t.status === 'Review'),
      'Done': tickets.filter(t => t.status === 'Done'),
    };
  }, [getTickets]);

  const updateTicketStatus = useCallback(
    (ticketId: string, newStatus: TicketStatus) => {
      const { teamId, projectId } = options;
      if (!teamId || !projectId) return;

      // Optimistic update
      dispatch({
        type: 'UPDATE_TICKET_STATUS',
        payload: { teamId, projectId, ticketId, newStatus },
      });

      // Sync to backend
      api.updateTicketStatus(ticketId, newStatus).then(() => {
        if (projectId) queryClient.invalidateQueries({ queryKey: ['risk-analysis', projectId] });
      }).catch((err) => {
        import('sonner').then(({ toast }) => toast.error(`Status sync failed: ${err?.message || 'Unknown error'}`));
      });
    },
    [dispatch, options, queryClient]
  );

  const addTicket = useCallback(
    (ticket: Ticket) => {
      const { teamId, projectId } = options;
      if (!teamId || !projectId) return;

      // Optimistic update
      dispatch({
        type: 'ADD_TICKET',
        payload: { teamId, projectId, ticket },
      });

      // Sync to backend
      api.createTicket(projectId, ticket).then(() => {
        queryClient.invalidateQueries({ queryKey: ['risk-analysis', projectId] });
      }).catch((err) => {
        import('sonner').then(({ toast }) => toast.error(`Failed to create ticket: ${err?.message || 'Unknown error'}`));
      });
    },
    [dispatch, options, queryClient]
  );

  const updateTicket = useCallback(
    (ticket: Ticket) => {
      const { teamId, projectId } = options;
      if (!teamId || !projectId) return;

      // Optimistic update
      dispatch({
        type: 'UPDATE_TICKET',
        payload: { teamId, projectId, ticket },
      });

      // Sync to backend
      api.updateTicket(ticket.id, ticket).then(() => {
        if (projectId) queryClient.invalidateQueries({ queryKey: ['risk-analysis', projectId] });
      }).catch((err) => {
        import('sonner').then(({ toast }) => toast.error(`Failed to update ticket: ${err?.message || 'Unknown error'}`));
      });
    },
    [dispatch, options, queryClient]
  );

  const deleteTicket = useCallback(
    (ticketId: string) => {
      const { teamId, projectId } = options;
      if (!teamId || !projectId) return;

      // Optimistic update
      dispatch({
        type: 'DELETE_TICKET',
        payload: { teamId, projectId, ticketId },
      });

      // Sync to backend
      api.deleteTicket(ticketId).then(() => {
        if (projectId) queryClient.invalidateQueries({ queryKey: ['risk-analysis', projectId] });
      }).catch((err) => {
        import('sonner').then(({ toast }) => toast.error(`Failed to delete ticket: ${err?.message || 'Unknown error'}`));
      });
    },
    [dispatch, options, queryClient]
  );

  const toggleTicketSelection = useCallback((ticketId: string) => {
    setSelectedTickets(prev =>
      prev.includes(ticketId)
        ? prev.filter(id => id !== ticketId)
        : [...prev, ticketId]
    );
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedTickets([]);
  }, []);

  const getSelectedTicketsData = useCallback((): Ticket[] => {
    const tickets = getTickets();
    return selectedTickets.map(id => tickets.find(t => t.id === id)).filter(Boolean) as Ticket[];
  }, [getTickets, selectedTickets]);

  return {
    tickets: filteredTickets,
    allTickets: getTickets(),
    ticketsByStatus,
    filters,
    setFilters,
    updateTicketStatus,
    addTicket,
    updateTicket,
    deleteTicket,
    selectedTickets,
    toggleTicketSelection,
    clearSelection,
    getSelectedTicketsData,
  };
};
