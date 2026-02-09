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

const ROLE_CARDS: { key: RoleKey; label: string; subtitle: string; description: string; icon: React.ReactNode; color: string; accent: string }[] = [
  {
    key: 'engineer',
    label: 'Engineer',
    subtitle: 'Development',
    description: 'Tickets, Kanban boards, sprint progress, and AI-powered code risk analysis.',
    icon: <Code2 className="h-6 w-6" />,
    color: 'bg-teal-600',
    accent: 'teal',
  },
  {
    key: 'hr',
    label: 'HR Manager',
    subtitle: 'People Operations',
    description: 'Team workload distribution, member allocation, well-being metrics, and hiring signals.',
    icon: <Users className="h-6 w-6" />,
    color: 'bg-emerald-600',
    accent: 'emerald',
  },
  {
    key: 'chairperson',
    label: 'Chairperson',
    subtitle: 'Executive Leadership',
    description: 'Risk dashboards, multi-agent opinions, strategic oversight, and decision authority.',
    icon: <ShieldCheck className="h-6 w-6" />,
    color: 'bg-violet-600',
    accent: 'violet',
  },
  {
    key: 'finance',
    label: 'Finance Manager',
    subtitle: 'Financial Strategy',
    description: 'Cost analysis, intervention budgets, resource utilization, and ROI projections.',
    icon: <DollarSign className="h-6 w-6" />,
    color: 'bg-amber-600',
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
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
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
    <div className="min-h-screen bg-slate-50 relative overflow-hidden flex flex-col items-center justify-center p-6">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-5xl"
      >
        <motion.div variants={itemVariants} className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-6 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Select Your Role
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
            Decision Intelligence
          </h1>
          <p className="text-slate-500 text-base max-w-lg mx-auto leading-relaxed">
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
              className="group relative rounded-2xl border border-border bg-white p-6 text-left transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/50 hover:border-primary/20 focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <div className="relative">
                <div
                  className={`inline-flex items-center justify-center rounded-xl ${role.color} p-2.5 text-white mb-5 shadow-md`}
                >
                  {role.icon}
                </div>

                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">{role.subtitle}</p>
                <h2 className="text-lg font-semibold text-slate-900 mb-2">{role.label}</h2>
                <p className="text-[13px] text-slate-500 leading-relaxed mb-5">{role.description}</p>

                <div className="flex items-center gap-1.5 text-xs font-medium text-primary group-hover:translate-x-1 transition-transform">
                  <span>Enter Dashboard</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        <motion.p variants={itemVariants} className="mt-14 text-center text-[11px] text-slate-400 tracking-wider uppercase">
          Graph  /  Agents  /  LLM  /  Human-in-the-Loop
        </motion.p>
      </motion.div>
    </div>
  );
};

export default RoleSelector;
