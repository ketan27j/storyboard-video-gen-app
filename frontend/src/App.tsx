import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StoryboardPage } from './pages/StoryboardPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 10_000 },
    mutations: { retry: 0 },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <StoryboardPage />
    </QueryClientProvider>
  );
}
