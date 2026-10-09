import { useState, type FormEvent } from "react";
import { supabase } from "../lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    }

    setLoading(false);
  }

  return (
    <div className="login-page">
      <div className="login-shell">
        <main className="login-panel">
          <div className="login-brand login-brand-compact">
            <span className="login-brand-mark">CG</span>
            <span>CreatorGear</span>
          </div>

          <div className="login-form-heading">
            <span className="login-eyebrow">ADMIN WORKSPACE</span>
            <h2>Welcome back</h2>
            <p>Sign in to continue managing CreatorGear.</p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="login-field">
              <label htmlFor="login-email">Email address</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                autoComplete="username"
                required
              />
            </div>

            <div className="login-field">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
            </div>

            {error && <p className="login-error" role="alert">{error}</p>}

            <button className="login-submit" type="submit" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
              {!loading && <span aria-hidden="true">→</span>}
            </button>
          </form>

          <p className="login-help">Access is managed by your workspace owner.</p>
        </main>
      </div>
    </div>
  );
}
