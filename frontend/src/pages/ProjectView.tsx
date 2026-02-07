import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  ArrowLeft,
  Filter,
  GitCompare,
  Plus,
  Search,
  Shield,
  SlidersHorizontal,
  Link as LinkIcon,
  BarChart,
  Palette,
  Globe,
  Image,
  Coins,
  LucideIcon
} from 'lucide-react';
import { useTeams } from '@/context/TeamsContext';
import { useTickets } from '@/hooks/useTickets';
import { useDragDrop } from '@/hooks/useDragDrop';
import { KanbanColumn } from '@/components/KanbanColumn';
import { TicketCard } from '@/components/TicketCard';
import { TicketModal } from '@/components/TicketModal';
import { ComparisonTable } from '@/components/ComparisonTable';
import { SkeletonKanbanColumn } from '@/components/SkeletonLoaders';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Ticket, TicketStatus } from '@/utils/mockData';
import { cn } from '@/lib/utils';

const iconMap: Record<string, LucideIcon> = {
  'Link': LinkIcon,
  'BarChart': BarChart,
  'Palette': Palette,
  'Globe': Globe,
  'Image': Image,
  'Coins': Coins,
};

const ProjectView = () => {
  const { teamId, projectId } = useParams<{ teamId: string; projectId: string }>();
  const { state } = useTeams();
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit' | 'view';
    ticket?: Ticket;
    initialStatus?: TicketStatus;
  }>({ isOpen: false, mode: 'create' });
  const [showComparison, setShowComparison] = useState(false);

  const {
    ticketsByStatus,
    filters,
    setFilters,
    updateTicketStatus,
    addTicket,
    updateTicket,
    selectedTickets,
    toggleTicketSelection,
    clearSelection,
    getSelectedTicketsData,
  } = useTickets({ teamId, projectId });

  const { activeId, handleDragStart, handleDragOver, handleDragEnd, handleDragCancel } =
    useDragDrop({
      onTicketMove: updateTicketStatus,
    });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, [projectId]);

  const team = state.teams.find((t) => t.id === teamId);
  const project = team?.projects.find((p) => p.id === projectId);

  if (!team || !project) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Project not found</h2>
          <Link to="/dashboard" className="text-primary hover:underline">
            Go back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const allTickets = Object.values(ticketsByStatus).flat();
  const activeTicket = activeId
    ? allTickets.find((t) => t.id === activeId)
    : null;

  const doneCount = ticketsByStatus['Done'].length;
  const progress = allTickets.length
    ? Math.round((doneCount / allTickets.length) * 100)
    : 0;

  const handleAddTicket = (status: TicketStatus) => {
    setModalState({ isOpen: true, mode: 'create', initialStatus: status });
  };

  const handleTicketClick = (ticket: Ticket) => {
    setModalState({ isOpen: true, mode: 'view', ticket });
  };

  const handleSaveTicket = (ticket: Ticket) => {
    if (modalState.mode === 'create') {
      addTicket(ticket);
    } else {
      updateTicket(ticket);
    }
  };

  const handleCompare = () => {
    if (selectedTickets.length >= 2) {
      setShowComparison(true);
    }
  };

  const statuses: TicketStatus[] = ['To Do', 'In Progress', 'Review', 'Done'];

  const ProjectIcon = iconMap[project.icon] || Globe;

  return (
    <div className="space-y-6 h-[calc(100vh-2rem)] flex flex-col">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between shrink-0"
      >
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
            <Link to="/dashboard" className="hover:text-foreground transition-colors flex items-center gap-1">
              Dashboard
            </Link>
            <span className="text-border">/</span>
            <Link to="/teams" className="hover:text-foreground transition-colors">
              {team.name}
            </Link>
            <span className="text-border">/</span>
            <span className="text-foreground">{project.name}</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors -ml-1.5"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <ProjectIcon className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{project.name}</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-sm text-muted-foreground">
                    {project.description}
                  </p>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[10px] font-medium border',
                      project.status === 'Ongoing'
                        ? 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/50'
                        : project.status === 'Completed'
                          ? 'bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/50'
                          : 'bg-slate-50 text-slate-700 border-slate-100 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-800'
                    )}
                  >
                    {project.status}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 min-w-[200px]">
          <div className="flex items-center justify-between w-full text-xs">
            <span className="text-muted-foreground font-medium">Progress</span>
            <span className="font-semibold text-foreground">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2 w-full" />
          <span className="text-xs text-muted-foreground">
            {doneCount} of {allTickets.length} tasks completed
          </span>
        </div>
      </motion.div>

      {/* Toolbar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shrink-0"
      >
        <div className="flex flex-1 flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Filter tickets..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="pl-9 h-9 bg-background"
            />
          </div>

          {/* Filters */}
          <Select
            value={filters.priority}
            onValueChange={(value) =>
              setFilters({ ...filters, priority: value as any })
            }
          >
            <SelectTrigger className="w-[130px] h-9 bg-background">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          {selectedTickets.length >= 2 && (
            <Button variant="outline" size="sm" onClick={handleCompare} className="h-9">
              <GitCompare className="mr-2 h-4 w-4" />
              Compare ({selectedTickets.length})
            </Button>
          )}
          {selectedTickets.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearSelection} className="h-9 text-muted-foreground hover:text-foreground">
              Clear selection
            </Button>
          )}
          <Button onClick={() => handleAddTicket('To Do')} size="sm" className="h-9">
            <Plus className="mr-2 h-4 w-4" />
            Create Issue
          </Button>
          <Link to={`/project/${teamId}/${projectId}/risk`}>
            <Button variant="outline" size="sm" className="h-9 border-primary/30 text-primary hover:bg-primary/10">
              <Shield className="mr-2 h-4 w-4" />
              Analyze Risk
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Kanban Board */}
      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 h-full">
          {statuses.map((status) => (
            <SkeletonKanbanColumn key={status} />
          ))}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 overflow-x-auto pb-4 h-full"
          >
            {statuses.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                tickets={ticketsByStatus[status]}
                selectedTickets={selectedTickets}
                onTicketSelect={toggleTicketSelection}
                onTicketClick={handleTicketClick}
                onAddTicket={handleAddTicket}
              />
            ))}
          </motion.div>

          <DragOverlay>
            {activeTicket && <TicketCard ticket={activeTicket} isDragging />}
          </DragOverlay>
        </DndContext>
      )}

      {/* Ticket Modal */}
      <AnimatePresence>
        {modalState.isOpen && (
          <TicketModal
            ticket={modalState.ticket}
            initialStatus={modalState.initialStatus}
            mode={modalState.mode}
            onClose={() => setModalState({ isOpen: false, mode: 'create' })}
            onSave={handleSaveTicket}
          />
        )}
      </AnimatePresence>

      {/* Comparison Table */}
      <AnimatePresence>
        {showComparison && (
          <ComparisonTable
            tickets={getSelectedTicketsData()}
            onClose={() => {
              setShowComparison(false);
              clearSelection();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProjectView;
