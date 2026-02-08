/**
 * FinanceDashboard — Improved Decision Economics Dashboard.
 * Per-team & per-project: ROI, Cost-to-Company, Revenue, Profit, Risk Exposure.
 * Enhanced visualizations and better layout organization.
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  Users,
  FolderKanban,
  TrendingDown,
  TrendingUp,
  ArrowDown,
  ArrowUp,
  AlertTriangle,
  Shield,
  Activity,
  Target,
  Zap,
  XCircle,
  PieChart,
  BarChart3,
  Wallet,
  BadgeDollarSign,
  Download,
  CheckCircle,
} from 'lucide-react';
import { api, type DashboardData } from '@/services/api';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import NarrativeCard from '@/components/NarrativeCard';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  PieChart as RPieChart,
  Pie,
  Legend,
  Line,
  LineChart,
  ComposedChart,
} from 'recharts';
import { generateFinancialSummaryPDF } from '@/utils/pdfGenerator';

const fmt = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `$${(n / 1_000).toFixed(0)}K` : `$${n}`;

const costColors: Record<string, string> = {
  Low: 'text-green-400 bg-green-500/20',
  Medium: 'text-amber-400 bg-amber-500/20',
  High: 'text-red-400 bg-red-500/20',
};

const riskBadge = (blocked: number) => {
  if (blocked > 1) return { label: 'HIGH', color: 'bg-red-500/20 text-red-400' };
  if (blocked === 1) return { label: 'MED', color: 'bg-amber-500/20 text-amber-400' };
  return { label: 'LOW', color: 'bg-green-500/20 text-green-400' };
};

const CHART_COLORS = ['#818cf8', '#34d399', '#f59e0b', '#ef4444', '#06b6d4', '#a855f7'];

const FinanceDashboard = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'teams' | 'projects'>('overview');

  useEffect(() => {
    api.getDashboardData('finance')
      .then(setData)
      .catch((err) => {
        import('sonner').then(({ toast }) => toast.error(err?.message || 'Failed to load financial data'));
      })
      .finally(() => setLoading(false));
  }, []);

  const teams = data?.teams || [];
  const costs = data?.intervention_costs || {};
  const costAnalysis: any[] = (data as any)?.cost_analysis || [];
  const totalActiveTickets: number = (data as any)?.total_active_tickets || 0;
  const totalMembers = teams.reduce((acc: number, t: any) => acc + (t.member_count || 0), 0);
  const totalProjects = teams.reduce((acc: number, t: any) => acc + (t.project_count || 0), 0);
  const totalCTC = teams.reduce((acc: number, t: any) => acc + (t.cost_to_company || 0), 0);
  const totalRevenue = teams.reduce((acc: number, t: any) => acc + (t.revenue || 0), 0);
  const totalProfit = totalRevenue - totalCTC;
  const totalROI = totalCTC > 0 ? ((totalProfit / totalCTC) * 100).toFixed(1) : '0';
  const totalBlocked = costAnalysis.reduce((acc: number, p: any) => acc + (p.blocked_count || 0), 0);

  const handleDownloadPDF = () => {
    try {
      const fileName = generateFinancialSummaryPDF(
        teams,
        costAnalysis,
        totalCTC,
        totalRevenue,
        totalProfit
      );
      import('sonner').then(({ toast }) => toast.success(`Financial summary downloaded: ${fileName}`));
    } catch (err: any) {
      import('sonner').then(({ toast }) => toast.error('Failed to generate PDF'));
    }
  };

  // Chart data
  const teamChartData = teams.map((t: any) => ({
    name: t.name?.replace(' Team', '') || 'Unknown',
    ctc: t.cost_to_company || 0,
    revenue: t.revenue || 0,
    profit: t.profit || 0,
  }));

  const roiChartData = teams
    .map((t: any) => ({
      name: t.name?.replace(' Team', '') || 'Unknown',
      roi: t.roi || 0,
    }))
    .sort((a, b) => b.roi - a.roi);

  const projectPieData = costAnalysis
    .slice(0, 6)
    .map((p: any, i: number) => ({
      name: p.project_name?.slice(0, 15) || 'Unknown',
      value: p.cost_to_company || 0,
      fill: CHART_COLORS[i % CHART_COLORS.length],
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
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-8">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-20 skeleton rounded-xl" />
          ))}
        </div>
        <div className="h-48 skeleton rounded-xl" />
        <div className="grid gap-6 lg:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-64 skeleton rounded-xl" />
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
      <motion.div variants={itemVariants} className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 p-2.5 text-white shadow">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Financial Intelligence</h1>
            <p className="text-sm text-muted-foreground">
              Comprehensive ROI, revenue, and cost analysis
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Download PDF Button */}
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 transition-all text-sm font-medium shadow-sm"
          >
            <Download className="h-4 w-4" />
            Export Report
          </button>
          
          {/* Tab Switcher */}
          <div className="flex items-center gap-1 rounded-lg border bg-muted/50 p-1">
          {(['overview', 'teams', 'projects'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-all capitalize',
                activeTab === tab ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab}
            </button>
          ))}
          </div>
        </div>
      </motion.div>

      {/* Top Stats — always visible */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {[
              { label: 'Teams', value: String(teams.length), icon: <Users className="h-3.5 w-3.5" />, color: 'bg-blue-500/10 text-blue-400' },
              { label: 'Members', value: String(totalMembers), icon: <Users className="h-3.5 w-3.5" />, color: 'bg-green-500/10 text-green-400' },
              { label: 'Projects', value: String(totalProjects), icon: <FolderKanban className="h-3.5 w-3.5" />, color: 'bg-purple-500/10 text-purple-400' },
              { label: 'Blocked', value: String(totalBlocked), icon: <Shield className="h-3.5 w-3.5" />, color: 'bg-red-500/10 text-red-400' },
              { label: 'Total CTC/mo', value: fmt(totalCTC), icon: <Wallet className="h-3.5 w-3.5" />, color: 'bg-amber-500/10 text-amber-400' },
              { label: 'Revenue', value: fmt(totalRevenue), icon: <BadgeDollarSign className="h-3.5 w-3.5" />, color: 'bg-emerald-500/10 text-emerald-400' },
              { label: 'Net Profit', value: fmt(totalProfit), icon: totalProfit >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />, color: totalProfit >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400' },
              { label: 'ROI', value: `${totalROI}%`, icon: <PieChart className="h-3.5 w-3.5" />, color: Number(totalROI) >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border bg-card p-3 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-1">
                  <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg', stat.color)}>
                    {stat.icon}
                  </span>
                </div>
                <p className="text-lg font-bold">{stat.value}</p>
                <p className="text-[11px] text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </motion.div>

          {/* AI Narrative */}
          <motion.div variants={itemVariants}>
            <NarrativeCard role="finance" />
          </motion.div>

          {/* ════════════ OVERVIEW TAB ════════════ */}
          {activeTab === 'overview' && (
            <>
              {/* Main Financial Charts */}
              <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue vs CTC Chart */}
                <div className="rounded-xl border bg-card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-indigo-400" />
                      <h3 className="text-sm font-semibold">Revenue vs Cost by Team</h3>
                    </div>
                    <span className="text-xs text-muted-foreground">Monthly</span>
                  </div>
                  <ResponsiveContainer width="100%" height={280}>
                    <ComposedChart data={teamChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                      <Tooltip
                        formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                        contentStyle={{ background: 'rgba(255,255,255,0.95)', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: 11 }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="ctc" fill="#818cf8" radius={[4, 4, 0, 0]} name="Cost to Company" />
                      <Bar dataKey="revenue" fill="#34d399" radius={[4, 4, 0, 0]} name="Revenue" />
                      <Line type="monotone" dataKey="profit" stroke="#f59e0b" strokeWidth={2} name="Profit" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {/* ROI by Team */}
                <div className="rounded-xl border bg-card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-400" />
                      <h3 className="text-sm font-semibold">ROI by Team</h3>
                    </div>
                    <span className="text-xs text-muted-foreground">Sorted by performance</span>
                  </div>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={roiChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                      <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={80} />
                      <Tooltip
                        formatter={(value: number) => [`${value}%`, 'ROI']}
                        contentStyle={{ background: 'rgba(255,255,255,0.95)', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: 11 }}
                      />
                      <Bar dataKey="roi" radius={[0, 4, 4, 0]}>
                        {roiChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.roi >= 0 ? '#34d399' : '#ef4444'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              {/* Cost Distribution */}
              <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 rounded-xl border bg-card p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <PieChart className="h-4 w-4 text-amber-400" />
                    <h3 className="text-sm font-semibold">Cost Distribution</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={240}>
                    <RPieChart>
                      <Pie
                        data={projectPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={85}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {projectPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => [`$${value.toLocaleString()}`, 'CTC']}
                        contentStyle={{ background: 'rgba(255,255,255,0.95)', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: 11 }}
                      />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                    </RPieChart>
                  </ResponsiveContainer>
                </div>

                {/* Financial Health Indicators */}
                <div className="lg:col-span-2 rounded-xl border bg-card p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Activity className="h-4 w-4 text-blue-400" />
                    <h3 className="text-sm font-semibold">Financial Health Indicators</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      {
                        label: 'Profit Margin',
                        value: totalRevenue > 0 ? `${((totalProfit / totalRevenue) * 100).toFixed(1)}%` : '0%',
                        status: totalProfit > 0 ? 'positive' : 'negative',
                        icon: totalProfit > 0 ? CheckCircle : AlertTriangle,
                      },
                      {
                        label: 'Cost Efficiency',
                        value: totalRevenue > 0 ? `${((totalCTC / totalRevenue) * 100).toFixed(0)}%` : '0%',
                        status: totalCTC < totalRevenue ? 'positive' : 'negative',
                        icon: totalCTC < totalRevenue ? CheckCircle : AlertTriangle,
                      },
                      {
                        label: 'Revenue per Member',
                        value: totalMembers > 0 ? fmt(totalRevenue / totalMembers) : '$0',
                        status: 'neutral',
                        icon: Users,
                      },
                      {
                        label: 'Avg Team ROI',
                        value: `${(teams.reduce((sum, t: any) => sum + (t.roi || 0), 0) / teams.length).toFixed(1)}%`,
                        status: 'neutral',
                        icon: Target,
                      },
                    ].map((indicator) => {
                      const Icon = indicator.icon;
                      return (
                        <div key={indicator.label} className="rounded-lg border bg-muted/30 p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-muted-foreground">{indicator.label}</span>
                            <Icon className={cn(
                              'h-4 w-4',
                              indicator.status === 'positive' ? 'text-green-400' :
                              indicator.status === 'negative' ? 'text-red-400' : 'text-blue-400'
                            )} />
                          </div>
                          <p className="text-2xl font-bold">{indicator.value}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>

              {/* Intervention Cost-Benefit Matrix */}
              <motion.div variants={itemVariants}>
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="h-4 w-4 text-violet-400" />
                  <h2 className="text-lg font-semibold">Intervention Cost-Benefit Analysis</h2>
                </div>
                <div className="rounded-xl border bg-card overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium">Intervention</th>
                        <th className="text-center p-3 font-medium">Risk Reduction</th>
                        <th className="text-center p-3 font-medium">Cost Impact</th>
                        <th className="text-center p-3 font-medium">Net Benefit</th>
                        <th className="text-center p-3 font-medium">Ramp-Up</th>
                        <th className="text-center p-3 font-medium">Recommendation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(costs).map(([action, impact]: [string, any]) => {
                        const net = (impact.risk_reduction || 0) - (impact.cost_penalty || 0);
                        const costLevel =
                          impact.cost_penalty < 0.15 ? 'Low' : impact.cost_penalty < 0.3 ? 'Medium' : 'High';
                        const isRecommended = net > 0.15 && !impact.ramp_up_required;
                        const isNotRecommended = net <= 0 || (impact.ramp_up_required && impact.cost_penalty >= 0.2);

                        return (
                          <tr key={action} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                            <td className="p-3 font-medium">{action.replace(/_/g, ' ')}</td>
                            <td className="p-3 text-center">
                              <span className="text-green-400 flex items-center justify-center gap-1">
                                <ArrowDown className="h-3 w-3" />
                                {Math.round(impact.risk_reduction * 100)}%
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span className={cn('px-2 py-0.5 rounded text-xs font-medium', costColors[costLevel])}>
                                {Math.round(impact.cost_penalty * 100)}% — {costLevel}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span
                                className={cn(
                                  'flex items-center justify-center gap-1 font-semibold',
                                  net > 0 ? 'text-green-400' : 'text-red-400',
                                )}
                              >
                                {net > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                                {net > 0 ? '+' : ''}
                                {Math.round(net * 100)}%
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              {impact.ramp_up_required ? (
                                <span className="text-amber-400 text-xs">⚠ Required</span>
                              ) : (
                                <span className="text-green-400 text-xs">✓ None</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              {isNotRecommended ? (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded">
                                  <XCircle className="h-3 w-3" /> NOT REC.
                                </span>
                              ) : isRecommended ? (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-green-400 bg-green-500/10 px-2 py-1 rounded">
                                  <TrendingUp className="h-3 w-3" /> RECOMMENDED
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">CONDITIONAL</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </>
          )}

          {/* ════════════ TEAMS TAB ════════════ */}
          {activeTab === 'teams' && (
            <motion.div variants={itemVariants}>
              <div className="flex items-center gap-2 mb-4">
                <Activity className="h-4 w-4 text-blue-400" />
                <h2 className="text-lg font-semibold">Financial Breakdown by Team</h2>
              </div>
              <div className="rounded-xl border bg-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Team</th>
                      <th className="text-center p-3 font-medium">Members</th>
                      <th className="text-center p-3 font-medium">Projects</th>
                      <th className="text-center p-3 font-medium">Active Tickets</th>
                      <th className="text-center p-3 font-medium">Completed</th>
                      <th className="text-center p-3 font-medium">CTC / Month</th>
                      <th className="text-center p-3 font-medium">Revenue</th>
                      <th className="text-center p-3 font-medium">Profit</th>
                      <th className="text-center p-3 font-medium">ROI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teams.map((team: any) => (
                      <tr key={team.id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: team.color || '#666' }} />
                            <span className="font-medium">{team.name}</span>
                          </div>
                        </td>
                        <td className="p-3 text-center">{team.member_count}</td>
                        <td className="p-3 text-center">{team.project_count}</td>
                        <td className="p-3 text-center">{team.active_ticket_count}</td>
                        <td className="p-3 text-center text-green-400">{team.done_ticket_count || 0}</td>
                        <td className="p-3 text-center font-medium text-amber-400">{fmt(team.cost_to_company || 0)}</td>
                        <td className="p-3 text-center font-medium text-emerald-400">{fmt(team.revenue || 0)}</td>
                        <td className="p-3 text-center">
                          <span className={cn('font-semibold', (team.profit || 0) >= 0 ? 'text-green-400' : 'text-red-400')}>
                            {fmt(team.profit || 0)}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={cn(
                            'px-2 py-0.5 rounded text-xs font-bold',
                            (team.roi || 0) >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400',
                          )}>
                            {team.roi || 0}%
                          </span>
                        </td>
                      </tr>
                    ))}
                    {/* Totals row */}
                    <tr className="bg-muted/50 font-semibold">
                      <td className="p-3">Total</td>
                      <td className="p-3 text-center">{totalMembers}</td>
                      <td className="p-3 text-center">{totalProjects}</td>
                      <td className="p-3 text-center">{totalActiveTickets}</td>
                      <td className="p-3 text-center text-green-400">
                        {teams.reduce((a: number, t: any) => a + (t.done_ticket_count || 0), 0)}
                      </td>
                      <td className="p-3 text-center text-amber-400">{fmt(totalCTC)}</td>
                      <td className="p-3 text-center text-emerald-400">{fmt(totalRevenue)}</td>
                      <td className="p-3 text-center">
                        <span className={cn(totalProfit >= 0 ? 'text-green-400' : 'text-red-400')}>
                          {fmt(totalProfit)}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={cn(
                          'px-2 py-0.5 rounded text-xs font-bold',
                          Number(totalROI) >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400',
                        )}>
                          {totalROI}%
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Team Cards with details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                {teams.map((team: any) => {
                  const ticketsPerMember = team.member_count > 0
                    ? (team.active_ticket_count / team.member_count)
                    : 0;
                  return (
                    <div key={team.id} className="rounded-xl border bg-card p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: team.color || '#666' }} />
                          <h3 className="font-semibold text-sm">{team.name}</h3>
                        </div>
                        <span className={cn(
                          'text-xs font-bold px-2 py-0.5 rounded',
                          (team.roi || 0) >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400',
                        )}>
                          ROI: {team.roi || 0}%
                        </span>
                      </div>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Cost to Company</span>
                          <span className="font-medium text-amber-400">{fmt(team.cost_to_company || 0)}/mo</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Revenue</span>
                          <span className="font-medium text-emerald-400">{fmt(team.revenue || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Net Profit</span>
                          <span className={cn('font-medium', (team.profit || 0) >= 0 ? 'text-green-400' : 'text-red-400')}>
                            {fmt(team.profit || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tickets/Member</span>
                          <span className={cn('font-medium', ticketsPerMember > 3 ? 'text-red-400' : 'text-green-400')}>
                            {ticketsPerMember.toFixed(1)}
                          </span>
                        </div>
                        <Progress value={Math.min(100, Math.round((ticketsPerMember / 3) * 100))} className="h-1.5" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ════════════ PROJECTS TAB ════════════ */}
          {activeTab === 'projects' && (
            <motion.div variants={itemVariants}>
              <div className="flex items-center gap-2 mb-4">
                <Target className="h-4 w-4 text-amber-400" />
                <h2 className="text-lg font-semibold">Financial Breakdown by Project</h2>
              </div>
              <div className="rounded-xl border bg-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Project</th>
                      <th className="text-left p-3 font-medium">Team</th>
                      <th className="text-center p-3 font-medium">Status</th>
                      <th className="text-center p-3 font-medium">Progress</th>
                      <th className="text-center p-3 font-medium">Active</th>
                      <th className="text-center p-3 font-medium">Done</th>
                      <th className="text-center p-3 font-medium">Blocked</th>
                      <th className="text-center p-3 font-medium">CTC</th>
                      <th className="text-center p-3 font-medium">Revenue</th>
                      <th className="text-center p-3 font-medium">Profit</th>
                      <th className="text-center p-3 font-medium">ROI</th>
                      <th className="text-center p-3 font-medium">Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {costAnalysis
                      .sort((a: any, b: any) => (b.roi || 0) - (a.roi || 0))
                      .map((proj: any) => {
                        const badge = riskBadge(proj.blocked_count);
                        return (
                          <tr key={proj.project_id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                            <td className="p-3 font-medium">{proj.project_name}</td>
                            <td className="p-3 text-muted-foreground text-xs">{proj.team}</td>
                            <td className="p-3 text-center">
                              <span className={cn(
                                'text-xs px-2 py-0.5 rounded',
                                proj.status === 'Ongoing' ? 'bg-blue-500/20 text-blue-400'
                                  : proj.status === 'Completed' ? 'bg-green-500/20 text-green-400'
                                    : 'bg-amber-500/20 text-amber-400',
                              )}>
                                {proj.status}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center gap-2 justify-center">
                                <Progress value={proj.progress} className="h-1 w-12" />
                                <span className="text-xs">{proj.progress}%</span>
                              </div>
                            </td>
                            <td className="p-3 text-center">{proj.active_tickets}</td>
                            <td className="p-3 text-center text-green-400">{proj.done_tickets || 0}</td>
                            <td className="p-3 text-center">
                              <span className={cn(proj.blocked_count > 0 ? 'text-red-400 font-bold' : '')}>
                                {proj.blocked_count}
                              </span>
                            </td>
                            <td className="p-3 text-center text-amber-400 font-medium">{fmt(proj.cost_to_company || 0)}</td>
                            <td className="p-3 text-center text-emerald-400 font-medium">{fmt(proj.revenue || 0)}</td>
                            <td className="p-3 text-center">
                              <span className={cn('font-semibold', (proj.profit || 0) >= 0 ? 'text-green-400' : 'text-red-400')}>
                                {fmt(proj.profit || 0)}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span className={cn(
                                'px-2 py-0.5 rounded text-xs font-bold',
                                (proj.roi || 0) >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400',
                              )}>
                                {proj.roi || 0}%
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded', badge.color)}>
                                {badge.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              {/* Expected Revenue Pipeline */}
              <div className="rounded-xl border bg-card p-5 mt-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  <h3 className="text-sm font-semibold">Revenue Pipeline — Expected vs Realized</h3>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={costAnalysis.map((p: any) => ({
                      name: (p.project_name || '').slice(0, 12),
                      realized: p.revenue || 0,
                      expected: p.expected_revenue || 0,
                    }))}
                    barGap={2}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                    <Tooltip
                      formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                      contentStyle={{ background: 'rgba(255,255,255,0.95)', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: 11 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="realized" fill="#34d399" radius={[4, 4, 0, 0]} name="Realized Revenue" />
                    <Bar dataKey="expected" fill="#818cf8" radius={[4, 4, 0, 0]} name="Expected Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}
    </motion.div>
  );
};

export default FinanceDashboard;
