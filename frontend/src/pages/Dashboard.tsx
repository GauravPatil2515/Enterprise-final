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
      <motion.div variants={itemVariants} className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Decision Intelligence
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            AI-powered delivery insights across {stats.totalProjects} projects
          </p>
        </div>
      </motion.div>

      {/* ─── Quick Actions: AI-first feature discovery ─── */}
      <motion.div variants={itemVariants} className="grid gap-3 sm:grid-cols-3">
        <Link
          to="/chat"
          className="group relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 p-5 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 shrink-0">
              <MessageCircle className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm">AI Co-Pilot</h3>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/20 text-primary">LIVE</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Ask "Which tickets are blocking delivery?" — powered by real Neo4j data
              </p>
            </div>
          </div>
          <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
        </Link>

        <Link
          to="/graph"
          className="group relative overflow-hidden rounded-xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/5 via-transparent to-indigo-500/10 p-5 transition-all hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/5"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/15 shrink-0">
              <GitGraph className="h-5 w-5 text-indigo-400" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm">Knowledge Graph</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Explore dependencies, blockers, and cross-team coupling in the graph
              </p>
            </div>
          </div>
          <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30 group-hover:text-indigo-400 transition-colors" />
        </Link>

        <Link
          to="/role-dashboard"
          className="group relative overflow-hidden rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-transparent to-emerald-500/10 p-5 transition-all hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/5"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 shrink-0">
              <Brain className="h-5 w-5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm">Role Insights</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Tailored dashboards for Engineering, HR, Finance & Leadership
              </p>
            </div>
          </div>
          <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30 group-hover:text-emerald-400 transition-colors" />
        </Link>
      </motion.div>

      {/* ─── Stats Grid ─── */}
      <motion.div
        variants={itemVariants}
        className="grid gap-3 grid-cols-2 lg:grid-cols-4"
      >
        <StatCard icon={FolderKanban} label="Projects" value={stats.totalProjects} sub={`${stats.openTickets} open tickets`} color="primary" />
        <StatCard icon={Clock} label="In Progress" value={stats.inProgress} sub={`${stats.totalTickets} total tickets`} color="warning" />
        <StatCard icon={CheckCircle2} label="Completed" value={stats.completedTickets} sub={`${stats.totalTickets > 0 ? Math.round((stats.completedTickets / stats.totalTickets) * 100) : 0}% completion`} color="success" />
        <StatCard icon={AlertCircle} label="High Priority" value={stats.highPriority} sub="Needs attention" color="destructive" />
      </motion.div>

      {/* ─── Main Content ─── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Projects */}
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Active Projects</h2>
            <Link
              to="/projects"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
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
                    className="group rounded-xl border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        {(() => {
                          const IconComp = iconMap[project.icon] || Globe;
                          return <IconComp className="h-5 w-5 text-primary" />;
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
                        className="p-1.5 rounded-md text-muted-foreground/50 hover:text-orange-500 hover:bg-orange-500/10 transition-colors"
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
                      <span className="text-[11px] text-muted-foreground">{project.tickets.length} tickets</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-1" />
                    </div>
                  </Link>
                );
              })}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div variants={itemVariants} className="space-y-3">
          <h2 className="text-base font-semibold">Recent Tickets</h2>
          <div className="rounded-xl border bg-card divide-y divide-border">
            {recentTickets.map((ticket) => (
              <div
                key={ticket.id}
                className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
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
                    'h-2 w-2 rounded-full shrink-0',
                    ticket.priority === 'High'
                      ? 'bg-red-500'
                      : ticket.priority === 'Medium'
                        ? 'bg-amber-500'
                        : 'bg-green-500',
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
          <h2 className="text-base font-semibold">Teams</h2>
          <Link to="/teams" className="flex items-center gap-1 text-xs text-primary hover:underline">
            View all <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {state.teams.map((team) => {
            const totalTickets = team.projects.flatMap((p) => p.tickets).length;
            const completedTickets = team.projects.flatMap((p) => p.tickets).filter((t) => t.status === 'Done').length;

            return (
              <Link
                key={team.id}
                to="/teams"
                className="group rounded-xl border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-sm"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-white text-xs font-bold"
                    style={{ backgroundColor: team.color }}
                  >
                    {team.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold group-hover:text-primary transition-colors">
                      {team.name}
                    </h3>
                    <p className="text-[11px] text-muted-foreground">{team.projects.length} projects</p>
                  </div>
                </div>

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
                  <span className="text-[11px] text-muted-foreground">
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
}

const StatCard = ({ icon: Icon, label, value, sub, color }: StatCardProps) => {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-emerald-500/10 text-emerald-500',
    warning: 'bg-amber-500/10 text-amber-500',
    destructive: 'bg-red-500/10 text-red-500',
  };

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', colorClasses[color])}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-[10px] text-muted-foreground/60 mt-0.5">{sub}</p>
    </div>
  );
};

export default Dashboard;
