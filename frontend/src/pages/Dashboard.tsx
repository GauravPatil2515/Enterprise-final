import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  FolderKanban,
  Users,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  Shield,
  MessageCircle,
  GitGraph,
  Brain,
  Sparkles,
  Zap,
  ChevronRight,
  Link as LinkIcon,
  BarChart,
  Palette,
  Globe,
  Image,
  Coins,
  Activity,
  Layers,
  Target,
  type LucideIcon,
} from 'lucide-react';
import { useTeams } from '@/context/TeamsContext';
import { SkeletonProjectCard } from '@/components/SkeletonLoaders';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

const iconMap: Record<string, LucideIcon> = {
  'Link': LinkIcon,
  'BarChart': BarChart,
  'Palette': Palette,
  'Globe': Globe,
  'Image': Image,
  'Coins': Coins,
};

const Dashboard = () => {
  const { state, getAllProjects, getAllTickets } = useTeams();
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const allProjects = getAllProjects();
  const allTickets = getAllTickets();

  const stats = {
    totalProjects: allProjects.length,
    totalTickets: allTickets.length,
    openTickets: allTickets.filter((t) => t.status !== 'Done').length,
    completedTickets: allTickets.filter((t) => t.status === 'Done').length,
    highPriority: allTickets.filter((t) => t.priority === 'High' && t.status !== 'Done').length,
    inProgress: allTickets.filter((t) => t.status === 'In Progress').length,
  };

  const recentTickets = allTickets
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0 },
  };

  if (state.loading || loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 skeleton rounded-xl" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <SkeletonProjectCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Hero Header */}
      <motion.div variants={itemVariants} className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-8 py-7">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(124,58,237,0.12),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(59,130,246,0.08),transparent_60%)]" />
        <div className="relative flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-medium tracking-wider uppercase text-emerald-400/80">System Online</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Decision Intelligence
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-md">
              Real-time delivery intelligence across {stats.totalProjects} active projects
              with {stats.totalTickets} tracked work items.
            </p>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{stats.totalTickets > 0 ? Math.round((stats.completedTickets / stats.totalTickets) * 100) : 0}%</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Completion</p>
            </div>
            <div className="w-px h-10 bg-slate-700" />
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{stats.inProgress}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">In Progress</p>
            </div>
            <div className="w-px h-10 bg-slate-700" />
            <div className="text-center">
              <p className={cn("text-2xl font-bold", stats.highPriority > 0 ? "text-red-400" : "text-emerald-400")}>{stats.highPriority}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">High Priority</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick Actions: AI-first feature discovery */}
      <motion.div variants={itemVariants} className="grid gap-3 sm:grid-cols-3">
        <Link
          to="/chat"
          className="group relative overflow-hidden rounded-xl border border-border/40 bg-card p-5 transition-all hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-500/5"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex items-start gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10 shrink-0 ring-1 ring-violet-500/20">
              <MessageCircle className="h-5 w-5 text-violet-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm">AI Co-Pilot</h3>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 ring-1 ring-emerald-500/20">LIVE</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Ask about risks, blockers, and decisions with graph-powered context
              </p>
            </div>
          </div>
          <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/20 group-hover:text-violet-400 transition-colors" />
        </Link>

        <Link
          to="/graph"
          className="group relative overflow-hidden rounded-xl border border-border/40 bg-card p-5 transition-all hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex items-start gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 shrink-0 ring-1 ring-blue-500/20">
              <GitGraph className="h-5 w-5 text-blue-400" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm">Knowledge Graph</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                3D neural visualization of dependencies and cross-team coupling
              </p>
            </div>
          </div>
          <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/20 group-hover:text-blue-400 transition-colors" />
        </Link>

        <Link
          to="/role-dashboard"
          className="group relative overflow-hidden rounded-xl border border-border/40 bg-card p-5 transition-all hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex items-start gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 shrink-0 ring-1 ring-emerald-500/20">
              <Brain className="h-5 w-5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm">Role Insights</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Tailored dashboards for Engineering, HR, Finance and Leadership
              </p>
            </div>
          </div>
          <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/20 group-hover:text-emerald-400 transition-colors" />
        </Link>
      </motion.div>

      {/* ─── Stats Grid ─── */}
      <motion.div
        variants={itemVariants}
        className="grid gap-3 grid-cols-2 lg:grid-cols-4"
      >
        <StatCard icon={FolderKanban} label="Projects" value={stats.totalProjects} sub={`${stats.openTickets} open tickets`} color="primary" accent="from-blue-500/10 to-indigo-500/5" />
        <StatCard icon={Clock} label="In Progress" value={stats.inProgress} sub={`${stats.totalTickets} total tickets`} color="warning" accent="from-amber-500/10 to-orange-500/5" />
        <StatCard icon={CheckCircle2} label="Completed" value={stats.completedTickets} sub={`${stats.totalTickets > 0 ? Math.round((stats.completedTickets / stats.totalTickets) * 100) : 0}% completion`} color="success" accent="from-emerald-500/10 to-green-500/5" />
        <StatCard icon={AlertCircle} label="High Priority" value={stats.highPriority} sub="Needs attention" color="destructive" accent="from-red-500/10 to-rose-500/5" />
      </motion.div>

      {/* ─── Main Content ─── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Projects */}
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              Active Projects
            </h2>
            <Link
              to="/projects"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {allProjects
              .filter((p) => p.status === 'Ongoing')
              .slice(0, 4)
              .map((project) => {
                const team = state.teams.find((t) => t.projects.some((p) => p.id === project.id));
                const doneCount = project.tickets.filter((t) => t.status === 'Done').length;
                const progress = project.tickets.length
                  ? Math.round((doneCount / project.tickets.length) * 100)
                  : 0;

                return (
                  <Link
                    key={project.id}
                    to={`/project/${team?.id}/${project.id}`}
                    className="group relative overflow-hidden rounded-xl border border-border/40 bg-card p-4 transition-all hover:border-border hover:shadow-md"
                  >
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        {(() => {
                          const IconComp = iconMap[project.icon] || Globe;
                          return (
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/10">
                              <IconComp className="h-4 w-4 text-primary" />
                            </div>
                          );
                        })()}
                        <div>
                          <h3 className="text-sm font-semibold group-hover:text-primary transition-colors">
                            {project.name}
                          </h3>
                          <p className="text-[11px] text-muted-foreground">{team?.name}</p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          navigate(`/project/${team?.id}/${project.id}/risk`);
                        }}
                        className="p-1.5 rounded-md text-muted-foreground/40 hover:text-orange-500 hover:bg-orange-500/10 transition-colors"
                        title="AI Risk Analysis"
                      >
                        <Shield className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-1 mb-3">
                      {project.description}
                    </p>

                    <div className="flex items-center justify-between mb-2">
                      <div className="flex -space-x-1.5">
                        {project.tickets
                          .map((t) => t.assignee)
                          .filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i)
                          .slice(0, 3)
                          .map((member) => (
                            <Avatar key={member.id} className="h-6 w-6 border-2 border-card">
                              <AvatarImage src={member.avatar} />
                              <AvatarFallback className="text-[9px]">{member.name.slice(0, 2)}</AvatarFallback>
                            </Avatar>
                          ))}
                      </div>
                      <span className="text-[10px] text-muted-foreground font-medium">{project.tickets.length} tickets</span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">Progress</span>
                        <span className={cn("font-semibold", progress >= 80 ? "text-emerald-500" : progress >= 50 ? "text-amber-500" : "text-muted-foreground")}>{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-1.5" />
                    </div>
                  </Link>
                );
              })}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div variants={itemVariants} className="space-y-3">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            Recent Tickets
          </h2>
          <div className="rounded-xl border border-border/40 bg-card divide-y divide-border/40">
            {recentTickets.map((ticket) => (
              <div
                key={ticket.id}
                className="flex items-center gap-3 p-3.5 hover:bg-muted/30 transition-colors"
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage src={ticket.assignee.avatar} />
                  <AvatarFallback className="text-[9px]">{ticket.assignee.name.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{ticket.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {ticket.id} · {ticket.status}
                  </p>
                </div>
                <span
                  className={cn(
                    'h-2 w-2 rounded-full shrink-0 ring-2',
                    ticket.priority === 'High'
                      ? 'bg-red-500 ring-red-500/20'
                      : ticket.priority === 'Medium'
                        ? 'bg-amber-500 ring-amber-500/20'
                        : 'bg-emerald-500 ring-emerald-500/20',
                  )}
                />
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ─── Teams Overview ─── */}
      <motion.div variants={itemVariants} className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            Teams
          </h2>
          <Link to="/teams" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            View all <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {state.teams.map((team) => {
            const totalTickets = team.projects.flatMap((p) => p.tickets).length;
            const completedTickets = team.projects.flatMap((p) => p.tickets).filter((t) => t.status === 'Done').length;
            const teamProgress = totalTickets > 0 ? Math.round((completedTickets / totalTickets) * 100) : 0;

            return (
              <Link
                key={team.id}
                to="/teams"
                className="group relative overflow-hidden rounded-xl border border-border/40 bg-card p-4 transition-all hover:border-border hover:shadow-md"
              >
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-white text-xs font-bold ring-2 ring-white/10"
                    style={{ backgroundColor: team.color }}
                  >
                    {team.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold group-hover:text-primary transition-colors truncate">
                      {team.name}
                    </h3>
                    <p className="text-[11px] text-muted-foreground">{team.projects.length} projects</p>
                  </div>
                  <span className={cn("text-xs font-semibold", teamProgress >= 80 ? "text-emerald-500" : teamProgress >= 50 ? "text-amber-500" : "text-muted-foreground")}>{teamProgress}%</span>
                </div>

                <Progress value={teamProgress} className="h-1 mb-3" />

                <div className="flex items-center justify-between">
                  <div className="flex -space-x-1.5">
                    {team.members.slice(0, 4).map((member) => (
                      <Avatar key={member.id} className="h-6 w-6 border-2 border-card">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback className="text-[9px]">{member.name.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                    ))}
                    {team.members.length > 4 && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-card bg-muted text-[9px] font-medium">
                        +{team.members.length - 4}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {completedTickets}/{totalTickets} done
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Stat Card ──────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: number;
  sub: string;
  color: 'primary' | 'success' | 'warning' | 'destructive';
  accent: string;
}

const StatCard = ({ icon: Icon, label, value, sub, color, accent }: StatCardProps) => {
  const colorClasses = {
    primary: 'bg-blue-500/10 text-blue-500 ring-1 ring-blue-500/20',
    success: 'bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20',
    destructive: 'bg-red-500/10 text-red-500 ring-1 ring-red-500/20',
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/40 bg-card p-4">
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-40", accent)} />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', colorClasses[color])}>
            <Icon className="h-4 w-4" />
          </span>
        </div>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        <p className="text-xs font-medium text-foreground/80 mt-0.5">{label}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
      </div>
    </div>
  );
};

export default Dashboard;
