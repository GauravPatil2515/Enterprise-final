/**
 * Landing Page — Premium SaaS-style with light theme.
 * Inspired by modern B2B/SaaS landing pages (SlothUI, YBooks).
 */
import { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
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
  LayoutDashboard,
  FlaskConical,
  MessageSquare,
  Globe,
  Lock,
  Layers,
  Menu,
  X,
} from 'lucide-react';
import { useRole, type RoleKey } from '@/context/RoleContext';

/* ─────────────── live metrics ─────────────── */

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
    (async () => {
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
    })();
  }, []);

  return { metrics, loading };
};

/* ─────────────── animated counter ─────────────── */

const AnimatedNumber = ({ value, suffix = '' }: { value: number; suffix?: string }) => {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 1400;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, value]);

  return (
    <span ref={ref}>
      {display}
      {suffix}
    </span>
  );
};

/* ─────────────── data ─────────────── */

const features = [
  {
    icon: <BrainCircuit className="h-6 w-6" />,
    title: 'Multi-Model AI Router',
    description: 'Intent classification routes queries to specialized models — reasoning, explanation, or chain-of-thought.',
    color: 'bg-violet-100 text-violet-600',
  },
  {
    icon: <GitGraph className="h-6 w-6" />,
    title: 'Live Knowledge Graph',
    description: 'Neo4j-powered graph captures real-time dependencies between teams, projects, tickets, and blockers.',
    color: 'bg-blue-100 text-blue-600',
  },
  {
    icon: <Shield className="h-6 w-6" />,
    title: 'Monte Carlo Simulation',
    description: '200-trial probabilistic simulation evaluates intervention strategies with 95% confidence intervals.',
    color: 'bg-amber-100 text-amber-600',
  },
  {
    icon: <FlaskConical className="h-6 w-6" />,
    title: 'Team Composition Lab',
    description: '"What if?" counterfactual analysis — add, remove, or transfer members and see projected risk impact.',
    color: 'bg-pink-100 text-pink-600',
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: 'Role-Gated Dashboards',
    description: 'Tailored dashboards for Engineers, HR, Finance & Leadership — each sees what matters most.',
    color: 'bg-emerald-100 text-emerald-600',
  },
  {
    icon: <BarChart3 className="h-6 w-6" />,
    title: 'Financial Analytics',
    description: 'ROI, cost-to-company, profit analysis per team and project — connect delivery risk to business impact.',
    color: 'bg-cyan-100 text-cyan-600',
  },
];

const roles: { key: RoleKey; label: string; desc: string; icon: React.ReactNode; color: string }[] = [
  { key: 'engineer', label: 'Engineer', desc: 'Sprint health & blockers', icon: <Code2 className="h-6 w-6" />, color: 'bg-blue-600' },
  { key: 'hr', label: 'HR Manager', desc: 'Workforce & workload', icon: <Users className="h-6 w-6" />, color: 'bg-emerald-600' },
  { key: 'chairperson', label: 'Chairperson', desc: 'Company-wide analysis', icon: <ShieldCheck className="h-6 w-6" />, color: 'bg-violet-600' },
  { key: 'finance', label: 'Finance', desc: 'ROI & cost analysis', icon: <DollarSign className="h-6 w-6" />, color: 'bg-amber-600' },
];

const pipelineSteps = [
  { label: 'Neo4j Graph', icon: <GitGraph className="h-4 w-4" /> },
  { label: 'Risk Agent', icon: <Shield className="h-4 w-4" /> },
  { label: 'Constraint Agent', icon: <Target className="h-4 w-4" /> },
  { label: 'Simulation Agent', icon: <Zap className="h-4 w-4" /> },
  { label: 'Model Router', icon: <Cpu className="h-4 w-4" /> },
  { label: 'LLM Synthesis', icon: <BrainCircuit className="h-4 w-4" /> },
  { label: 'Human Decision', icon: <Users className="h-4 w-4" /> },
];

const trustPoints = [
  { icon: <Lock className="h-5 w-5" />, title: 'Zero Hallucination', desc: 'All LLM outputs are grounded in live graph data' },
  { icon: <Layers className="h-5 w-5" />, title: 'Multi-Agent Consensus', desc: '3+ AI agents must agree before recommendations surface' },
  { icon: <Globe className="h-5 w-5" />, title: 'Real-Time Data', desc: 'Decisions based on live Neo4j data — never stale or cached' },
];

