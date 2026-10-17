import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Router, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { LanguageProvider } from "./contexts/LanguageContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";

// wouter matches against the full pathname. On GitHub Pages the app is served
// under /taskflow-planner/, so the base prefix must be stripped for "/" to
// match. In local dev BASE_URL is "/" and the base becomes "" (no-op).
const routerBase = import.meta.env.BASE_URL.replace(/\/$/, "");

function AppRouter() {
  return (
    <Router base={routerBase}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Router>
  );
}

function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light" switchable><LanguageProvider><TooltipProvider><Toaster richColors position="top-right" /><AppRouter /></TooltipProvider></LanguageProvider></ThemeProvider></ErrorBoundary>;
}

export default App;
