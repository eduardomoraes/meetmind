import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Recording from "@/pages/recording";
import MeetingDetail from "@/pages/meeting-detail";
import AIChat from "@/pages/ai-chat";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  // If still loading, show nothing or a loading indicator
  if (isLoading) {
    return <div>Loading...</div>;
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Route path="*" component={Landing} />;
  }

  // Authenticated routes
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/recording" component={Recording} />
      <Route path="/meetings/:id" component={MeetingDetail} />
      <Route path="/chat" component={AIChat} />
      <Route path="/ai-chat" component={AIChat} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
