"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  EventSelectorProvider,
  EventSelectorDropdown,
  useEventSelector,
} from "@/components/admin/EventSelector";
import type { ArmoSession, ArmoPrize } from "@/lib/types";

function StatsContent() {
  const supabase = createClient();
  const { selectedEventId } = useEventSelector();
  const [sessions, setSessions] = useState<ArmoSession[]>([]);
  const [prizes, setPrizes] = useState<ArmoPrize[]>([]);
  const [codesCount, setCodesCount] = useState({ total: 0, redeemed: 0 });

  async function load() {
    if (!selectedEventId) return;
    const [{ data: sess }, { data: priz }, { data: codes }] =
      await Promise.all([
        supabase
          .from("hera_armo_sessions")
          .select("*")
          .eq("event_id", selectedEventId),
        supabase
          .from("hera_armo_prizes")
          .select("*")
          .eq("event_id", selectedEventId),
        supabase
          .from("hera_armo_codes")
          .select("status")
          .eq("event_id", selectedEventId),
      ]);
    setSessions((sess as ArmoSession[]) || []);
    setPrizes((priz as ArmoPrize[]) || []);
    const codeList = (codes as { status: string }[]) || [];
    setCodesCount({
      total: codeList.length,
      redeemed: codeList.filter((c) => c.status === "redeemed").length,
    });
  }

  useEffect(() => {
    load();
  }, [selectedEventId]);

  const profileCounts = {
    ambiente: sessions.filter((s) => s.profile_key === "ambiente").length,
    acqua: sessions.filter((s) => s.profile_key === "acqua").length,
    energia: sessions.filter((s) => s.profile_key === "energia").length,
    hera: sessions.filter((s) => s.profile_key === "hera").length,
  };

  const ageCounts = {
    young: sessions.filter((s) => s.age_group === "young").length,
    classic: sessions.filter((s) => s.age_group === "classic").length,
  };

  const avgScores =
    sessions.length > 0
      ? {
          verde: Math.round(
            sessions.reduce((s, x) => s + x.score_verde, 0) / sessions.length
          ),
          ciano: Math.round(
            sessions.reduce((s, x) => s + x.score_ciano, 0) / sessions.length
          ),
          magenta: Math.round(
            sessions.reduce((s, x) => s + x.score_magenta, 0) /
              sessions.length
          ),
        }
      : { verde: 0, ciano: 0, magenta: 0 };

  function bar(value: number, max: number, color: string) {
    const pct = max > 0 ? (value / max) * 100 : 0;
    return (
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-gray-800 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full rounded-full ${color}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-sm text-gray-300 w-10 text-right">{value}</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-xl font-bold text-white">Statistiche</h1>
        <EventSelectorDropdown />
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-white">{sessions.length}</p>
          <p className="text-xs text-gray-400">Sessioni</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-cyan-400">
            {codesCount.total}
          </p>
          <p className="text-xs text-gray-400">Codici generati</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-green-400">
            {codesCount.redeemed}
          </p>
          <p className="text-xs text-gray-400">Riscattati</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-purple-400">
            {ageCounts.young} / {ageCounts.classic}
          </p>
          <p className="text-xs text-gray-400">Giovani / Classic</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-medium text-gray-400 mb-4">
            Distribuzione Profili
          </h3>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-green-400 mb-1">
                Ambiente ({profileCounts.ambiente})
              </p>
              {bar(profileCounts.ambiente, sessions.length, "bg-green-500")}
            </div>
            <div>
              <p className="text-xs text-cyan-400 mb-1">
                Acqua ({profileCounts.acqua})
              </p>
              {bar(profileCounts.acqua, sessions.length, "bg-cyan-500")}
            </div>
            <div>
              <p className="text-xs text-pink-400 mb-1">
                Energia ({profileCounts.energia})
              </p>
              {bar(profileCounts.energia, sessions.length, "bg-pink-500")}
            </div>
            <div>
              <p className="text-xs text-purple-400 mb-1">
                Hera ({profileCounts.hera})
              </p>
              {bar(profileCounts.hera, sessions.length, "bg-purple-500")}
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-medium text-gray-400 mb-4">
            Punteggi Medi
          </h3>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-green-400 mb-1">
                Verde ({avgScores.verde})
              </p>
              {bar(avgScores.verde, 30, "bg-green-500")}
            </div>
            <div>
              <p className="text-xs text-cyan-400 mb-1">
                Ciano ({avgScores.ciano})
              </p>
              {bar(avgScores.ciano, 30, "bg-cyan-500")}
            </div>
            <div>
              <p className="text-xs text-pink-400 mb-1">
                Magenta ({avgScores.magenta})
              </p>
              {bar(avgScores.magenta, 30, "bg-pink-500")}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-medium text-gray-400 mb-4">
          Stock Premi
        </h3>
        {prizes.length === 0 ? (
          <p className="text-gray-500 text-sm">Nessun premio configurato</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-2 px-3 text-gray-400">Premio</th>
                  <th className="text-left py-2 px-3 text-gray-400">Peso</th>
                  <th className="text-left py-2 px-3 text-gray-400">
                    Rimasti / Totale
                  </th>
                  <th className="text-left py-2 px-3 text-gray-400">Stato</th>
                </tr>
              </thead>
              <tbody>
                {prizes.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-gray-800/50"
                  >
                    <td className="py-2 px-3 text-gray-300">{p.label}</td>
                    <td className="py-2 px-3 text-gray-300">{p.weight}</td>
                    <td className="py-2 px-3">
                      {p.stock_total === null ? (
                        <span className="text-gray-500">Illimitato</span>
                      ) : (
                        <span>
                          <span
                            className={
                              (p.stock_remaining || 0) === 0
                                ? "text-red-400"
                                : "text-green-400"
                            }
                          >
                            {p.stock_remaining}
                          </span>
                          /{p.stock_total}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={
                          p.is_active ? "text-green-400" : "text-gray-500"
                        }
                      >
                        {p.is_active ? "Attivo" : "Inattivo"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function StatsPage() {
  return (
    <EventSelectorProvider>
      <StatsContent />
    </EventSelectorProvider>
  );
}
