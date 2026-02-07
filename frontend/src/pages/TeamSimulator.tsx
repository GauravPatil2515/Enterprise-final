/**
 * Team Simulator Page
 *
 * "What if?" team composition analysis.
 * Users select a project, add/remove hypothetical team members,
 * and see Monte Carlo risk projections in real-time.
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Users,
  Plus,
  Minus,
  ArrowRight,
  Loader2,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Zap,
  UserPlus,
  UserMinus,
  ArrowLeftRight,
  ChevronRight,
  BarChart3,
  RefreshCw,
} from 'lucide-react';
import { api } from '@/services/api';
import ReactMarkdown from 'react-markdown';
import { ConfidenceMeter, ContextPill } from '@/components/AITransparency';

interface MutationEntry {
  id: number;
  action: 'add' | 'remove' | 'transfer';
  role: string;
  member_name?: string;
}

const ACTION_ICONS = {
  add: <UserPlus className="h-4 w-4" />,
  remove: <UserMinus className="h-4 w-4" />,
  transfer: <ArrowLeftRight className="h-4 w-4" />,
};

const ACTION_COLORS = {
  add: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  remove: 'bg-red-500/20 text-red-400 border-red-500/30',
  transfer: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

const TeamSimulatorPage = () => {
  const [mutations, setMutations] = useState<MutationEntry[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [nextId, setNextId] = useState(1);

  // Fetch available roles
  const { data: roles } = useQuery({
    queryKey: ['simulator-roles'],
    queryFn: api.getSimulatorRoles,
  });

  // Fetch projects for selector
  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: api.getTeams,
  });

  // Flatten projects
  const allProjects = teams?.flatMap((t) =>
    (t.projects || []).map((p) => ({ ...p, teamName: t.name })),
  ) || [];

  // Auto-select first project
  useEffect(() => {
    if (!selectedProject && allProjects.length > 0) {
      setSelectedProject(allProjects[0].id);
    }
  }, [allProjects, selectedProject]);

  // Simulation mutation
  const simulationMut = useMutation({
    mutationFn: () =>
      api.simulateTeam(
        selectedProject,
        mutations.map((m) => ({ action: m.action, role: m.role, member_name: m.member_name })),
      ),
  });

  const addMutation = () => {
    const roleKeys = roles ? Object.keys(roles) : ['Mid Engineer'];
    setMutations((prev) => [
      ...prev,
      { id: nextId, action: 'add', role: roleKeys[0] },
    ]);
    setNextId((n) => n + 1);
  };

  const removeMutation = (id: number) => {
    setMutations((prev) => prev.filter((m) => m.id !== id));
  };

  const updateMutation = (id: number, field: string, value: string) => {
    setMutations((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)),
    );
  };

  const runSimulation = () => {
    if (!selectedProject || mutations.length === 0) return;
    simulationMut.mutate();
  };

  const roleList = roles ? Object.keys(roles) : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Team Composition Simulator</h1>
              <p className="text-sm text-slate-400">
                "What if?" analysis powered by Monte Carlo simulation
              </p>
            </div>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* ── Left Panel: Configuration ── */}
          <div className="lg:col-span-2 space-y-5">
            {/* Project Selector */}
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5">
              <label className="text-sm font-medium text-slate-300 mb-2 block">
                Target Project
              </label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full bg-slate-800/80 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                {allProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.teamName})
                  </option>
                ))}
              </select>
            </div>

            {/* Mutations List */}
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-slate-300">
                  Hypothetical Changes
                </h3>
                <button
                  onClick={addMutation}
                  className="flex items-center gap-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-3 py-1.5 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Change
                </button>
              </div>

              <AnimatePresence>
                {mutations.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-6">
                    Click "Add Change" to define hypothetical team mutations
                  </p>
                ) : (
                  <div className="space-y-3">
                    {mutations.map((m) => (
                      <motion.div
                        key={m.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="flex items-center gap-2 p-3 rounded-xl bg-slate-800/50 border border-white/5"
                      >
                        {/* Action selector */}
                        <select
                          value={m.action}
                          onChange={(e) => updateMutation(m.id, 'action', e.target.value)}
                          className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white w-24"
                        >
                          <option value="add">+ Add</option>
                          <option value="remove">− Remove</option>
                          <option value="transfer">↔ Transfer</option>
                        </select>

                        {/* Role selector */}
                        <select
                          value={m.role}
                          onChange={(e) => updateMutation(m.id, 'role', e.target.value)}
                          className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white flex-1"
                        >
                          {roleList.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>

                        {/* Delete */}
                        <button
                          onClick={() => removeMutation(m.id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </AnimatePresence>

              {/* Run Button */}
              <button
                onClick={runSimulation}
                disabled={mutations.length === 0 || simulationMut.isPending}
                className="mt-5 w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-3 text-sm font-medium transition-all"
              >
                {simulationMut.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Running Monte Carlo...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    Run Simulation ({mutations.length} {mutations.length === 1 ? 'change' : 'changes'})
                  </>
                )}
              </button>
            </div>

            {/* Role Profiles Reference */}
            {roles && (
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5">
                <h3 className="text-sm font-medium text-slate-300 mb-3">
                  Role Profiles
                </h3>
                <div className="space-y-2">
                  {Object.entries(roles).map(([name, profile]) => (
                    <div
                      key={name}
                      className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-slate-800/50"
                    >
                      <span className="text-slate-300 font-medium">{name}</span>
                      <div className="flex items-center gap-3 text-slate-500">
                        <span>+{(profile.velocity_boost * 100).toFixed(0)}% vel</span>
                        <span>{profile.ramp_up_days}d ramp</span>
                        <span className="text-emerald-500">${profile.cost_per_day}/d</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Right Panel: Results ── */}
          <div className="lg:col-span-3">
            {simulationMut.data ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-5"
              >
                {/* Summary Header */}
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Simulation Results</h3>
                    <div className="flex items-center gap-2">
                      <ContextPill
                        label="Project"
                        value={simulationMut.data.project_id}
                      />
                      <ContextPill
                        label="Baseline Risk"
                        value={`${(simulationMut.data.baseline_risk * 100).toFixed(0)}%`}
                        variant={
                          simulationMut.data.baseline_risk > 0.7
                            ? 'danger'
                            : simulationMut.data.baseline_risk > 0.4
                              ? 'warning'
                              : 'success'
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Individual Results */}
                {simulationMut.data.simulations.map((sim, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={`rounded-2xl border backdrop-blur p-5 ${
                      sim.feasible
                        ? sim.risk_delta < 0
                          ? 'border-emerald-500/20 bg-emerald-500/5'
                          : 'border-amber-500/20 bg-amber-500/5'
                        : 'border-red-500/20 bg-red-500/5'
                    }`}
                  >
                    {/* Mutation Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center gap-1.5 text-xs font-medium border rounded-lg px-2.5 py-1 ${ACTION_COLORS[sim.mutation.action as keyof typeof ACTION_COLORS] || ACTION_COLORS.add}`}>
                          {ACTION_ICONS[sim.mutation.action as keyof typeof ACTION_ICONS] || ACTION_ICONS.add}
                          {sim.mutation.action.toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-white">
                          {sim.mutation.role}
                        </span>
                      </div>
                      <ConfidenceMeter value={sim.confidence} size="sm" />
                    </div>

                    {/* Key Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                      <div className="bg-slate-800/50 rounded-xl p-3 text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          {sim.risk_delta < 0 ? (
                            <TrendingDown className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <TrendingUp className="h-4 w-4 text-red-400" />
                          )}
                        </div>
                        <div className={`text-lg font-bold ${sim.risk_delta < 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {sim.risk_delta < 0 ? '' : '+'}{(sim.risk_delta * 100).toFixed(1)}%
                        </div>
                        <div className="text-[10px] text-slate-500">Risk Change</div>
                      </div>

                      <div className="bg-slate-800/50 rounded-xl p-3 text-center">
                        <BarChart3 className="h-4 w-4 text-blue-400 mx-auto mb-1" />
                        <div className="text-lg font-bold text-blue-400">
                          {(sim.projected_risk * 100).toFixed(0)}%
                        </div>
                        <div className="text-[10px] text-slate-500">New Risk</div>
                      </div>

                      <div className="bg-slate-800/50 rounded-xl p-3 text-center">
                        <DollarSign className="h-4 w-4 text-amber-400 mx-auto mb-1" />
                        <div className="text-lg font-bold text-amber-400">
                          {sim.cost_delta >= 0 ? '+' : ''}${(sim.cost_delta / 1000).toFixed(1)}k
                        </div>
                        <div className="text-[10px] text-slate-500">Cost/Month</div>
                      </div>

                      <div className="bg-slate-800/50 rounded-xl p-3 text-center">
                        <Zap className="h-4 w-4 text-purple-400 mx-auto mb-1" />
                        <div className="text-lg font-bold text-purple-400">
                          {sim.velocity_change >= 0 ? '+' : ''}{(sim.velocity_change * 100).toFixed(1)}%
                        </div>
                        <div className="text-[10px] text-slate-500">Velocity</div>
                      </div>
                    </div>

                    {/* Warning */}
                    {sim.warning && (
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-3">
                        <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                        <p className="text-xs text-amber-300">{sim.warning}</p>
                      </div>
                    )}

                    {/* Reasoning */}
                    <div className="prose prose-sm prose-invert max-w-none text-xs text-slate-400 leading-relaxed">
                      <ReactMarkdown>{sim.reasoning}</ReactMarkdown>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-12 text-center">
                <Users className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-400 mb-2">
                  Configure & Simulate
                </h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                  Add hypothetical team composition changes on the left, then run
                  the Monte Carlo simulation to see projected risk impact.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamSimulatorPage;
