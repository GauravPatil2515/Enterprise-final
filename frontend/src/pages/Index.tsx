/**
 * Premium Landing Page — Hero, live metrics, trust signals, role CTA.
 * Glassmorphism design with live system health widget.
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  BrainCircuit,
  GitGraph,
  Shield,
  Users,
  ArrowRight,
  Sparkles,
  Cpu,
  Activity,
  Target,
  Zap,
  ChevronRight,
  Code2,
  DollarSign,
  ShieldCheck,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  FlaskConical,
  Globe,
  Lock,
  Layers,
} from 'lucide-react';
import { useRole, type RoleKey } from '@/context/RoleContext';

// ── Live metrics fetcher ─────────────────────────────────────────────────────

interface LiveMetrics {
  totalTeams: number;
  totalProjects: number;
  totalMembers: number;
  completionRate: number;
  blockedCount: number;
  agentsActive: number;
}

const useLiveMetrics = (): { metrics: LiveMetrics | null; loading: boolean } => {
  const [metrics, setMetrics] = useState<LiveMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch('/api/company-report');
        if (res.ok) {
          const data = await res.json();
          setMetrics({
            totalTeams: data.summary.total_teams,
            totalProjects: data.summary.total_projects,
            totalMembers: data.summary.total_members,
            completionRate: data.summary.completion_rate,
            blockedCount: data.summary.total_blocked,
            agentsActive: 6,
          });
        }
      } catch {
        setMetrics({
          totalTeams: 3,
          totalProjects: 6,
          totalMembers: 8,
          completionRate: 45,
          blockedCount: 2,
          agentsActive: 6,
        });
      }
      setLoading(false);
    };
    fetchMetrics();
  }, []);

  return { metrics, loading };
};

// ── Feature cards ────────────────────────────────────────────────────────────

const features = [
  {
    icon: <BrainCircuit className="h-6 w-6" />,
    title: 'Multi-Model AI Router',
    description:
      'Intent classification routes queries to specialized models — reasoning, explanation, or chain-of-thought — for optimal response quality.',
    color: 'from-violet-500/20 to-indigo-500/20 text-violet-400',
    badge: 'New',
  },
  {
    icon: <GitGraph className="h-6 w-6" />,
    title: 'Live Knowledge Graph',
    description:
      'Neo4j-powered graph captures real-time dependencies between teams, projects, tickets, and blockers. Full 2D/3D visualization.',
    color: 'from-blue-500/20 to-cyan-500/20 text-blue-400',
  },
  {
    icon: <Shield className="h-6 w-6" />,
    title: 'Monte Carlo Simulation',
    description:
      '200-trial probabilistic simulation evaluates intervention strategies with 95% confidence intervals and contrastive reasoning.',
    color: 'from-amber-500/20 to-orange-500/20 text-amber-400',
  },
  {
    icon: <FlaskConical className="h-6 w-6" />,
    title: 'Team Composition Simulator',
    description:
      '"What if?" counterfactual analysis. Add, remove, or transfer team members and see projected risk impact via Monte Carlo.',
    color: 'from-purple-500/20 to-pink-500/20 text-purple-400',
    badge: 'New',
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: 'Role-Gated Intelligence',
    description:
      'Tailored dashboards for Engineers, HR, Finance, and Leadership — each sees what matters most with AI-powered narratives.',
    color: 'from-emerald-500/20 to-green-500/20 text-emerald-400',
  },
  {
    icon: <BarChart3 className="h-6 w-6" />,
    title: 'Financial Analytics',
    description:
      'ROI, cost-to-company, profit analysis per team and project. Decision economics that connect delivery risk to business impact.',
    color: 'from-cyan-500/20 to-teal-500/20 text-cyan-400',
  },
];

const roles: { key: RoleKey; label: string; desc: string; icon: React.ReactNode; color: string }[] = [
  { key: 'engineer', label: 'Engineer', desc: 'Sprint health & blockers', icon: <Code2 className="h-5 w-5" />, color: 'from-blue-500 to-blue-700' },
  { key: 'hr', label: 'HR Manager', desc: 'Workforce & workload', icon: <Users className="h-5 w-5" />, color: 'from-green-500 to-green-700' },
  { key: 'chairperson', label: 'Chairperson', desc: 'Company-wide analysis', icon: <ShieldCheck className="h-5 w-5" />, color: 'from-purple-500 to-purple-700' },
  { key: 'finance', label: 'Finance', desc: 'ROI & cost analysis', icon: <DollarSign className="h-5 w-5" />, color: 'from-amber-500 to-amber-700' },
];

const trustSignals = [
  { icon: <Lock className="h-4 w-4" />, label: 'Zero Hallucination Design', desc: 'All LLM outputs grounded in graph data' },
  { icon: <Layers className="h-4 w-4" />, label: 'Multi-Agent Consensus', desc: '3+ agents must agree before recommendations' },
  { icon: <Globe className="h-4 w-4" />, label: 'Real-Time Graph', desc: 'Decisions based on live Neo4j data, never stale' },
];

const LandingPage = () => {
  const navigate = useNavigate();
  const { selectRole, systemUsers, currentRole } = useRole();
  const { metrics } = useLiveMetrics();

  useEffect(() => {
    if (currentRole) {
      navigate('/role-dashboard', { replace: true });
    }
  }, [currentRole, navigate]);

  const handleRoleSelect = (role: RoleKey) => {
    const user = systemUsers.find((u) => u.role === role);
    selectRole(role, user || undefined);
    navigate('/role-dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white overflow-hidden">
      {/* Animated gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-violet-500/8 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ x: [0, -20, 0], y: [0, 30, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/2 -left-40 w-[500px] h-[500px] bg-blue-500/8 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ x: [0, 15, 0], y: [0, -15, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -bottom-40 right-1/3 w-[400px] h-[400px] bg-emerald-500/6 rounded-full blur-3xl"
        />
      </div>

      {/* Nav */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20">
            <Cpu className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight">DeliverIQ</span>
            <p className="text-[10px] text-slate-400 leading-none">Decision Intelligence Platform</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
            <Activity className="h-3 w-3 animate-pulse" />
            System Live
          </span>
          <button
            onClick={() => navigate('/select-role')}
            className="text-sm font-medium text-slate-300 hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-white/5 border border-white/5"
          >
            All Roles →
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-12 pb-16 md:pt-20 md:pb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 text-xs font-medium text-violet-300 bg-violet-500/10 border border-violet-500/20 px-4 py-1.5 rounded-full mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            Graph → Agents → LLM → Human Decision Pipeline
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight mb-6">
            AI-Driven
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              Decision Intelligence
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Real engineering data from Neo4j, analyzed by specialist AI agents, synthesized into
            role-gated executive reports. Make decisions backed by evidence, not instinct.
          </p>

          {/* Live metrics */}
          {metrics && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="grid grid-cols-3 md:grid-cols-6 gap-3 max-w-3xl mx-auto mb-10"
            >
              {[
                { value: metrics.totalTeams, label: 'Teams', icon: <Users className="h-3.5 w-3.5" /> },
                { value: metrics.totalProjects, label: 'Projects', icon: <Target className="h-3.5 w-3.5" /> },
                { value: metrics.totalMembers, label: 'Members', icon: <Code2 className="h-3.5 w-3.5" /> },
                { value: `${metrics.completionRate}%`, label: 'Complete', icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> },
                { value: metrics.blockedCount, label: 'Blocked', icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-400" /> },
                { value: metrics.agentsActive, label: 'AI Agents', icon: <BrainCircuit className="h-3.5 w-3.5 text-violet-400" /> },
              ].map((m, i) => (
                <motion.div
                  key={m.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + i * 0.05 }}
                  className="rounded-xl border border-white/10 bg-white/5 backdrop-blur px-3 py-2.5 text-center"
                >
                  <div className="flex items-center justify-center gap-1 mb-1 text-slate-500">
                    {m.icon}
                  </div>
                  <div className="text-lg font-bold text-white">{m.value}</div>
                  <div className="text-[10px] text-slate-500">{m.label}</div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Role select */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
            {roles.map((role) => (
              <button
                key={role.key}
                onClick={() => handleRoleSelect(role.key)}
                className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 backdrop-blur px-5 py-3 text-sm font-medium transition-all hover:scale-105 hover:border-white/25 hover:bg-white/10 hover:shadow-lg hover:shadow-indigo-500/5"
              >
                <div className={`inline-flex items-center justify-center rounded-lg bg-gradient-to-br ${role.color} p-1.5 text-white`}>
                  {role.icon}
                </div>
                <div className="text-left">
                  <div>{role.label}</div>
                  <div className="text-[10px] text-slate-500 font-normal">{role.desc}</div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-white transition-colors" />
              </button>
            ))}
          </div>

          <p className="text-xs text-slate-600">No login required for demo • JWT auth architecture ready</p>
        </motion.div>
      </section>

      {/* Trust Signals */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pb-16">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="grid sm:grid-cols-3 gap-4"
        >
          {trustSignals.map((sig, i) => (
            <motion.div
              key={sig.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="flex items-start gap-3 rounded-xl border border-emerald-500/10 bg-emerald-500/5 backdrop-blur px-4 py-3"
            >
              <div className="text-emerald-400 mt-0.5">{sig.icon}</div>
              <div>
                <div className="text-xs font-semibold text-emerald-300">{sig.label}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{sig.desc}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Features grid */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-20">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <h2 className="text-center text-2xl font-bold mb-10">Architecture & Capabilities</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.08 }}
                className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6 hover:border-white/20 hover:bg-white/[0.07] transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`inline-flex items-center justify-center rounded-xl bg-gradient-to-br ${feature.color} p-3`}>
                    {feature.icon}
                  </div>
                  {feature.badge && (
                    <span className="text-[10px] font-bold text-violet-400 bg-violet-500/20 border border-violet-500/30 rounded-full px-2 py-0.5">
                      {feature.badge}
                    </span>
                  )}
                </div>
                <h3 className="text-base font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Pipeline */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pb-20">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-8"
        >
          <h3 className="text-center text-lg font-semibold mb-6">Decision Pipeline</h3>
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
            {[
              { label: 'Neo4j Graph', icon: <GitGraph className="h-4 w-4" />, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
              { label: 'RiskAgent', icon: <Shield className="h-4 w-4" />, color: 'bg-red-500/20 text-red-400 border-red-500/30' },
              { label: 'ConstraintAgent', icon: <Target className="h-4 w-4" />, color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
              { label: 'SimulationAgent', icon: <Zap className="h-4 w-4" />, color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
              { label: 'ModelRouter', icon: <Cpu className="h-4 w-4" />, color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
              { label: 'LLM Synthesis', icon: <BrainCircuit className="h-4 w-4" />, color: 'bg-violet-500/20 text-violet-400 border-violet-500/30' },
              { label: 'Human Decision', icon: <Users className="h-4 w-4" />, color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
            ].map((step, i, arr) => (
              <div key={step.label} className="flex items-center gap-3">
                <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${step.color}`}>
                  {step.icon}
                  <span className="font-medium">{step.label}</span>
                </div>
                {i < arr.length - 1 && <ArrowRight className="h-4 w-4 text-slate-600" />}
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* CTA */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="text-center rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 backdrop-blur p-10"
        >
          <h3 className="text-xl font-bold mb-3">Ready to explore?</h3>
          <p className="text-sm text-slate-400 mb-6">
            Choose your role to access tailored dashboards, or try the AI Co-Pilot and Team Simulator.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => navigate('/select-role')}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 px-6 py-3 text-sm font-medium transition-all shadow-lg shadow-indigo-500/20"
            >
              <Users className="h-4 w-4" />
              Select Role
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                const user = systemUsers.find((u) => u.role === 'engineer');
                selectRole('engineer', user || undefined);
                navigate('/chat');
              }}
              className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 backdrop-blur px-6 py-3 text-sm font-medium transition-all hover:bg-white/10"
            >
              <BrainCircuit className="h-4 w-4 text-violet-400" />
              Try AI Co-Pilot
            </button>
            <button
              onClick={() => {
                const user = systemUsers.find((u) => u.role === 'engineer');
                selectRole('engineer', user || undefined);
                navigate('/simulator');
              }}
              className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 backdrop-blur px-6 py-3 text-sm font-medium transition-all hover:bg-white/10"
            >
              <FlaskConical className="h-4 w-4 text-purple-400" />
              Team Simulator
            </button>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 text-center pb-8">
        <p className="text-xs text-slate-600">
          Built for Datathon 2026 • Ybooks • Decision Intelligence Platform
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;
