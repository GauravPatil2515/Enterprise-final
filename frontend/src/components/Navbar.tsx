import { Search, Plus, User, LogOut, Ticket, FolderKanban, Users as UsersIcon } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SidebarTrigger } from './Sidebar';
import RoleBadge from './RoleBadge';
import { useRole } from '@/context/RoleContext';
import { useTeams } from '@/context/TeamsContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface NavbarProps {
  onMenuClick: () => void;
  onSearch?: (query: string) => void;
}

interface SearchResult {
  type: 'project' | 'ticket' | 'team';
  id: string;
  name: string;
  subtitle: string;
  link: string;
}

export const Navbar = ({ onMenuClick, onSearch }: NavbarProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const { currentUser, clearRole } = useRole();
  const { state } = useTeams();
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);

  const displayName = currentUser?.name || 'User';
  const displayEmail = currentUser?.email || 'user@company.com';
  const avatarUrl = currentUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayName}`;

  // Close search results when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch?.(query);

    if (query.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    const q = query.toLowerCase();
    const results: SearchResult[] = [];

    // Search teams
    state.teams.forEach((team) => {
      if (team.name.toLowerCase().includes(q)) {
        results.push({ type: 'team', id: team.id, name: team.name, subtitle: `${team.members.length} members`, link: '/teams' });
      }
      // Search projects
      team.projects.forEach((project) => {
        if (project.name.toLowerCase().includes(q) || project.description?.toLowerCase().includes(q)) {
          results.push({ type: 'project', id: project.id, name: project.name, subtitle: team.name, link: `/project/${team.id}/${project.id}` });
        }
        // Search tickets
        project.tickets.forEach((ticket) => {
          if (ticket.title.toLowerCase().includes(q) || ticket.id.toLowerCase().includes(q)) {
            results.push({ type: 'ticket', id: ticket.id, name: ticket.title, subtitle: `${ticket.id} · ${project.name}`, link: `/project/${team.id}/${project.id}` });
          }
        });
      });
    });

    setSearchResults(results.slice(0, 8));
    setShowResults(results.length > 0);
  };

  const handleResultClick = (link: string) => {
    setShowResults(false);
    setSearchQuery('');
    navigate(link);
  };

  const handleLogout = () => {
    clearRole();
    navigate('/select-role');
  };

  const handleCreateTicket = () => {
    // Navigate to the first available project and open the create modal via URL param
    const firstTeam = state.teams[0];
    const firstProject = firstTeam?.projects[0];
    if (firstTeam && firstProject) {
      navigate(`/project/${firstTeam.id}/${firstProject.id}?create=true`);
    }
  };

  const resultIcons = {
    project: <FolderKanban className="h-3.5 w-3.5 text-blue-400" />,
    ticket: <Ticket className="h-3.5 w-3.5 text-amber-400" />,
    team: <UsersIcon className="h-3.5 w-3.5 text-green-400" />,
  };

  return (
    <header className="fixed left-0 right-0 top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-card/95 backdrop-blur-sm px-4 md:left-64">
      <div className="flex items-center gap-4">
        <SidebarTrigger onClick={onMenuClick} />
        
        {/* Search with live results */}
        <div ref={searchRef} className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search issues, projects..."
            value={searchQuery}
            onChange={handleSearch}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
            className="w-64 pl-9 lg:w-80 h-9"
          />
          {showResults && (
            <div className="absolute top-full left-0 right-0 mt-1 rounded-xl border bg-card shadow-xl z-50 overflow-hidden">
              {searchResults.map((r, i) => (
                <button
                  key={`${r.type}-${r.id}-${i}`}
                  onClick={() => handleResultClick(r.link)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted/50 transition-colors"
                >
                  {resultIcons[r.type]}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{r.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{r.subtitle}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground capitalize">{r.type}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Role Badge */}
        <RoleBadge />

        {/* Create Button — wired to real actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="gap-1 h-8">
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Create</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleCreateTicket}>
              <Ticket className="h-4 w-4 mr-2" /> New Ticket
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/teams')}>
              <FolderKanban className="h-4 w-4 mr-2" /> View Projects
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/teams')}>
              <UsersIcon className="h-4 w-4 mr-2" /> View Teams
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
              <Avatar className="h-7 w-7">
                <AvatarImage src={avatarUrl} alt={displayName} />
                <AvatarFallback className="text-xs">{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="flex items-center gap-3 p-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={avatarUrl} alt={displayName} />
                <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{displayName}</p>
                <p className="text-xs text-muted-foreground">{displayEmail}</p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/select-role" className="flex items-center gap-2 cursor-pointer">
                <User className="h-4 w-4" /> Switch Role
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive cursor-pointer"
            >
              <LogOut className="h-4 w-4 mr-2" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
