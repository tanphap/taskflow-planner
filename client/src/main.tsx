import { supabase } from "@/lib/supabase";
import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient();

const logUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (error.message !== UNAUTHED_ERR_MSG) return;
  // No redirect needed: the UI reactively shows the sign-in form whenever
  // useAuth's Supabase session listener reports a signed-out state.
  console.warn("[Auth] Request rejected as unauthenticated");
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    logUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    logUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

// Self-hosted: VITE_API_URL points at the backend (e.g. Cloudflare Tunnel
// URL of ntpha). Empty = same origin (Manus / backend-served frontend).
const apiBaseUrl = ((import.meta.env.VITE_API_URL as string | undefined) ?? "").replace(/\/+$/, "");

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${apiBaseUrl}/api/trpc`,
      transformer: superjson,
      async headers() {
        // Attach the current Supabase session's access token so the server
        // can verify the signed-in user (see server/_core/context.ts).
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        return token ? { Authorization: ["Bearer", token].join(" ") } : {};
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
