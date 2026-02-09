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
  Network,
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
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-3 px-6 border-b border-sidebar-border/50 shadow-sm bg-sidebar/50 backdrop-blur-sm">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-sm ring-1 ring-white/10">
          <Cpu className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="block text-sm font-bold tracking-tight text-white antialiased">
            DeliverIQ
          </span>
          <span className="block text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
            Enterprise
          </span>
        </div>
        <button
          onClick={onClose}
          className="ml-auto md:hidden text-muted-foreground hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation Scroll Area */}
      <nav className="flex-1 overflow-y-auto py-6 px-3 scrollbar-thin space-y-8">

        {/* Main Navigation */}
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={cn(
                  'group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 relative overflow-hidden',
                  isActive
                    ? 'bg-sidebar-accent text-white shadow-sm'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-white'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-nav-indicator"
                    className="absolute left-0 top-0 bottom-0 w-1 bg-primary"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  />
                )}
                <item.icon className={cn("h-4 w-4 transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-white")} />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* AI Suite */}
        <div>
          <h3 className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
            Intelligence Suite
          </h3>
          <div className="space-y-1">
            {aiItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={cn(
                    'group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 border border-transparent',
                    isActive
                      ? 'bg-primary/10 text-primary border-primary/20'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-white'
                  )}
                >
                  <item.icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary")} />
                  {item.label}
                  {item.accent && (
                    <span className="ml-auto flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
                      </span>
                      AI
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Teams & Projects Tree */}
        <div>
          <h3 className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
            Teams & Projects
          </h3>
          <div className="space-y-1">
            {state.teams.map((team) => {
              const isExpanded = expandedTeams.includes(team.id);
              const isSelected = state.selectedTeamId === team.id;

              return (
                <div key={team.id} className="relative">
                  <button
                    onClick={() => {
                      toggleTeam(team.id);
                      handleTeamSelect(team.id);
                    }}
                    className={cn(
                      'w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent/50 group',
                      isSelected ? 'text-white' : 'text-sidebar-foreground/80'
                    )}
                  >
                    <div className={cn(
                      "transition-transform duration-200 text-muted-foreground group-hover:text-white",
                      isExpanded ? "rotate-90" : ""
                    )}>
                      <ChevronRight className="h-4 w-4" />
                    </div>

                    <div
                      className={cn("h-2 w-2 rounded-full shrink-0 ring-2 ring-sidebar-accent transition-all", isSelected ? "ring-white" : "")}
                      style={{ backgroundColor: team.color }}
                    />

                    <span className="truncate">{team.name}</span>
                    <span className="ml-auto text-[10px] bg-sidebar-accent text-muted-foreground px-1.5 py-0.5 rounded-md min-w-[1.25rem] text-center">
                      {team.projects.length}
                    </span>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="relative ml-4 pl-4 border-l border-sidebar-border/60 my-1 space-y-0.5">
                          {team.projects.map((project) => {
                            const isProjectActive = state.selectedProjectId === project.id;
                            const ProjectIcon = projectIconMap[project.icon] || Globe;

                            return (
                              <div key={project.id} className="relative group/project">
                                <Link
                                  to={`/project/${team.id}/${project.id}`}
                                  onClick={() => {
                                    handleProjectSelect(team.id, project.id);
                                    onClose();
                                  }}
                                  className={cn(
                                    'flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-all duration-200',
                                    isProjectActive
                                      ? 'text-primary bg-primary/5 font-medium translate-x-1'
                                      : 'text-muted-foreground hover:text-white hover:bg-sidebar-accent/30'
                                  )}
                                >
                                  <ProjectIcon className={cn("h-3.5 w-3.5", isProjectActive ? "text-primary" : "text-muted-foreground/70")} />
                                  <span className="truncate text-[13px]">{project.name}</span>
                                </Link>

                                {/* Quick Actions on Hover */}
                                <Link
                                  to={`/project/${team.id}/${project.id}/risk`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onClose();
                                  }}
                                  className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/project:opacity-100 p-1 rounded-md text-muted-foreground hover:text-orange-400 hover:bg-orange-400/10 transition-all"
                                  title="Risk Analysis"
                                >
                                  <Shield className="h-3 w-3" />
                                </Link>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Footer / User Profile */}
      <div className="border-t border-sidebar-border p-4 bg-sidebar-accent/20">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold ring-2 ring-sidebar-border">
            AL
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">Admin User</p>
            <p className="text-[10px] text-muted-foreground truncate">admin@deliveriq.com</p>
          </div>
          <button className="text-muted-foreground hover:text-white transition-colors">
            <UserCog className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:z-30 md:flex md:w-64 md:flex-col border-r border-sidebar-border shadow-xl">
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
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
              onClick={onClose}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 w-72 md:hidden shadow-2xl border-r border-sidebar-border"
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
    className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground md:hidden transition-colors"
  >
    <Menu className="h-5 w-5" />
  </button>
);
