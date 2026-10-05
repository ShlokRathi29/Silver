import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Creators from "./pages/Creators";

type Page = "dashboard" | "creators";

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
    return <Login />;
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          CreatorGear
        </div>

        <nav>
          <button onClick={() => setPage("dashboard")}>
            Dashboard
          </button>

          <button onClick={() => setPage("creators")}>
            Creators
          </button>
        </nav>
      </aside>

      <main className="main-content">
        {page === "dashboard" && <Dashboard />}

        {page === "creators" && <Creators />}
      </main>
    </div>
  );
}

export default App;