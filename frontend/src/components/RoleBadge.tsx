/**
 * RoleBadge — Shows the current role in the navbar with a switch-role option.
 */
import { useNavigate } from 'react-router-dom';
import { useRole, type RoleKey } from '@/context/RoleContext';
import {
  Code2,
  Users,
  ShieldCheck,
  DollarSign,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const roleIcons: Record<RoleKey, React.ReactNode> = {
  engineer: <Code2 className="h-3.5 w-3.5" />,
  hr: <Users className="h-3.5 w-3.5" />,
  chairperson: <ShieldCheck className="h-3.5 w-3.5" />,
  finance: <DollarSign className="h-3.5 w-3.5" />,
};

const roleStyles: Record<RoleKey, string> = {
  engineer: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  hr: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  chairperson: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  finance: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
};

const RoleBadge = () => {
  const { currentRole, currentUser, roleConfig, clearRole } = useRole();
  const navigate = useNavigate();

  if (!currentRole || !roleConfig) return null;

  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          'inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all duration-300 shadow-sm',
          roleStyles[currentRole]
        )}
      >
        <div className="flex items-center justify-center">
          {roleIcons[currentRole]}
        </div>
        <span>{roleConfig.label}</span>
      </div>

      {currentUser && (
        <div className="h-4 w-px bg-border/40" />
      )}

      {currentUser && (
        <span className="text-xs font-medium text-muted-foreground/80 hidden lg:inline-block">
          {currentUser.name}
        </span>
      )}

      <button
        onClick={() => {
          clearRole();
          navigate('/select-role');
        }}
        className="text-muted-foreground/50 hover:text-primary transition-all p-1.5 rounded-lg hover:bg-accent/50 group"
        title="Switch Role"
      >
        <LogOut className="h-3.5 w-3.5 group-hover:rotate-12 transition-transform" />
      </button>
    </div>
  );
};

export default RoleBadge;
