import { lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, ProtectedRoute } from "@/lib/auth";

const Landing = lazy(() => import("@/pages/landing"));
const Intelligence = lazy(() => import("@/pages/intelligence"));
const Pricing = lazy(() => import("@/pages/pricing"));
const JourneyBuilder = lazy(() => import("@/pages/journey-builder"));
const Advisors = lazy(() => import("@/pages/advisors"));
const VerifyCertificate = lazy(() => import("@/pages/verify-certificate"));
const Login = lazy(() => import("@/pages/login"));
const Register = lazy(() => import("@/pages/register"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Profile = lazy(() => import("@/pages/profile"));
const CareerGoal = lazy(() => import("@/pages/career-goal"));
const Analysis = lazy(() => import("@/pages/analysis"));
const Roadmap = lazy(() => import("@/pages/roadmap"));
const Milestones = lazy(() => import("@/pages/milestones"));
const AnalysisHistory = lazy(() => import("@/pages/history"));
const Onboarding = lazy(() => import("@/pages/onboarding"));
const Start = lazy(() => import("@/pages/start"));
const CareerPlan = lazy(() => import("@/pages/career-plan"));
const CareerData = lazy(() => import("@/pages/career-data"));
const Opportunities = lazy(() => import("@/pages/opportunities"));
const CvOptimisation = lazy(() => import("@/pages/cv-optimisation"));
const InterviewPreparation = lazy(() => import("@/pages/interview-preparation"));
const AdvisorWorkspace = lazy(() => import("@/pages/advisor-workspace"));
const AdvisorSupport = lazy(() => import("@/pages/advisor-support"));
const NotFound = lazy(() => import("@/pages/not-found"));

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
      <Route path="/career-plan"><ProtectedRoute component={CareerPlan} /></Route>
      <Route path="/career-data"><ProtectedRoute component={CareerData} /></Route>
      <Route path="/opportunities"><ProtectedRoute component={Opportunities} /></Route>
      <Route path="/cv-optimisation"><ProtectedRoute component={CvOptimisation} /></Route>
      <Route path="/interview-preparation"><ProtectedRoute component={InterviewPreparation} /></Route>
      <Route path="/analysis"><ProtectedRoute component={Analysis} /></Route>
      <Route path="/roadmap"><ProtectedRoute component={Roadmap} /></Route>
      <Route path="/journey-builder"><ProtectedRoute component={JourneyBuilder} /></Route>
      <Route path="/milestones"><ProtectedRoute component={Milestones} /></Route>
      <Route path="/advisors"><ProtectedRoute component={Advisors} /></Route>
      <Route path="/advisor/cases/:caseId"><ProtectedRoute component={AdvisorWorkspace} /></Route>
      <Route path="/advisor/cases"><ProtectedRoute component={AdvisorWorkspace} /></Route>
      <Route path="/advisor/sessions"><ProtectedRoute component={AdvisorWorkspace} /></Route>
      <Route path="/advisor/reviews"><ProtectedRoute component={AdvisorWorkspace} /></Route>
      <Route path="/advisor/actions"><ProtectedRoute component={AdvisorWorkspace} /></Route>
      <Route path="/advisor"><ProtectedRoute component={AdvisorWorkspace} /></Route>
      <Route path="/career-data/advisor-support"><ProtectedRoute component={AdvisorSupport} /></Route>
      <Route path="/career-data/advisor-support/:caseId"><ProtectedRoute component={AdvisorSupport} /></Route>
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
            <Suspense fallback={<main className="min-h-screen bg-background" aria-busy="true" />}>
              <Router />
            </Suspense>
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
