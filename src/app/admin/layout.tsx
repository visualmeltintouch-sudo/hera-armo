"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { createClient } from "@/lib/supabase/client";
import { Sidebar } from "@/components/admin/Sidebar";
import type { User } from "@supabase/supabase-js";

interface AdminContextValue {
  user: User;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminLayout");
  return ctx;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DEV_BYPASS === "true") {
      setUser({ id: "dev", email: "dev@local" } as User);
      setLoading(false);
      return;
    }
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoggingIn(true);
    const { data, error: err } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (err) {
      setError(err.message);
      setLoggingIn(false);
      return;
    }
    setUser(data.user);
    setLoggingIn(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
  }

  if (loading) {
    return (
      <div className="dark min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Caricamento...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="dark min-h-screen bg-background flex items-center justify-center p-4">
        <form
          onSubmit={handleLogin}
          className="bg-card rounded-2xl p-8 w-full max-w-sm space-y-6 border border-border"
        >
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">Armocromia</h1>
            <p className="text-muted-foreground text-sm mt-1">Admin Panel</p>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg p-3">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-muted border border-input rounded-lg px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-muted border border-input rounded-lg px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loggingIn}
            className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-semibold rounded-lg py-3 transition-colors"
          >
            {loggingIn ? "Accesso..." : "Accedi"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <AdminContext.Provider value={{ user }}>
      <div className="dark min-h-screen bg-background flex">
        <Sidebar onLogout={handleLogout} userEmail={user.email || ""} />
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </AdminContext.Provider>
  );
}
