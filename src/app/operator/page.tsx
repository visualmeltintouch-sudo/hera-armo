"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { HERA_COLORS } from "@/lib/constants";
import type { RedeemResult } from "@/lib/types";

export default function OperatorPage() {
  const supabase = createClient();

  const [accessCode, setAccessCode] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [prizeCode, setPrizeCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RedeemResult | null>(null);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (accessCode.trim().length >= 4) {
      setLoggedIn(true);
    }
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
      setResult(data as RedeemResult);
    }

    setLoading(false);
  }

  function handleReset() {
    setPrizeCode("");
    setResult(null);
  }

  if (!loggedIn) {
    return (
      <div className="dark min-h-screen bg-background flex items-center justify-center p-4">
        <form
          onSubmit={handleLogin}
          className="bg-card rounded-2xl p-8 w-full max-w-sm space-y-6 border border-border"
        >
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">Armocromia</h1>
            <p className="text-muted-foreground text-sm mt-1">Accesso Operatore</p>
          </div>
          <input
            type="text"
            placeholder="Codice Accesso"
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
            className="w-full bg-muted border border-input rounded-lg px-4 py-3 text-foreground text-center text-xl tracking-widest placeholder-muted-foreground focus:outline-none focus:border-primary"
            autoFocus
            required
          />
          <button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg py-3 transition-colors"
          >
            Accedi
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="dark min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Verifica Codice</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Inserisci il codice premio del partecipante
          </p>
        </div>

        <form onSubmit={handleRedeem} className="space-y-4">
          <input
            type="text"
            placeholder="Es. A1234"
            value={prizeCode}
            onChange={(e) => setPrizeCode(e.target.value.toUpperCase())}
            className="w-full bg-card border border-input rounded-lg px-4 py-4 text-foreground text-center text-3xl tracking-widest placeholder-muted-foreground focus:outline-none focus:border-primary"
            autoFocus
            required
          />
          <button
            type="submit"
            disabled={loading || !prizeCode.trim()}
            className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-semibold rounded-lg py-3 transition-colors"
          >
            {loading ? "Verifica..." : "Verifica Codice"}
          </button>
        </form>

        {result && (
          <div
            className={`rounded-xl p-6 border ${
              result.success
                ? "bg-hera-verde/10 border-hera-verde/30"
                : "bg-destructive/10 border-destructive/30"
            }`}
          >
            {result.success ? (
              <div className="text-center space-y-2">
                <p className="text-hera-verde text-xl font-bold">
                  CODICE VALIDO
                </p>
                <p className="text-foreground text-lg">{result.prize}</p>
                <p className="text-muted-foreground text-sm">{result.event}</p>
              </div>
            ) : (
              <div className="text-center space-y-2">
                <p className="text-destructive text-xl font-bold">ERRORE</p>
                <p className="text-foreground/80">{result.error}</p>
              </div>
            )}
            <button
              onClick={handleReset}
              className="w-full mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Verifica un altro codice
            </button>
          </div>
        )}

        <button
          onClick={() => {
            setLoggedIn(false);
            setAccessCode("");
            setPrizeCode("");
            setResult(null);
          }}
          className="w-full text-sm text-muted-foreground hover:text-destructive transition-colors"
        >
          Disconnetti
        </button>
      </div>
    </div>
  );
}
