import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { Toaster } from "sonner";
import { routeTree } from "./routeTree.gen";
import { useAppStore } from "@/stores/appStore";
import { useAuthStore } from "@/stores/authStore";
import { loadStaticData } from "@/lib/data";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { TRPCProvider } from "@/lib/trpc";
import type { AppRouter } from "@/server/router";
import "./index.css";

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
    },
  },
});

const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      headers() {
        const token = useAuthStore.getState().session?.access_token;
        return token ? { authorization: `Bearer ${token}` } : {};
      },
    }),
  ],
});

function App() {
  const setStaticData = useAppStore((s) => s.setStaticData);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = useAuthStore.getState().initialize();
    return () => {
      unsubscribe.then((unsub) => unsub());
    };
  }, []);

  useEffect(() => {
    loadStaticData()
      .then((data) => {
        setStaticData(data);
        setLoaded(true);
        return;
      })
      .catch((err: Error) => {
        console.error("[App] Failed to load static data:", err);
        setError(err);
      });
  }, [setStaticData]);

  if (error) throw error;

  if (!loaded) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-950 text-white">
        <p className="animate-pulse text-lg">Chargement des destinations...</p>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        <RouterProvider router={router} />
        <Toaster position="bottom-center" theme="dark" />
      </TRPCProvider>
    </QueryClientProvider>
  );
}

const rootEl = document.getElementById("root")!;
createRoot(rootEl).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
