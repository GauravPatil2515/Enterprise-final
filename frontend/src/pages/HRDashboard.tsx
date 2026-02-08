/**
 * HRDashboard — Team workload, burnout risk & member overview for HR managers.
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  AlertTriangle,
  TrendingUp,
  UserCheck,
  Briefcase,
  Flame,
  ArrowRightLeft,
  ShieldAlert,
} from 'lucide-react';
import { api, type DashboardData } from '@/services/api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import NarrativeCard from '@/components/NarrativeCard';
import { Button } from '@/components/ui/button';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  Cell,
} from 'recharts';

const BURNOUT_THRESHOLD = 4; // tickets before burnout warning
const OVERLOAD_THRESHOLD = 3;

const HRDashboard = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDashboardData('hr')
      .then(setData)
      .catch((err) => {
        import('sonner').then(({ toast }) => toast.error(err?.message || 'Failed to load HR data'));
      })
      .finally(() => setLoading(false));
  }, []);

  const members = data?.members || [];
  const maxTickets = Math.max(...members.map((m: any) => m.active_tickets || 0), 1);
  const overloaded = members.filter((m: any) => m.active_tickets >= OVERLOAD_THRESHOLD);
  const burnoutRisk = members.filter((m: any) => m.active_tickets >= BURNOUT_THRESHOLD);
  const idle = members.filter((m: any) => m.active_tickets === 0);

  // Calculate reassignment suggestions: move from burnout to idle
  const reassignments = burnoutRisk.slice(0, 3).map((overM: any) => {
    const target = idle[0] || members.find((m: any) => m.active_tickets <= 1 && m.id !== overM.id);
    return { from: overM, to: target };
  }).filter((r) => r.to);

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
        <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 skeleton rounded-xl" />
          ))}
        </div>
        <div className="h-48 skeleton rounded-xl" />
        <div className="h-64 skeleton rounded-xl" />
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
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-green-700 p-2.5 text-white shadow">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">HR Dashboard</h1>
            <p className="text-sm text-muted-foreground">Team workload, burnout risk & member overview</p>
          </div>
        </div>
        <Button 
          onClick={() => window.location.href = '/hiring-optimizer'}
          className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
        >
          <TrendingUp className="h-4 w-4 mr-2" />
          Hiring Optimizer
        </Button>
      </motion.div>


      {(
        <>
          {/* Stats */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Total Members', value: members.length, icon: <Users className="h-4 w-4" />, color: 'bg-blue-500/10 text-blue-400' },
              { label: 'Active Workers', value: members.length - idle.length, icon: <UserCheck className="h-4 w-4" />, color: 'bg-green-500/10 text-green-400' },
              { label: 'Overloaded (3+)', value: overloaded.length, icon: <AlertTriangle className="h-4 w-4" />, color: 'bg-red-500/10 text-red-400' },
              { label: 'Burnout Risk', value: burnoutRisk.length, icon: <Flame className="h-4 w-4" />, color: 'bg-orange-500/10 text-orange-400' },
              { label: 'Idle / Under-utilized', value: idle.length, icon: <Briefcase className="h-4 w-4" />, color: 'bg-amber-500/10 text-amber-400' },
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

          {/* Burnout Risk Alert */}
          {burnoutRisk.length > 0 && (
            <motion.div variants={itemVariants}>
              <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Flame className="h-5 w-5 text-orange-400" />
                  <h2 className="text-base font-semibold text-orange-400">Burnout Risk Alert</h2>
                  <span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full ml-2">
                    {burnoutRisk.length} member{burnoutRisk.length > 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Members with {BURNOUT_THRESHOLD}+ active tickets are at elevated burnout risk. Consider redistributing work.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {burnoutRisk.map((member: any) => (
                    <div key={`burnout-${member.id}`} className="flex items-center gap-3 rounded-lg border border-orange-500/20 bg-card p-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback>{member.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{member.name}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{member.team}</span>
                          <span className="text-xs font-bold text-orange-400">{member.active_tickets} tickets</span>
                        </div>
                      </div>
                      <ShieldAlert className="h-4 w-4 text-orange-400 shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Reassignment Suggestions */}
          {reassignments.length > 0 && (
            <motion.div variants={itemVariants}>
              <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <ArrowRightLeft className="h-5 w-5 text-blue-400" />
                  <h2 className="text-base font-semibold text-blue-400">Suggested Reassignments</h2>
                </div>
                <div className="space-y-2">
                  {reassignments.map((r, i) => (
                    <div key={`reassign-${r.from.id}-${r.to.id}`} className="flex items-center gap-3 rounded-lg border bg-card p-3 text-sm">
                      <span className="font-medium text-orange-400">{r.from.name}</span>
                      <span className="text-xs text-muted-foreground">({r.from.active_tickets} tickets)</span>
                      <ArrowRightLeft className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="font-medium text-green-400">{r.to.name}</span>
                      <span className="text-xs text-muted-foreground">({r.to.active_tickets} tickets)</span>
                      <Button size="sm" variant="outline" className="ml-auto h-7 text-xs" disabled>
                        Suggest
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* AI Narrative */}
          <motion.div variants={itemVariants}>
            <NarrativeCard role="hr" />
          </motion.div>

          {/* Workload Distribution */}
          <motion.div variants={itemVariants}>
            <h2 className="text-lg font-semibold mb-3">Workload Distribution</h2>
            <div className="rounded-xl border bg-card p-4 space-y-3">
              {members.map((member: any, idx: number) => {
                const loadPct = Math.round((member.active_tickets / maxTickets) * 100);
                const isOverloaded = member.active_tickets >= OVERLOAD_THRESHOLD;
                const isBurnout = member.active_tickets >= BURNOUT_THRESHOLD;
                return (
                  <div key={`workload-${member.team}-${member.id}-${idx}`} className="flex items-center gap-4">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={member.avatar} />
                      <AvatarFallback>{member.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{member.name}</span>
                          <span className="text-xs text-muted-foreground">{member.role}</span>
                          {isBurnout && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-400 bg-orange-500/15 px-1.5 py-0.5 rounded-full">
                              <Flame className="h-2.5 w-2.5" />
                              BURNOUT RISK
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{member.team}</span>
                          <span
                            className={cn(
                              'text-xs font-semibold px-1.5 py-0.5 rounded',
                              isBurnout ? 'bg-orange-500/20 text-orange-400' :
                              isOverloaded ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400',
                            )}
                          >
                            {member.active_tickets} tickets
                          </span>
                        </div>
                      </div>
                      <Progress
                        value={loadPct}
                        className={cn(
                          'h-1.5',
                          isBurnout && '[&>div]:bg-orange-500',
                          !isBurnout && isOverloaded && '[&>div]:bg-red-500',
                        )}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Senior vs Junior Comparison */}
          <motion.div variants={itemVariants}>
            <h2 className="text-lg font-semibold mb-3">Senior vs Junior Comparison</h2>
            {(() => {
              const seniorKeywords = ['senior', 'sr.', 'sr ', 'lead', 'principal', 'staff', 'architect'];
              const seniors = members.filter((m: any) =>
                seniorKeywords.some(k => (m.role || '').toLowerCase().includes(k))
              );
              const juniors = members.filter((m: any) =>
                !seniorKeywords.some(k => (m.role || '').toLowerCase().includes(k))
              );
              const avgSrTickets = seniors.length > 0
                ? Math.round((seniors.reduce((a: number, m: any) => a + (m.active_tickets || 0), 0) / seniors.length) * 10) / 10
                : 0;
              const avgJrTickets = juniors.length > 0
                ? Math.round((juniors.reduce((a: number, m: any) => a + (m.active_tickets || 0), 0) / juniors.length) * 10) / 10
                : 0;
              const srBurnout = seniors.filter((m: any) => m.active_tickets >= BURNOUT_THRESHOLD).length;
              const jrBurnout = juniors.filter((m: any) => m.active_tickets >= BURNOUT_THRESHOLD).length;

              const comparisonData = [
                { metric: 'Headcount', Senior: seniors.length, Junior: juniors.length },
                { metric: 'Avg Tickets', Senior: avgSrTickets, Junior: avgJrTickets },
                { metric: 'Burnout Risk', Senior: srBurnout, Junior: jrBurnout },
                { metric: 'Overloaded', Senior: seniors.filter((m: any) => m.active_tickets >= OVERLOAD_THRESHOLD).length, Junior: juniors.filter((m: any) => m.active_tickets >= OVERLOAD_THRESHOLD).length },
              ];

              return (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border bg-card p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                          <Users className="h-4 w-4" />
                        </span>
                        <span className="text-xs font-medium text-muted-foreground">Senior Staff</span>
                      </div>
                      <p className="text-2xl font-bold">{seniors.length}</p>
                      <p className="text-xs text-muted-foreground">Avg {avgSrTickets} tickets</p>
                    </div>
                    <div className="rounded-xl border bg-card p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400">
                          <Users className="h-4 w-4" />
                        </span>
                        <span className="text-xs font-medium text-muted-foreground">Junior Staff</span>
                      </div>
                      <p className="text-2xl font-bold">{juniors.length}</p>
                      <p className="text-xs text-muted-foreground">Avg {avgJrTickets} tickets</p>
                    </div>
                    <div className="rounded-xl border bg-card p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Flame className="h-4 w-4 text-orange-400" />
                        <span className="text-xs font-medium text-muted-foreground">Sr Burnout Risk</span>
                      </div>
                      <p className="text-2xl font-bold text-orange-400">{srBurnout}</p>
                    </div>
                    <div className="rounded-xl border bg-card p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Flame className="h-4 w-4 text-orange-400" />
                        <span className="text-xs font-medium text-muted-foreground">Jr Burnout Risk</span>
                      </div>
                      <p className="text-2xl font-bold text-orange-400">{jrBurnout}</p>
                    </div>
                  </div>
                  {/* Chart */}
                  <div className="rounded-xl border bg-card p-4">
                    <h3 className="text-sm font-semibold mb-3">Workload Comparison</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={comparisonData} barGap={4}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                        <XAxis dataKey="metric" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="Senior" fill="#818cf8" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Junior" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })()}
          </motion.div>

          {/* Members List */}
          <motion.div variants={itemVariants}>
            <h2 className="text-lg font-semibold mb-3">All Members</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {members.map((member: any, idx: number) => (
                <div key={`member-${member.team}-${member.id}-${idx}`} className="rounded-xl border bg-card p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.avatar} />
                    <AvatarFallback>{member.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.role}</p>
                    <p className="text-xs text-muted-foreground">{member.team}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </motion.div>
  );
};

export default HRDashboard;
