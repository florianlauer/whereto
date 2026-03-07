import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { routeTree } from "./routeTree.gen";
import { useAppStore } from "@/stores/appStore";
import { loadStaticData } from "@/lib/data";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import "./index.css";

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function App() {
  const setStaticData = useAppStore((s) => s.setStaticData);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadStaticData()
      .then((data) => {
        setStaticData(data);
        setLoaded(true);
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
        <p className="animate-pulse text-lg">Chargement des destinations…</p>
      </div>
    );
  }

  return (
    <>
      <RouterProvider router={router} />
      <Toaster position="bottom-center" theme="dark" />
    </>
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
