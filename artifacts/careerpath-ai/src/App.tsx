import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider, ProtectedRoute } from "@/lib/auth";

// Pages
import Landing from "@/pages/landing";
import Intelligence from "@/pages/intelligence";
import Pricing from "@/pages/pricing";
import JourneyBuilder from "@/pages/journey-builder";
import Advisors from "@/pages/advisors";
import VerifyCertificate from "@/pages/verify-certificate";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import Profile from "@/pages/profile";
import CareerGoal from "@/pages/career-goal";
import Analysis from "@/pages/analysis";
import Roadmap from "@/pages/roadmap";
import Milestones from "@/pages/milestones";
import AnalysisHistory from "@/pages/history";
import Onboarding from "@/pages/onboarding";
import Start from "@/pages/start";

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
      <Route path="/verify/:token" component={VerifyCertificate} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />

      {/* Protected Routes */}
      <Route path="/start"><ProtectedRoute component={Start} /></Route>
      <Route path="/dashboard"><ProtectedRoute component={Dashboard} /></Route>
      <Route path="/onboarding"><ProtectedRoute component={Onboarding} /></Route>
      <Route path="/profile"><ProtectedRoute component={Profile} /></Route>
      <Route path="/career-goal"><ProtectedRoute component={CareerGoal} /></Route>
      <Route path="/analysis"><ProtectedRoute component={Analysis} /></Route>
      <Route path="/roadmap"><ProtectedRoute component={Roadmap} /></Route>
      <Route path="/journey-builder"><ProtectedRoute component={JourneyBuilder} /></Route>
      <Route path="/milestones"><ProtectedRoute component={Milestones} /></Route>
      <Route path="/advisors"><ProtectedRoute component={Advisors} /></Route>
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
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
