"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RedeemResult } from "@/lib/types";

function HeraLogo() {
  return (
    <img
      src="/brand/hera-logo.webp"
      alt="Gruppo Hera"
      className="h-10 w-auto"
      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
    />
  );
}

export default function OperatorPage() {
  const supabase = createClient();

  const [accessCode, setAccessCode] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [operatorName, setOperatorName] = useState("");
  const [loginError, setLoginError] = useState("");
  const [prizeCode, setPrizeCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RedeemResult | null>(null);
  const [redeemCount, setRedeemCount] = useState(0);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    const code = accessCode.trim().toUpperCase();
    if (code.length < 4) return;

    if (process.env.NEXT_PUBLIC_DEV_BYPASS === "true") {
      setOperatorName("Dev Operator");
      setLoggedIn(true);
      return;
    }

    const { data, error } = await supabase
      .from("hera_armo_operators")
      .select("name, is_active")
      .eq("access_code", code)
      .eq("is_active", true)
      .single();

    if (error || !data) {
      setLoginError("Codice non riconosciuto o operatore non attivo");
      return;
    }

    setOperatorName(data.name);
    setLoggedIn(true);
  }

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault();
    if (!prizeCode.trim()) return;
    setLoading(true);
    setResult(null);

    const { data, error } = await supabase.rpc("hera_armo_redeem", {
      p_code: prizeCode.trim().toUpperCase(),
      p_access_code: accessCode.trim().toUpperCase(),
    });

    if (error) {
      setResult({ success: false, error: error.message });
    } else {
      const r = data as RedeemResult;
      setResult(r);
      if (r.success) setRedeemCount((c) => c + 1);
    }

    setLoading(false);
  }

  function handleReset() {
    setPrizeCode("");
    setResult(null);
  }

  function handleLogout() {
    setLoggedIn(false);
    setAccessCode("");
    setPrizeCode("");
    setResult(null);
    setOperatorName("");
    setLoginError("");
    setRedeemCount(0);
  }

  if (!loggedIn) {
    return (
      <div className="dark min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="mb-10">
          <HeraLogo />
        </div>
        <form
          onSubmit={handleLogin}
          className="bg-card rounded-2xl p-8 w-full max-w-sm space-y-6 border border-border"
        >
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold text-foreground">Accesso Operatore</h1>
            <p className="text-sm text-muted-foreground">Inserisci il tuo codice di accesso</p>
          </div>

          {loginError && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg p-3 text-center">
              {loginError}
            </div>
          )}

          <input
            type="text"
            placeholder="CODICE"
            value={accessCode}
            onChange={(e) => { setAccessCode(e.target.value.toUpperCase()); setLoginError(""); }}
            className="w-full bg-muted border border-input rounded-xl px-4 py-4 text-foreground text-center text-2xl tracking-widest font-mono placeholder-muted-foreground focus:outline-none focus:border-primary"
            autoFocus
            autoComplete="off"
            maxLength={10}
            required
          />

          <button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl py-4 text-lg transition-colors"
          >
            Accedi
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="dark min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <HeraLogo />
        <div className="text-right">
          <p className="text-sm font-semibold text-foreground">{operatorName}</p>
          <p className="text-xs text-muted-foreground">{redeemCount} riscossi oggi</p>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-bold text-foreground">Verifica Codice Premio</h2>
            <p className="text-sm text-muted-foreground">
              Inserisci il codice mostrato sul totem dal partecipante
            </p>
          </div>

          <form onSubmit={handleRedeem} className="space-y-4">
            <input
              type="text"
              placeholder="Es. A1234"
              value={prizeCode}
              onChange={(e) => { setPrizeCode(e.target.value.toUpperCase()); setResult(null); }}
              className="w-full bg-card border-2 border-border rounded-2xl px-4 py-5 text-foreground text-center text-4xl tracking-widest font-mono placeholder-muted-foreground/40 focus:outline-none focus:border-primary transition-colors"
              autoFocus
              autoComplete="off"
              maxLength={8}
              required
            />
            <button
              type="submit"
              disabled={loading || !prizeCode.trim()}
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-40 text-primary-foreground font-bold rounded-2xl py-4 text-xl transition-colors"
            >
              {loading ? "Verifica in corso..." : "Verifica Codice"}
            </button>
          </form>

          {/* Risultato */}
          {result && (
            <div className={`rounded-2xl p-6 border-2 text-center space-y-3 ${
              result.success
                ? "bg-[#00A651]/10 border-[#00A651]/40"
                : "bg-destructive/10 border-destructive/30"
            }`}>
              {result.success ? (
                <>
                  <div className="text-5xl">🎉</div>
                  <p className="text-[#00A651] text-2xl font-bold tracking-wide">CODICE VALIDO</p>
                  <p className="text-foreground text-xl font-semibold">{result.prize}</p>
                  {result.event && (
                    <p className="text-muted-foreground text-sm">{result.event}</p>
                  )}
                  <p className="text-muted-foreground text-xs pt-1">
                    Il premio è stato segnato come riscattato
                  </p>
                </>
              ) : (
                <>
                  <div className="text-5xl">❌</div>
                  <p className="text-destructive text-2xl font-bold tracking-wide">CODICE NON VALIDO</p>
                  <p className="text-foreground/80 text-base">{result.error || "Codice inesistente o già utilizzato"}</p>
                </>
              )}
              <button
                onClick={handleReset}
                className="mt-2 text-sm text-muted-foreground hover:text-foreground transition-colors underline"
              >
                Verifica un altro codice
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-4 text-center">
        <button
          onClick={handleLogout}
          className="text-sm text-muted-foreground hover:text-destructive transition-colors"
        >
          Disconnetti
        </button>
      </footer>
    </div>
  );
}
