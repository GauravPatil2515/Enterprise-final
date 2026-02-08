import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Shield,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  UserCog,
  GitGraph,
  MessageCircle,
  Cpu,
  FlaskConical,
  Link as LinkIcon,
  BarChart,
  Palette,
  Globe,
  Image,
  Coins,
  type LucideIcon,
} from 'lucide-react';
import { useTeams } from '@/context/TeamsContext';
import { useRole } from '@/context/RoleContext';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const projectIconMap: Record<string, LucideIcon> = {
  'Link': LinkIcon,
  'BarChart': BarChart,
  'Palette': Palette,
  'Globe': Globe,
  'Image': Image,
  'Coins': Coins,
};

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const location = useLocation();
  const { state, dispatch } = useTeams();
  const { currentRole } = useRole();
  const [expandedTeams, setExpandedTeams] = useState<string[]>([state.teams[0]?.id || '']);

  const toggleTeam = (teamId: string) => {
    setExpandedTeams((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId],
    );
  };

  const handleTeamSelect = (teamId: string) => {
    dispatch({ type: 'SELECT_TEAM', payload: teamId });
    if (!expandedTeams.includes(teamId)) {
      setExpandedTeams((prev) => [...prev, teamId]);
    }
  };

  const handleProjectSelect = (teamId: string, projectId: string) => {
    dispatch({ type: 'SELECT_TEAM', payload: teamId });
    dispatch({ type: 'SELECT_PROJECT', payload: projectId });
  };

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: UserCog, label: 'Role Dashboard', path: '/role-dashboard' },
    { icon: Users, label: 'Teams', path: '/teams' },
    { icon: FolderKanban, label: 'All Projects', path: '/projects' },
  ];

  const allAiItems = [
    { icon: MessageCircle, label: 'AI Co-Pilot', path: '/chat', accent: true },
    { icon: FlaskConical, label: 'Team Simulator', path: '/simulator', restrictedFor: ['engineer'] },
    { icon: GitGraph, label: 'Knowledge Graph', path: '/graph', restrictedFor: ['engineer'] },
    { icon: Cpu, label: 'Hiring Optimizer', path: '/hiring-optimizer', restrictedFor: ['engineer', 'finance', 'chairperson'] },
  ];

  // Filter AI items based on current role
  const aiItems = allAiItems.filter(item => {
    if (!item.restrictedFor) return true;
    return !item.restrictedFor.includes(currentRole || '');
  });

  const sidebarContent = (
    <div className="flex h-full flex-col bg-sidebar">
      {/* Logo */}
      <div className="flex h-14 items-center gap-3 border-b border-sidebar-border px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
          <Cpu className="h-4.5 w-4.5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-bold text-sidebar-foreground tracking-tight">DeliverIQ</span>
          <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Decision Intelligence</p>
        </div>
        <button
          onClick={onClose}
          className="ml-auto md:hidden text-muted-foreground hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 scrollbar-thin">
        {/* Main nav */}
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* AI Section */}
        <div className="mt-5">
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            AI Intelligence
          </p>
          <div className="space-y-0.5">
            {aiItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/15 text-primary'
                      : item.accent
                        ? 'text-primary/80 hover:bg-primary/10 hover:text-primary'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                  {item.accent && (
                    <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/20 text-primary">
                      AI
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Teams Section */}
        <div className="mt-5">
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            Teams & Projects
          </p>

          <div className="space-y-0.5">
            {state.teams.map((team) => {
              const isExpanded = expandedTeams.includes(team.id);
              const isSelected = state.selectedTeamId === team.id;

              return (
                <div key={team.id}>
                  <button
                    onClick={() => {
                      toggleTeam(team.id);
                      handleTeamSelect(team.id);
                    }}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isSelected
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50',
                    )}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <div
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: team.color }}
                    />
                    <span className="truncate">{team.name}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      {team.projects.length}
                    </span>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="ml-3 overflow-hidden"
                      >
                        {team.projects.map((project) => {
                          const isProjectActive = state.selectedProjectId === project.id;

                          return (
                            <div key={project.id} className="flex items-center gap-0.5">
                              <Link
                                to={`/project/${team.id}/${project.id}`}
                                onClick={() => {
                                  handleProjectSelect(team.id, project.id);
                                  onClose();
                                }}
                                className={cn(
                                  'flex-1 flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors',
                                  isProjectActive
                                    ? 'bg-primary/10 text-primary font-medium'
                                    : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground',
                                )}
                              >
                                {(() => { const Ic = projectIconMap[project.icon] || Globe; return <Ic className="h-3.5 w-3.5" />; })()}
                                <span className="truncate text-xs">{project.name}</span>
                              </Link>
                              <Link
                                to={`/project/${team.id}/${project.id}/risk`}
                                onClick={onClose}
                                className="p-1 rounded-md text-muted-foreground/50 hover:text-orange-500 hover:bg-orange-500/10 transition-colors"
                                title="Risk Analysis"
                              >
                                <Shield className="h-3 w-3" />
                              </Link>
                            </div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Bottom */}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2 px-3 py-2 text-[10px] text-muted-foreground/50">
          <Cpu className="h-3 w-3" />
          Graph → Agents → LLM → Human
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:z-30 md:flex md:w-64 md:flex-col">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
              onClick={onClose}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 w-64 md:hidden"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export const SidebarTrigger = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground md:hidden"
  >
    <Menu className="h-5 w-5" />
  </button>
);
