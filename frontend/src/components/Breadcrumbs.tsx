import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { useTeams } from '@/context/TeamsContext';

export const Breadcrumbs = () => {
    const location = useLocation();
    const { state } = useTeams();
    const pathnames = location.pathname.split('/').filter((x) => x);

    if (pathnames.length === 0 || pathnames[0] === 'dashboard') return null;

    const resolveName = (segment: string, index: number) => {
        // Try to resolve ID to Name
        if (index > 0) {
            const prevSegment = pathnames[index - 1];
            if (prevSegment === 'project' || prevSegment === 'teams') {
                const team = state.teams.find(t => t.id === segment);
                if (team) return team.name;
            }
            // If previous was a team ID, this might be a project ID
            const possibleTeamId = pathnames[index - 1];
            const team = state.teams.find(t => t.id === possibleTeamId);
            if (team) {
                const project = team.projects.find(p => p.id === segment);
                if (project) return project.name;
            }
        }

        // Fallback: Capitalize
        return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
    };

    return (
        <nav className="flex items-center text-xs text-muted-foreground mb-4 overflow-hidden whitespace-nowrap">
            <Link to="/dashboard" className="hover:text-foreground transition-colors flex items-center">
                <Home className="h-3.5 w-3.5" />
            </Link>
            {pathnames.map((value, index) => {
                const to = `/${pathnames.slice(0, index + 1).join('/')}`;
                const isLast = index === pathnames.length - 1;
                const name = resolveName(value, index);

                return (
                    <div key={to} className="flex items-center">
                        <ChevronRight className="h-3 w-3 mx-1.5 text-muted-foreground/50" />
                        {isLast ? (
                            <span className="font-medium text-foreground truncate max-w-[150px]">{name}</span>
                        ) : (
                            <Link to={to} className="hover:text-foreground transition-colors truncate max-w-[100px]">
                                {name}
                            </Link>
                        )}
                    </div>
                );
            })}
        </nav>
    );
};
