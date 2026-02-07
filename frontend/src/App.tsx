import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TeamsProvider } from "@/context/TeamsContext";
import { RoleProvider } from "@/context/RoleContext";
import { MainLayout } from "@/layouts/MainLayout";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import ProjectView from "./pages/ProjectView";
import TeamOverview from "./pages/TeamOverview";
import RiskAnalysis from "./pages/RiskAnalysis";
import RoleSelector from "./pages/RoleSelector";
import RoleDashboard from "./pages/RoleDashboard";
import GraphVisualization from "./pages/GraphVisualization";
import ChatPage from './pages/ChatPage';
import TeamSimulator from './pages/TeamSimulator';
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <RoleProvider>
      <TeamsProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
              {/* Landing page (no layout) */}
              <Route path="/" element={<Index />} />

              {/* Role selection (no layout) */}
              <Route path="/select-role" element={<RoleSelector />} />

              {/* Main app (with layout) */}
              <Route element={<MainLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/role-dashboard" element={<RoleDashboard />} />
                <Route path="/teams" element={<TeamOverview />} />
                <Route path="/projects" element={<TeamOverview />} />
                <Route path="/project/:teamId/:projectId" element={<ProjectView />} />
                <Route path="/project/:teamId/:projectId/risk" element={<RiskAnalysis />} />
                <Route path="/graph" element={<GraphVisualization />} />
                <Route path="/chat" element={<ChatPage />} />
                <Route path="/simulator" element={<TeamSimulator />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </TeamsProvider>
    </RoleProvider>
  </QueryClientProvider>
);

export default App;
