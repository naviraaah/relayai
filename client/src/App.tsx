import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Onboarding from "@/pages/onboarding";
import Console from "@/pages/console";
import RunDetails from "@/pages/run-details";
import CommandCenter from "@/pages/command-center";
import RunsFeed from "@/pages/runs-feed";
import Journal from "@/pages/journal";
import Robots from "@/pages/robots";
import AppLayout from "@/components/app-layout";
import ChatWidget from "@/components/chat-widget";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/command" component={CommandCenter} />
      <Route path="/console/:id" component={Console} />
      <Route path="/run/:runId" component={RunDetails} />
      <Route path="/runs" component={RunsFeed} />
      <Route path="/journal" component={Journal} />
      <Route path="/robots" component={Robots} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppLayout>
          <Router />
        </AppLayout>
        <ChatWidget />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
