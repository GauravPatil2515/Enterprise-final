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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-green-700 p-2.5 text-white shadow">
          <Users className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">HR Dashboard</h1>
          <p className="text-sm text-muted-foreground">Team workload, burnout risk & member overview</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground">Loading team data...</div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Total Members', value: members.length, icon: <Users className="h-4 w-4" />, color: 'text-blue-400' },
              { label: 'Active Workers', value: members.length - idle.length, icon: <UserCheck className="h-4 w-4" />, color: 'text-green-400' },
              { label: 'Overloaded (3+)', value: overloaded.length, icon: <AlertTriangle className="h-4 w-4" />, color: 'text-red-400' },
              { label: 'Burnout Risk', value: burnoutRisk.length, icon: <Flame className="h-4 w-4" />, color: 'text-orange-400' },
              { label: 'Idle / Under-utilized', value: idle.length, icon: <Briefcase className="h-4 w-4" />, color: 'text-amber-400' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border bg-card p-4">
                <div className={cn('flex items-center gap-2 text-sm mb-1', stat.color)}>
                  {stat.icon}
                  {stat.label}
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Burnout Risk Alert */}
          {burnoutRisk.length > 0 && (
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
                  <div key={member.id} className="flex items-center gap-3 rounded-lg border border-orange-500/20 bg-card p-3">
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
          )}

          {/* Reassignment Suggestions */}
          {reassignments.length > 0 && (
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4">
              <div className="flex items-center gap-2 mb-3">
                <ArrowRightLeft className="h-5 w-5 text-blue-400" />
                <h2 className="text-base font-semibold text-blue-400">Suggested Reassignments</h2>
              </div>
              <div className="space-y-2">
                {reassignments.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg border bg-card p-3 text-sm">
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
          )}

          {/* AI Narrative */}
          <NarrativeCard role="hr" />

          {/* Workload Distribution */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Workload Distribution</h2>
            <div className="rounded-xl border bg-card p-4 space-y-3">
              {members.map((member: any) => {
                const loadPct = Math.round((member.active_tickets / maxTickets) * 100);
                const isOverloaded = member.active_tickets >= OVERLOAD_THRESHOLD;
                const isBurnout = member.active_tickets >= BURNOUT_THRESHOLD;
                return (
                  <div key={member.id} className="flex items-center gap-4">
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
          </div>

          {/* Members List */}
          <div>
            <h2 className="text-lg font-semibold mb-3">All Members</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {members.map((member: any) => (
                <div key={member.id} className="rounded-xl border bg-card p-4 flex items-center gap-3">
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
          </div>
        </>
      )}
    </motion.div>
  );
};

export default HRDashboard;
