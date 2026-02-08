import { useState, useEffect, Component, type ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/* ── Error Boundary ────────────────────────────────────── */
interface EBProps { children: ReactNode }
interface EBState { hasError: boolean; error?: Error }

class ErrorBoundary extends Component<EBProps, EBState> {
  constructor(props: EBProps) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 p-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10">
            <AlertTriangle className="h-7 w-7 text-red-500" />
          </div>
          <h2 className="text-lg font-semibold">Something went wrong</h2>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ── Main Layout ───────────────────────────────────────── */
export const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Scroll to top on every route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [location.pathname]);

  // Full-bleed pages that shouldn't have container padding
  const fullBleed = ['/graph', '/chat', '/simulator'].includes(location.pathname);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Navbar onMenuClick={() => setSidebarOpen(true)} />
      
      <main className="min-h-screen pt-14 md:ml-64">
        <ErrorBoundary>
          {fullBleed ? (
            <Outlet />
          ) : (
            <div className="p-4 md:p-6 lg:p-8 max-w-[1400px] mx-auto">
              <Outlet />
            </div>
          )}
        </ErrorBoundary>
      </main>
    </div>
  );
};
