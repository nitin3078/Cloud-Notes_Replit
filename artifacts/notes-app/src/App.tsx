import { QueryClient, QueryClientProvider, MutationCache } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { toast } from '@/hooks/use-toast';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import Home from './pages/Home';
import { ThemeProvider } from '@/lib/ThemeContext';

function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error && typeof (error as any).message === 'string') {
    return (error as any).message;
  }
  return 'Something went wrong. Please try again.';
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
  // Any mutation that fails (create note, create folder, lock note, etc.) and
  // doesn't handle its own onError still surfaces a toast instead of failing
  // silently with no feedback in the UI.
  mutationCache: new MutationCache({
    onError: (error) => {
      toast({
        title: 'Action failed',
        description: errorMessage(error),
        variant: 'destructive',
      });
    },
  }),
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
