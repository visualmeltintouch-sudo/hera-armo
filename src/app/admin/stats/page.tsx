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
        <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
          <div
            className={`h-full rounded-full ${color}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-sm text-foreground/80 w-10 text-right">{value}</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-xl font-bold text-foreground">Statistiche</h1>
        <EventSelectorDropdown />
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-foreground">{sessions.length}</p>
          <p className="text-xs text-muted-foreground">Sessioni</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-primary">
            {codesCount.total}
          </p>
          <p className="text-xs text-muted-foreground">Codici generati</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-hera-verde">
            {codesCount.redeemed}
          </p>
          <p className="text-xs text-muted-foreground">Riscattati</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-secondary">
            {ageCounts.young} / {ageCounts.classic}
          </p>
          <p className="text-xs text-muted-foreground">Giovani / Classic</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">
            Distribuzione Profili
          </h3>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-hera-verde mb-1">
                Ambiente ({profileCounts.ambiente})
              </p>
              {bar(profileCounts.ambiente, sessions.length, "bg-hera-verde")}
            </div>
            <div>
              <p className="text-xs text-primary mb-1">
                Acqua ({profileCounts.acqua})
              </p>
              {bar(profileCounts.acqua, sessions.length, "bg-primary")}
            </div>
            <div>
              <p className="text-xs text-hera-magenta mb-1">
                Energia ({profileCounts.energia})
              </p>
              {bar(profileCounts.energia, sessions.length, "bg-hera-magenta")}
            </div>
            <div>
              <p className="text-xs text-secondary mb-1">
                Hera ({profileCounts.hera})
              </p>
              {bar(profileCounts.hera, sessions.length, "bg-secondary")}
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">
            Punteggi Medi
          </h3>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-hera-verde mb-1">
                Verde ({avgScores.verde})
              </p>
              {bar(avgScores.verde, 30, "bg-hera-verde")}
            </div>
            <div>
              <p className="text-xs text-primary mb-1">
                Ciano ({avgScores.ciano})
              </p>
              {bar(avgScores.ciano, 30, "bg-primary")}
            </div>
            <div>
              <p className="text-xs text-hera-magenta mb-1">
                Magenta ({avgScores.magenta})
              </p>
              {bar(avgScores.magenta, 30, "bg-hera-magenta")}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">
          Stock Premi
        </h3>
        {prizes.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nessun premio configurato</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-muted-foreground">Premio</th>
                  <th className="text-left py-2 px-3 text-muted-foreground">Peso</th>
                  <th className="text-left py-2 px-3 text-muted-foreground">
                    Rimasti / Totale
                  </th>
                  <th className="text-left py-2 px-3 text-muted-foreground">Stato</th>
                </tr>
              </thead>
              <tbody>
                {prizes.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-border/50"
                  >
                    <td className="py-2 px-3 text-foreground/80">{p.label}</td>
                    <td className="py-2 px-3 text-foreground/80">{p.weight}</td>
                    <td className="py-2 px-3">
                      {p.stock_total === null ? (
                        <span className="text-muted-foreground">Illimitato</span>
                      ) : (
                        <span>
                          <span
                            className={
                              (p.stock_remaining || 0) === 0
                                ? "text-destructive"
                                : "text-hera-verde"
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
                          p.is_active ? "text-hera-verde" : "text-muted-foreground"
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
