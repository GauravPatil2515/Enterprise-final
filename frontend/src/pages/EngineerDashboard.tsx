/**
 * EngineerDashboard — Kanban-centric view for engineers.
 * Fetches data from the backend API rather than the TeamsContext.
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Code2,
  FolderKanban,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowUpRight,
  Loader2,
} from 'lucide-react';
import { api, type DashboardData } from '@/services/api';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import NarrativeCard from '@/components/NarrativeCard';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  'To Do': 'bg-slate-500',
  'In Progress': 'bg-blue-500',
  Review: 'bg-amber-500',
  Done: 'bg-green-500',
};

const priorityColors: Record<string, string> = {
  High: 'text-red-400',
  Medium: 'text-amber-400',
  Low: 'text-green-400',
};

const EngineerDashboard = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDashboardData('engineer')
      .then(setData)
      .catch((err) => {
        toast.error(err?.message || 'Failed to load engineer data');
      })
      .finally(() => setLoading(false));
  }, []);

  const projects = (data?.projects || []).map((p: any, idx: number) => ({
    ...p,
    teamId: p.team_id || p.teamId || `t${idx + 1}`,
    teamName: p.team || 'Unknown',
  }));
  const tickets = projects.flatMap((p: any) => p.tickets || []);
  const activeTickets = tickets.filter((t: any) => t.status !== 'Done');
  const myInProgress = tickets.filter((t: any) => t.status === 'In Progress');

  // Group tickets by status for mini-kanban
  const statusGroups = ['To Do', 'In Progress', 'Review', 'Done'] as const;
  const grouped = statusGroups.map((s) => ({
    status: s,
    tickets: tickets.filter((t: any) => t.status === s),
  }));

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0 },
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 skeleton rounded-xl" />
          ))}
        </div>
        <div className="h-48 skeleton rounded-xl" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 skeleton rounded-xl" />
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
      {/* Header */}
      <motion.div variants={itemVariants} className="relative overflow-hidden rounded-2xl border border-border bg-card px-8 py-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(20,184,166,0.08),transparent_60%)]" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center rounded-xl bg-teal-600 p-2.5 text-white shadow-lg shadow-teal-500/20">
              <Code2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h1 className="text-xl font-bold text-foreground">Engineer Dashboard</h1>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-teal-500/10 text-teal-600 ring-1 ring-teal-500/20">AI-POWERED</span>
              </div>
              <p className="text-sm text-muted-foreground">Your projects, tickets, and sprint performance at a glance</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-5">
            <div className="text-center">
              <p className="text-xl font-bold text-foreground">{activeTickets.length}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Active</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <p className="text-xl font-bold text-foreground">{myInProgress.length}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">In Progress</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <p className="text-xl font-bold text-teal-600">{tickets.length - activeTickets.length}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Completed</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Tickets', value: activeTickets.length, icon: <FolderKanban className="h-4 w-4" />, color: 'bg-teal-500/10 text-teal-600' },
          { label: 'In Progress', value: myInProgress.length, icon: <Clock className="h-4 w-4" />, color: 'bg-amber-500/10 text-amber-500' },
          { label: 'Completed', value: tickets.length - activeTickets.length, icon: <CheckCircle2 className="h-4 w-4" />, color: 'bg-emerald-500/10 text-emerald-600' },
          { label: 'High Priority', value: activeTickets.filter((t: any) => t.priority === 'High').length, icon: <AlertCircle className="h-4 w-4" />, color: 'bg-red-500/10 text-red-500' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border bg-card p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', stat.color)}>
                {stat.icon}
              </span>
            </div>
            <p className="text-xl font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </motion.div>

      {/* AI Narrative */}
      <motion.div variants={itemVariants}>
        <NarrativeCard role="engineer" />
      </motion.div>

      {/* Mini Kanban */}
      <motion.div variants={itemVariants}>
        <h2 className="text-lg font-semibold mb-3">Ticket Board</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {grouped.map((col) => (
            <div key={col.status} className="rounded-xl border bg-card/50 p-3 min-h-[200px]">
              <div className="flex items-center gap-2 mb-3">
                <span className={cn('h-2 w-2 rounded-full', statusColors[col.status])} />
                <span className="text-sm font-medium">{col.status}</span>
                <span className="text-xs text-muted-foreground ml-auto">{col.tickets.length}</span>
              </div>
              <div className="space-y-2">
                {col.tickets.slice(0, 5).map((tk: any) => (
                  <div key={tk.id} className="rounded-lg border bg-card p-2.5 text-sm">
                    <p className="font-medium truncate">{tk.title}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-muted-foreground">{tk.id}</span>
                      <span className={cn('text-xs font-medium', priorityColors[tk.priority])}>{tk.priority}</span>
                    </div>
                  </div>
                ))}
                {col.tickets.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center">+{col.tickets.length - 5} more</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Projects */}
      <motion.div variants={itemVariants}>
        <h2 className="text-lg font-semibold mb-3">Projects</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((proj: any) => (
            <Link
              key={proj.id}
              to={`/project/${proj.teamId}/${proj.id}`}
              className="rounded-xl border bg-card p-4 hover:border-primary/50 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">{proj.name}</h3>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <p className="text-xs text-muted-foreground mb-3 line-clamp-1">{proj.description}</p>
              <Progress value={proj.progress} className="h-1.5 mb-1" />
              <p className="text-xs text-muted-foreground">{proj.progress}% complete</p>
            </Link>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default EngineerDashboard;
