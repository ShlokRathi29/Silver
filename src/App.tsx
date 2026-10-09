import { lazy, Suspense, useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Creators = lazy(() => import("./pages/Creators"));
const Team = lazy(() => import("./pages/Team"));

type Page = "dashboard" | "creators" | "team";

function App() {
  const [session, setSession] = useState<boolean | null>(null);
  const [page, setPage] = useState<Page>("dashboard");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(!!data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (session === null) {
    return <div>Loading...</div>;
  }

  if (!session) {
    return (
      <Suspense fallback={<div>Loading...</div>}>
        <Login />
      </Suspense>
    );
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          CreatorGear
        </div>

        <nav className="admin-nav" aria-label="Admin navigation">
          <button className={page === "dashboard" ? "admin-nav-item is-active" : "admin-nav-item"} aria-current={page === "dashboard" ? "page" : undefined} onClick={() => setPage("dashboard")}>
            <svg viewBox="0 0 20 20" aria-hidden="true"><rect x="2.5" y="2.5" width="6" height="6" rx="1" /><rect x="11.5" y="2.5" width="6" height="6" rx="1" /><rect x="2.5" y="11.5" width="6" height="6" rx="1" /><rect x="11.5" y="11.5" width="6" height="6" rx="1" /></svg>
            <span>Dashboard</span>
          </button>

          <button className={page === "creators" ? "admin-nav-item is-active" : "admin-nav-item"} aria-current={page === "creators" ? "page" : undefined} onClick={() => setPage("creators")}>
            <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="7" cy="6" r="3" /><path d="M1.8 16.8c.4-3 2.4-4.7 5.2-4.7s4.8 1.7 5.2 4.7" /><path d="M13 3.4a3 3 0 0 1 0 5.2m1.4 3.7c2.1.7 3.3 2.2 3.7 4.5" /></svg>
            <span>Creators</span>
          </button>

          <button className={page === "team" ? "admin-nav-item is-active" : "admin-nav-item"} aria-current={page === "team" ? "page" : undefined} onClick={() => setPage("team")}>
            <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="7" cy="6" r="2.6" /><circle cx="14" cy="7" r="2.1" /><path d="M1.8 16.8c.3-2.8 2.2-4.4 5.2-4.4s4.9 1.6 5.2 4.4" /><path d="M12.7 12.3c2.8-.3 4.6 1.2 5 4.2" /></svg>
            <span>Team</span>
          </button>
        </nav>
      </aside>

      <main className="main-content">
        <Suspense fallback={<div className="page">Loading...</div>}>
          {page === "dashboard" && <Dashboard />}
          {page === "creators" && <Creators />}
          {page === "team" && <Team />}
        </Suspense>
      </main>
    </div>
  );
}

export default App;
