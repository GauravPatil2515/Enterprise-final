/**
 * RoleSelector — Landing page where the user picks their role.
 * Shows 4 role cards: Engineer, HR, Chairperson, Finance.
 */
import { useNavigate } from 'react-router-dom';
import { useRole, type RoleKey } from '@/context/RoleContext';
import { motion } from 'framer-motion';
import {
  Code2,
  Users,
  ShieldCheck,
  DollarSign,
  ArrowRight,
} from 'lucide-react';

const ROLE_CARDS: { key: RoleKey; label: string; subtitle: string; description: string; icon: React.ReactNode; gradient: string; accent: string }[] = [
  {
    key: 'engineer',
    label: 'Engineer',
    subtitle: 'Development',
    description: 'Tickets, Kanban boards, sprint progress, and AI-powered code risk analysis.',
    icon: <Code2 className="h-6 w-6" />,
    gradient: 'from-blue-500 to-cyan-500',
    accent: 'blue',
  },
  {
    key: 'hr',
    label: 'HR Manager',
    subtitle: 'People Operations',
    description: 'Team workload distribution, member allocation, well-being metrics, and hiring signals.',
    icon: <Users className="h-6 w-6" />,
    gradient: 'from-emerald-500 to-teal-500',
    accent: 'emerald',
  },
  {
    key: 'chairperson',
    label: 'Chairperson',
    subtitle: 'Executive Leadership',
    description: 'Risk dashboards, multi-agent opinions, strategic oversight, and decision authority.',
    icon: <ShieldCheck className="h-6 w-6" />,
    gradient: 'from-violet-500 to-purple-500',
    accent: 'violet',
  },
  {
    key: 'finance',
    label: 'Finance Manager',
    subtitle: 'Financial Strategy',
    description: 'Cost analysis, intervention budgets, resource utilization, and ROI projections.',
    icon: <DollarSign className="h-6 w-6" />,
    gradient: 'from-amber-500 to-orange-500',
    accent: 'amber',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const RoleSelector = () => {
  const { selectRole, systemUsers } = useRole();
  const navigate = useNavigate();

  const handleSelect = (role: RoleKey) => {
    const user = systemUsers.find((u) => u.role === role);
    selectRole(role, user || undefined);
    navigate('/role-dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden flex flex-col items-center justify-center p-6">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.08),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(59,130,246,0.06),transparent_50%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-5xl"
      >
        <motion.div variants={itemVariants} className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Select Your Role
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            Decision Intelligence
          </h1>
          <p className="text-slate-400 text-base max-w-lg mx-auto leading-relaxed">
            Choose your perspective. Each role provides a uniquely tailored
            view of the same graph-powered intelligence layer.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ROLE_CARDS.map((role) => (
            <motion.button
              key={role.key}
              variants={itemVariants}
              onClick={() => handleSelect(role.key)}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.98 }}
              className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm p-6 text-left transition-all duration-300 hover:border-white/15 hover:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-white/20"
            >
              {/* Hover glow */}
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${role.gradient} opacity-0 group-hover:opacity-[0.04] transition-opacity duration-300`} />

              <div className="relative">
                <div
                  className={`inline-flex items-center justify-center rounded-xl bg-gradient-to-br ${role.gradient} p-2.5 text-white mb-5 shadow-lg`}
                >
                  {role.icon}
                </div>

                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">{role.subtitle}</p>
                <h2 className="text-lg font-semibold text-white mb-2">{role.label}</h2>
                <p className="text-[13px] text-slate-400 leading-relaxed mb-5">{role.description}</p>

                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 group-hover:text-white/80 transition-colors">
                  <span>Enter</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        <motion.p variants={itemVariants} className="mt-14 text-center text-[11px] text-slate-600 tracking-wider uppercase">
          Graph  /  Agents  /  LLM  /  Human-in-the-Loop
        </motion.p>
      </motion.div>
    </div>
  );
};

export default RoleSelector;
