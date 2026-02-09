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
import { Badge } from '@/components/ui/badge';
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
    <header className="fixed left-0 right-0 top-0 z-30 flex h-14 items-center justify-between border-b border-border/40 bg-background/60 backdrop-blur-md px-6 md:left-64 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      <div className="flex items-center gap-6">
        <SidebarTrigger onClick={onMenuClick} />

        {/* Search with live results */}
        <div ref={searchRef} className="relative hidden lg:block group">
          <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70 group-focus-within:text-primary transition-colors" />
          <Input
            type="text"
            placeholder="Search issues, projects..."
            value={searchQuery}
            onChange={handleSearch}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
            className="w-72 pl-10 pr-12 lg:w-96 h-9 bg-background/40 border-border/40 focus-visible:ring-1 focus-visible:ring-primary/20 focus-visible:border-primary/30 transition-all rounded-lg text-sm"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 px-1.5 py-0.5 rounded border border-border/50 bg-muted/30 pointer-events-none opacity-60 group-focus-within:opacity-0 transition-opacity">
            <span className="text-[10px] font-medium font-sans">⌘</span>
            <span className="text-[10px] font-medium font-sans">K</span>
          </div>

          {showResults && (
            <div className="absolute top-[calc(100%+8px)] left-0 right-0 p-1.5 rounded-xl border border-border/50 bg-popover/95 backdrop-blur-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider uppercase tracking-widest">
                Search Results
              </div>
              <div className="space-y-0.5">
                {searchResults.map((r, i) => (
                  <button
                    key={`${r.type}-${r.id}-${i}`}
                    onClick={() => handleResultClick(r.link)}
                    className="flex w-full items-center gap-3 px-2.5 py-2 text-left text-sm rounded-lg hover:bg-accent/50 transition-all group"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-md border border-border/40 bg-background/50 group-hover:scale-105 transition-transform">
                      {resultIcons[r.type]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{r.name}</p>
                      <p className="text-[10px] text-muted-foreground/70 truncate">{r.subtitle}</p>
                    </div>
                    <Badge variant="outline" className="text-[9px] h-4.5 font-normal border-border/40 bg-muted/20 text-muted-foreground/80 px-1.5">
                      {r.type}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Role Badge */}
        <div className="hidden sm:block">
          <RoleBadge />
        </div>

        <div className="h-4 w-px bg-border/40 mx-1 hidden sm:block" />

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 gap-1.5 rounded-lg border-border/40 bg-background/50 hover:bg-accent/50 shadow-none font-medium">
                <Plus className="h-3.5 w-3.5 text-primary" />
                <span className="hidden xl:inline">Draft</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-xl border-border/40 p-1 bg-popover/95 backdrop-blur-md">
              <DropdownMenuItem onClick={handleCreateTicket} className="rounded-lg gap-2.5 py-2 cursor-pointer">
                <div className="p-1 rounded bg-amber-500/10 text-amber-500">
                  <Ticket className="h-3.5 w-3.5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">New Ticket</span>
                  <span className="text-[10px] text-muted-foreground">Log a bug or task</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/teams')} className="rounded-lg gap-2.5 py-2 cursor-pointer">
                <div className="p-1 rounded bg-blue-500/10 text-blue-500">
                  <FolderKanban className="h-3.5 w-3.5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">View Projects</span>
                  <span className="text-[10px] text-muted-foreground">See all initiatives</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 hover:bg-accent/50 p-0 ring-1 ring-border/20 transition-all border border-border/10">
                <Avatar className="h-7 w-7 pointer-events-none">
                  <AvatarImage src={avatarUrl} alt={displayName} />
                  <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                    {displayName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 rounded-xl border-border/40 p-1.5 bg-popover/95 backdrop-blur-md shadow-2xl">
              <div className="flex items-center gap-3 p-2.5 mb-1 bg-muted/30 rounded-lg border border-border/5">
                <Avatar className="h-10 w-10 ring-2 ring-primary/5">
                  <AvatarImage src={avatarUrl} alt={displayName} />
                  <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
                    {displayName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate leading-none mb-1">{displayName}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{displayEmail}</p>
                </div>
              </div>
              <DropdownMenuSeparator className="bg-border/30 mx-1" />
              <DropdownMenuItem asChild>
                <Link to="/select-role" className="flex items-center gap-3 py-2 px-2.5 rounded-lg cursor-pointer hover:bg-accent/50 group transition-colors">
                  <User className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="text-sm font-medium">Profile Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border/30 mx-1" />
              <DropdownMenuItem
                onClick={handleLogout}
                className="flex items-center gap-3 py-2 px-2.5 rounded-lg text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer group"
              >
                <LogOut className="h-4 w-4 opacity-70 group-hover:opacity-100 transition-opacity" />
                <span className="text-sm font-medium">Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
