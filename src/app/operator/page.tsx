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
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <form
          onSubmit={handleLogin}
          className="bg-gray-900 rounded-2xl p-8 w-full max-w-sm space-y-6 border border-gray-800"
        >
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">Armocromia</h1>
            <p className="text-gray-400 text-sm mt-1">Accesso Operatore</p>
          </div>
          <input
            type="text"
            placeholder="Codice Accesso"
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-center text-xl tracking-widest placeholder-gray-500 focus:outline-none focus:border-cyan-500"
            autoFocus
            required
          />
          <button
            type="submit"
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg py-3 transition-colors"
          >
            Accedi
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Verifica Codice</h1>
          <p className="text-gray-400 text-sm mt-1">
            Inserisci il codice premio del partecipante
          </p>
        </div>

        <form onSubmit={handleRedeem} className="space-y-4">
          <input
            type="text"
            placeholder="Es. A1234"
            value={prizeCode}
            onChange={(e) => setPrizeCode(e.target.value.toUpperCase())}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-4 text-white text-center text-3xl tracking-widest placeholder-gray-600 focus:outline-none focus:border-cyan-500"
            autoFocus
            required
          />
          <button
            type="submit"
            disabled={loading || !prizeCode.trim()}
            className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold rounded-lg py-3 transition-colors"
          >
            {loading ? "Verifica..." : "Verifica Codice"}
          </button>
        </form>

        {result && (
          <div
            className={`rounded-xl p-6 border ${
              result.success
                ? "bg-green-900/30 border-green-700"
                : "bg-red-900/30 border-red-700"
            }`}
          >
            {result.success ? (
              <div className="text-center space-y-2">
                <p className="text-green-400 text-xl font-bold">
                  CODICE VALIDO
                </p>
                <p className="text-white text-lg">{result.prize}</p>
                <p className="text-gray-400 text-sm">{result.event}</p>
              </div>
            ) : (
              <div className="text-center space-y-2">
                <p className="text-red-400 text-xl font-bold">ERRORE</p>
                <p className="text-gray-300">{result.error}</p>
              </div>
            )}
            <button
              onClick={handleReset}
              className="w-full mt-4 text-sm text-gray-400 hover:text-white transition-colors"
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
          className="w-full text-sm text-gray-500 hover:text-red-400 transition-colors"
        >
          Disconnetti
        </button>
      </div>
    </div>
  );
}
