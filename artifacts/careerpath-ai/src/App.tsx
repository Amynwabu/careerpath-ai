import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CommandPalette } from "@/components/command-palette";
import NotFound from "@/pages/not-found";
import { AuthProvider, ProtectedRoute } from "@/lib/auth";

// Pages
import Landing from "@/pages/landing";
import Intelligence from "@/pages/intelligence";
import Pricing from "@/pages/pricing";
import Login from "@/pages/login";
import Register from "@/pages/register";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import Dashboard from "@/pages/dashboard";
import Profile from "@/pages/profile";
import ProfileImport, { ProfileGate } from "@/pages/profile-import";
import CareerGoal from "@/pages/career-goal";
import Analysis from "@/pages/analysis";
import Roadmap from "@/pages/roadmap";
import Milestones from "@/pages/milestones";
import AnalysisHistory from "@/pages/history";
import Onboarding from "@/pages/onboarding";
import Webinar from "@/pages/webinar";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        if (error?.status === 401 || error?.status === 404) return false;
        return failureCount < 1;
      },
    },
  },
});

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/" component={Landing} />
      <Route path="/intelligence" component={Intelligence} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/webinar" component={Webinar} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />

      {/* Protected Routes */}
      <Route path="/dashboard"><ProtectedRoute component={Dashboard} /></Route>
      <Route path="/onboarding"><ProtectedRoute component={Onboarding} /></Route>
      <Route path="/profile"><ProtectedRoute component={ProfileGate} /></Route>
      <Route path="/profile/import"><ProtectedRoute component={ProfileImport} /></Route>
      <Route path="/profile/manual"><ProtectedRoute component={Profile} /></Route>
      <Route path="/career-goal"><ProtectedRoute component={CareerGoal} /></Route>
      <Route path="/analysis"><ProtectedRoute component={Analysis} /></Route>
      <Route path="/roadmap"><ProtectedRoute component={Roadmap} /></Route>
      <Route path="/milestones"><ProtectedRoute component={Milestones} /></Route>
      <Route path="/history"><ProtectedRoute component={AnalysisHistory} /></Route>

      {/* 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
            <CommandPalette />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
