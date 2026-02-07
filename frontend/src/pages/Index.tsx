/**
 * Landing Page — Hero, value props, live health widget, CTA to role selector.
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
} from 'lucide-react';
import { useRole, type RoleKey } from '@/context/RoleContext';

const features = [
  {
    icon: <BrainCircuit className="h-6 w-6" />,
    title: 'Multi-Agent Risk Analysis',
    description:
      'Three specialized AI agents (Risk, Constraint, Simulation) reason independently and reach consensus on project health.',
    color: 'from-violet-500/20 to-indigo-500/20 text-violet-400',
  },
  {
    icon: <GitGraph className="h-6 w-6" />,
    title: 'Live Knowledge Graph',
    description:
      'Neo4j-powered graph captures real-time dependencies between teams, projects, tickets, and blockers.',
    color: 'from-blue-500/20 to-cyan-500/20 text-blue-400',
  },
  {
    icon: <Shield className="h-6 w-6" />,
    title: 'Monte Carlo Simulation',
    description:
      '200-trial probabilistic simulation evaluates intervention strategies with 95% confidence intervals.',
    color: 'from-amber-500/20 to-orange-500/20 text-amber-400',
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: 'Role-Gated Intelligence',
    description:
      'Tailored dashboards for Engineers, HR, Finance, and Leadership — each sees what matters most.',
    color: 'from-emerald-500/20 to-green-500/20 text-emerald-400',
  },
];

const roles: { key: RoleKey; label: string; icon: React.ReactNode; color: string }[] = [
  { key: 'engineer', label: 'Engineer', icon: <Code2 className="h-5 w-5" />, color: 'from-blue-500 to-blue-700' },
  { key: 'hr', label: 'HR Manager', icon: <Users className="h-5 w-5" />, color: 'from-green-500 to-green-700' },
  { key: 'chairperson', label: 'Chairperson', icon: <ShieldCheck className="h-5 w-5" />, color: 'from-purple-500 to-purple-700' },
  { key: 'finance', label: 'Finance', icon: <DollarSign className="h-5 w-5" />, color: 'from-amber-500 to-amber-700' },
];

const LandingPage = () => {
  const navigate = useNavigate();
  const { selectRole, systemUsers, currentRole } = useRole();

  // If already has a role selected, redirect
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
      {/* Floating gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/3 w-96 h-96 bg-emerald-500/8 rounded-full blur-3xl" />
      </div>

      {/* Nav */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
            <Cpu className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight">DeliverIQ</span>
            <p className="text-[10px] text-slate-400 leading-none">Decision Intelligence</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full">
            <Activity className="h-3 w-3" />
            System Live
          </span>
          <button
            onClick={() => navigate('/select-role')}
            className="text-sm font-medium text-slate-300 hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-white/5"
          >
            All Roles →
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-20 md:pt-24 md:pb-28">
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

          {/* Quick role select */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
            {roles.map((role) => (
              <button
                key={role.key}
                onClick={() => handleRoleSelect(role.key)}
                className="group flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 backdrop-blur px-5 py-3 text-sm font-medium transition-all hover:scale-105 hover:border-white/25 hover:bg-white/10"
              >
                <div className={`inline-flex items-center justify-center rounded-lg bg-gradient-to-br ${role.color} p-1.5 text-white`}>
                  {role.icon}
                </div>
                {role.label}
                <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-white transition-colors" />
              </button>
            ))}
          </div>

          <p className="text-xs text-slate-600">No login required for demo • Auth architecture supports JWT</p>
        </motion.div>
      </section>

      {/* Features grid */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-center text-2xl font-bold mb-10">
            How It Works
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6 hover:border-white/20 transition-all"
              >
                <div className={`inline-flex items-center justify-center rounded-xl bg-gradient-to-br ${feature.color} p-3 mb-4`}>
                  {feature.icon}
                </div>
                <h3 className="text-base font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Pipeline visualization */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pb-24">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-8"
        >
          <h3 className="text-center text-lg font-semibold mb-6">Decision Pipeline</h3>
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
            {[
              { label: 'Neo4j Graph', icon: <GitGraph className="h-4 w-4" />, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
              { label: 'RiskAgent', icon: <Shield className="h-4 w-4" />, color: 'bg-red-500/20 text-red-400 border-red-500/30' },
              { label: 'ConstraintAgent', icon: <Target className="h-4 w-4" />, color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
              { label: 'SimulationAgent', icon: <Zap className="h-4 w-4" />, color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
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

      {/* Footer */}
      <footer className="relative z-10 text-center pb-8">
        <p className="text-xs text-slate-600">
          Built for Datathon 2026 • Decision Intelligence Platform
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;