/* ─────────────── helpers ─────────────── */

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6, ease: 'easeOut' as const } }),
};

const SectionTitle = ({ badge, title, subtitle }: { badge: string; title: string; subtitle: string }) => (
  <div className="text-center max-w-2xl mx-auto mb-14">
    <motion.span
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-4"
    >
      <Sparkles className="h-3 w-3" />
      {badge}
    </motion.span>
    <motion.h2
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      custom={1}
      className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight mb-4"
    >
      {title}
    </motion.h2>
    <motion.p
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      custom={2}
      className="text-muted-foreground text-base md:text-lg leading-relaxed"
    >
      {subtitle}
    </motion.p>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════ */
/* ─────────────── Component ─────────────── */
/* ═══════════════════════════════════════════════════════════════════════════ */

const LandingPage = () => {
  const navigate = useNavigate();
  const { selectRole, systemUsers, currentRole } = useRole();
  const { metrics } = useLiveMetrics();
  const [mobileNav, setMobileNav] = useState(false);

  const handleRoleSelect = (role: RoleKey) => {
    const user = systemUsers.find((u) => u.role === role);
    selectRole(role, user || undefined);
    navigate('/role-dashboard');
  };

  const goChat = () => {
    const user = systemUsers.find((u) => u.role === 'engineer');
    selectRole('engineer', user || undefined);
    navigate('/chat');
  };

  return (
    <div className="min-h-screen bg-white text-foreground font-sans overflow-x-hidden">
      {/* ───── Background decorations ───── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-grid-black [mask-image:linear-gradient(to_bottom,white,transparent)]" />
      </div>

      {/* ═══════ NAVBAR ═══════ */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-white/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-sm">
              <Cpu className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">DeliverIQ</span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {['Features', 'Architecture', 'Dashboards', 'Trust'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-sm font-medium text-muted-foreground hover:text-foreground px-4 py-2 rounded-lg transition-colors hover:bg-secondary"
              >
                {item}
              </a>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
              <Activity className="h-3 w-3 animate-pulse" />
              System Live
            </span>
            <button
              onClick={() => navigate('/select-role')}
              className="text-sm font-medium text-muted-foreground hover:text-foreground px-4 py-2 rounded-lg transition-colors"
            >
              Sign Up
            </button>
            <button
              onClick={() => navigate('/select-role')}
              className="text-sm font-semibold text-white bg-primary hover:bg-primary-hover px-5 py-2.5 rounded-xl shadow-sm transition-all hover:shadow-md"
            >
              Get Started
            </button>
          </div>

          {/* Mobile hamburger */}
          <button onClick={() => setMobileNav(!mobileNav)} className="md:hidden p-2 rounded-lg hover:bg-secondary">
            {mobileNav ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile nav dropdown */}
        {mobileNav && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="md:hidden border-t border-border bg-white px-6 py-4 space-y-2">
            {['Features', 'Architecture', 'Dashboards', 'Trust'].map((item) => (
              <a key={item} href={`#${item.toLowerCase()}`} onClick={() => setMobileNav(false)} className="block text-sm font-medium text-muted-foreground hover:text-foreground py-2">
                {item}
              </a>
            ))}
            <button onClick={() => navigate('/select-role')} className="w-full text-sm font-semibold text-white bg-primary px-5 py-2.5 rounded-xl mt-2">
              Get Started
            </button>
          </motion.div>
        )}
      </header>

      {/* ═══════ HERO ═══════ */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-16 md:pt-24 pb-10 md:pb-16">
        {/* Floating decorative elements like the reference images */}
        <motion.div
          animate={{ y: [0, -12, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          className="hidden lg:flex absolute top-20 left-8 h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-500 shadow-xl shadow-violet-200/50 rotate-12"
        >
          <BrainCircuit className="h-7 w-7" />
        </motion.div>
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="hidden lg:flex absolute top-32 right-12 h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-500 shadow-xl shadow-emerald-200/50 -rotate-6"
        >
          <CheckCircle2 className="h-6 w-6" />
        </motion.div>
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          className="hidden lg:flex absolute bottom-24 left-16 h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-500 shadow-xl shadow-amber-200/50 rotate-6"
        >
          <BarChart3 className="h-5 w-5" />
        </motion.div>
        <motion.div
          animate={{ y: [0, 14, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="hidden lg:flex absolute bottom-16 right-20 h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-500 shadow-xl shadow-blue-200/50 -rotate-12"
        >
          <GitGraph className="h-6 w-6" />
        </motion.div>

        <div className="text-center max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-primary bg-primary/8 border border-primary/15 px-4 py-1.5 rounded-full mb-6">
              <Sparkles className="h-3.5 w-3.5" />
              Decision Intelligence Platform
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6"
          >
            Work Smarter with{' '}
            <span className="text-primary">
              AI-Driven
            </span>{' '}
            Decisions.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Real engineering data from Neo4j, analyzed by specialist AI agents, synthesized into
            role-gated executive reports. Make decisions backed by evidence, not instinct.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-4 mb-6"
          >
            <button
              onClick={() => navigate('/select-role')}
              className="group flex items-center gap-2.5 text-sm font-semibold text-white bg-primary hover:bg-primary-hover px-7 py-3.5 rounded-2xl shadow-md transition-all hover:shadow-lg hover:scale-[1.02]"
            >
              <span>Get Started Today</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button
              onClick={goChat}
              className="flex items-center gap-2.5 text-sm font-semibold text-foreground bg-white border-2 border-border hover:border-primary/30 px-7 py-3.5 rounded-2xl shadow-sm transition-all hover:shadow-md hover:bg-primary/5"
            >
              <MessageSquare className="h-4 w-4 text-primary" />
              Try AI Co-Pilot
            </button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-xs text-muted-foreground/60"
          >
            No login required for demo • JWT auth architecture ready
          </motion.p>
        </div>
      </section>

      {/* ═══════ STATS BAR ═══════ */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6"
        >
          {[
            { value: metrics?.totalProjects || 6, suffix: '+', label: 'Active Projects', color: 'text-primary' },
            { value: metrics?.totalMembers || 8, suffix: '+', label: 'Team Members', color: 'text-violet-600' },
            { value: metrics?.completionRate || 45, suffix: '%', label: 'Completion Rate', color: 'text-emerald-600' },
            { value: metrics?.agentsActive || 6, suffix: '', label: 'AI Agents Active', color: 'text-amber-600' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center p-6 rounded-2xl bg-secondary/50 border border-border/50"
            >
              <div className={`text-3xl md:text-4xl font-extrabold ${stat.color} mb-1`}>
                <AnimatedNumber value={stat.value} suffix={stat.suffix} />
              </div>
              <div className="text-sm text-muted-foreground font-medium">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ═══════ PRODUCT SHOWCASE ═══════ */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative"
        >
          {/* Glass frame around the dashboard mockup */}
          <div className="rounded-3xl border border-border/80 bg-secondary/30 p-2 md:p-3 shadow-2xl shadow-primary/10">
            {/* Top bar mockup */}
            <div className="rounded-2xl border border-border bg-white overflow-hidden">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-secondary/50">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="flex items-center gap-2 bg-white rounded-lg border border-border px-4 py-1.5 text-xs text-muted-foreground min-w-[260px]">
                    <Lock className="h-3 w-3" />
                    deliveriq.app/dashboard
                  </div>
                </div>
              </div>

              {/* Dashboard screenshot mockup */}
              <div className="p-6 md:p-8 bg-white/50">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                    <Cpu className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-bold">DeliverIQ Dashboard</div>
                    <div className="text-[10px] text-muted-foreground">Decision Intelligence Platform</div>
                  </div>
                </div>

                {/* Stat row mockup */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  {[
                    { label: 'Teams Active', value: '3', icon: <Users className="h-4 w-4" />, color: 'bg-blue-100 text-blue-600' },
                    { label: 'Projects', value: '6', icon: <Target className="h-4 w-4" />, color: 'bg-violet-100 text-violet-600' },
                    { label: 'Completion', value: '45%', icon: <CheckCircle2 className="h-4 w-4" />, color: 'bg-emerald-100 text-emerald-600' },
                    { label: 'AI Agents', value: '6', icon: <BrainCircuit className="h-4 w-4" />, color: 'bg-amber-100 text-amber-600' },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center gap-3 rounded-xl border border-border bg-white p-3 shadow-sm">
                      <div className={`h-9 w-9 rounded-lg ${s.color} flex items-center justify-center`}>{s.icon}</div>
                      <div>
                        <div className="text-lg font-bold">{s.value}</div>
                        <div className="text-[10px] text-muted-foreground">{s.label}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Chart row mockup */}
                <div className="grid md:grid-cols-3 gap-3">
                  <div className="md:col-span-2 rounded-xl border border-border bg-white p-4 shadow-sm">
                    <div className="text-xs font-semibold mb-3">Project Health Overview</div>
                    <div className="flex items-end gap-2 h-24">
                      {[65, 42, 78, 55, 90, 35, 72, 60, 85, 48].map((h, i) => (
                        <motion.div
                          key={i}
                          initial={{ height: 0 }}
                          whileInView={{ height: `${h}%` }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.8 + i * 0.05, duration: 0.5 }}
                          className="flex-1 rounded-t-md bg-primary"
                        />
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-white p-4 shadow-sm flex flex-col items-center justify-center">
                    <div className="text-xs font-semibold mb-3">Risk Score</div>
                    <div className="relative h-20 w-20">
                      <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90">
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
                        <motion.circle
                          cx="18"
                          cy="18"
                          r="15.9"
                          fill="none"
                          stroke="hsl(var(--primary))"
                          strokeWidth="3"
                          strokeDasharray="100"
                          initial={{ strokeDashoffset: 100 }}
                          whileInView={{ strokeDashoffset: 28 }}
                          viewport={{ once: true }}
                          transition={{ delay: 1, duration: 1 }}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center text-sm font-bold">72%</div>
                    </div>
                    <div className="text-[10px] text-emerald-600 font-medium mt-1">Low Risk</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating mobile mockup */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="hidden lg:block absolute -right-8 -bottom-8 w-48"
          >
            <div className="rounded-2xl border border-border bg-white p-3 shadow-2xl shadow-primary/15">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-5 w-5 rounded-md bg-primary flex items-center justify-center">
                  <Cpu className="h-2.5 w-2.5 text-white" />
                </div>
                <span className="text-[9px] font-bold">DeliverIQ</span>
              </div>
              <div className="space-y-2">
                {['Projects: 6', 'Teams: 3', 'Risk: Low'].map((line) => (
                  <div key={line} className="flex items-center gap-2 rounded-lg bg-secondary/80 p-2">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <span className="text-[8px] font-medium">{line}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ═══════ FEATURES ═══════ */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <SectionTitle badge="Features" title="Everything You Need to Decide Faster" subtitle="Six powerful AI-native capabilities that turn raw engineering data into executive-grade insights." />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={i}
              className="group rounded-2xl border border-border bg-white p-6 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 transition-all duration-300"
            >
              <div className={`inline-flex items-center justify-center h-12 w-12 rounded-xl ${f.color} mb-5 group-hover:scale-110 transition-transform`}>
                {f.icon}
              </div>
              <h3 className="text-base font-bold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══════ ARCHITECTURE PIPELINE ═══════ */}
      <section id="architecture" className="relative z-10 bg-secondary/30 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <SectionTitle badge="Architecture" title="End-to-End Decision Pipeline" subtitle="From raw graph data to human-ready insights in seven intelligent steps." />
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="flex flex-wrap items-center justify-center gap-3"
          >
            {pipelineSteps.map((step, i, arr) => (
              <motion.div
                key={step.label}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center gap-3"
              >
                <div className="flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-3 shadow-sm hover:shadow-md hover:border-primary/30 transition-all">
                  <div className="text-primary">{step.icon}</div>
                  <span className="text-sm font-medium">{step.label}</span>
                </div>
                {i < arr.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground/40 hidden sm:block" />}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════ ROLE DASHBOARDS ═══════ */}
      <section id="dashboards" className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <SectionTitle badge="Dashboards" title="One Platform, Four Perspectives" subtitle="Tailored dashboards for Engineering, HR, Finance, and Leadership — each sees what matters most." />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {roles.map((role, i) => (
            <motion.button
              key={role.key}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={i}
              onClick={() => handleRoleSelect(role.key)}
              className="group relative rounded-2xl border border-border bg-white p-6 text-left hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 transition-all duration-300 overflow-hidden"
            >
              {/* hover bar */}
              <div className={`absolute top-0 left-0 right-0 h-1 ${role.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
              <div className={`inline-flex items-center justify-center h-14 w-14 rounded-2xl ${role.color} text-white mb-5 shadow-md group-hover:scale-110 transition-transform`}>
                {role.icon}
              </div>
              <h3 className="text-base font-bold text-foreground mb-1">{role.label}</h3>
              <p className="text-sm text-muted-foreground mb-4">{role.desc}</p>
              <div className="flex items-center gap-1 text-xs font-semibold text-primary">
                Open Dashboard
                <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.button>
          ))}
        </div>
      </section>

      {/* ═══════ TRUST / PRINCIPLES ═══════ */}
      <section id="trust" className="relative z-10 bg-secondary/30 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <SectionTitle badge="Trust & Safety" title="Built on Transparency" subtitle="Every recommendation is explainable, verifiable, and grounded in real data." />
          <div className="grid sm:grid-cols-3 gap-6">
            {trustPoints.map((tp, i) => (
              <motion.div
                key={tp.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 hover:shadow-md transition-all"
              >
                <div className="h-11 w-11 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                  {tp.icon}
                </div>
                <h3 className="text-sm font-bold text-foreground mb-1">{tp.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{tp.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ FINAL CTA ═══════ */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center rounded-3xl border border-border bg-white p-10 md:p-14 shadow-sm"
        >
          <h2 className="text-2xl md:text-3xl font-extrabold mb-4">Ready to make better decisions?</h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Choose your role to access tailored dashboards, or try the AI Co-Pilot and Team Simulator right now.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => navigate('/select-role')}
              className="group flex items-center gap-2 text-sm font-semibold text-white bg-gradient-to-r from-primary to-violet-600 px-7 py-3.5 rounded-2xl shadow-lg shadow-primary/20 hover:shadow-xl hover:scale-[1.02] transition-all"
            >
              <LayoutDashboard className="h-4 w-4" />
              Select Your Role
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button
              onClick={goChat}
              className="flex items-center gap-2 text-sm font-semibold text-foreground bg-white border-2 border-border hover:border-primary/30 px-7 py-3.5 rounded-2xl shadow-sm hover:shadow-md transition-all"
            >
              <BrainCircuit className="h-4 w-4 text-violet-500" />
              Try AI Co-Pilot
            </button>
            <button
              onClick={() => {
                const user = systemUsers.find((u) => u.role === 'engineer');
                selectRole('engineer', user || undefined);
                navigate('/simulator');
              }}
              className="flex items-center gap-2 text-sm font-semibold text-foreground bg-white border-2 border-border hover:border-primary/30 px-7 py-3.5 rounded-2xl shadow-sm hover:shadow-md transition-all"
            >
              <FlaskConical className="h-4 w-4 text-purple-500" />
              Team Simulator
            </button>
          </div>
        </motion.div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer className="relative z-10 border-t border-border bg-secondary/30">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="grid sm:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="sm:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                  <Cpu className="h-4 w-4 text-white" />
                </div>
                <span className="font-bold text-foreground">DeliverIQ</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                AI-Driven Decision Intelligence Platform for enterprise software delivery.
              </p>
            </div>

            {/* Links */}
            {[
              { title: 'Product', links: ['Features', 'Architecture', 'Dashboards', 'Pricing'] },
              { title: 'Resources', links: ['Documentation', 'API Reference', 'Blog', 'Support'] },
              { title: 'Company', links: ['About', 'Careers', 'Contact', 'Legal'] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-border gap-3">
            <p className="text-xs text-muted-foreground">
              © 2026 DeliverIQ. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Terms</a>
              <span className="flex items-center gap-1.5 text-xs text-emerald-600">
                <Activity className="h-3 w-3 animate-pulse" />
                All Systems Operational
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
