"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useEventSelector, EventSelectorProvider, EventSelectorDropdown } from "@/components/admin/EventSelector";
import { HERA_COLORS } from "@/lib/constants";
import type { ProfileKey } from "@/lib/types";

interface Stats {
  totalSessions: number;
  todaySessions: number;
  avgSessionsPerHour: number;
  profileCounts: Record<ProfileKey, number>;
  ageCounts: { young: number; classic: number };
  topProfiles: { profile_key: ProfileKey; count: number }[];
  codeStats: { generated: number; redeemed: number; expired: number };
  prizeStats: { name: string; redeemed: number; remaining: number | null }[];
  recentSessions: { profile_key: ProfileKey; age_group: string; played_at: string }[];
  scoreAvg: { verde: number; ciano: number; magenta: number };
}

const PROFILE_LABELS: Record<ProfileKey, string> = {
  ambiente: "Ambiente",
  acqua: "Acqua",
  energia: "Energia",
  hera: "Hera Mix",
};

const PROFILE_COLORS: Record<ProfileKey, string> = {
  ambiente: HERA_COLORS.verde,
  acqua: HERA_COLORS.ciano,
  energia: HERA_COLORS.magenta,
  hera: "#867cd0",
};

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-background border border-border rounded-xl p-5 space-y-1 shadow-sm">
      <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-3xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function ProfileBar({ profile, count, total }: { profile: ProfileKey; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-foreground">{PROFILE_LABELS[profile]}</span>
        <span className="text-muted-foreground">{count} ({pct}%)</span>
      </div>
      <div className="w-full bg-muted rounded-full h-2.5">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: PROFILE_COLORS[profile] }}
        />
      </div>
    </div>
  );
}

function DashboardContent() {
  const supabase = createClient();
  const { selectedEventId } = useEventSelector();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  async function load() {
    if (!selectedEventId) return;
    setLoading(true);

    const [sessionsRes, codesRes, prizesRes] = await Promise.all([
      supabase
        .from("hera_armo_sessions")
        .select("profile_key, age_group, score_verde, score_ciano, score_magenta, played_at")
        .eq("event_id", selectedEventId),
      supabase
        .from("hera_armo_codes")
        .select("status")
        .eq("event_id", selectedEventId),
      supabase
        .from("hera_armo_prizes")
        .select("name, stock_total, stock_remaining")
        .eq("event_id", selectedEventId)
        .eq("is_active", true),
    ]);

    const sessions = sessionsRes.data || [];
    const codes = codesRes.data || [];
    const prizes = prizesRes.data || [];

    const today = new Date().toISOString().slice(0, 10);
    const todaySessions = sessions.filter((s) => s.played_at.startsWith(today)).length;

    const profileCounts: Record<ProfileKey, number> = {
      ambiente: 0, acqua: 0, energia: 0, hera: 0,
    };
    const ageCounts = { young: 0, classic: 0 };
    let sumVerde = 0, sumCiano = 0, sumMagenta = 0;

    for (const s of sessions) {
      if (s.profile_key in profileCounts) profileCounts[s.profile_key as ProfileKey]++;
      if (s.age_group === "young") ageCounts.young++;
      else ageCounts.classic++;
      sumVerde += s.score_verde;
      sumCiano += s.score_ciano;
      sumMagenta += s.score_magenta;
    }

    const n = sessions.length || 1;
    const scoreAvg = {
      verde: Math.round(sumVerde / n),
      ciano: Math.round(sumCiano / n),
      magenta: Math.round(sumMagenta / n),
    };

    const topProfiles = (Object.entries(profileCounts) as [ProfileKey, number][])
      .sort((a, b) => b[1] - a[1])
      .map(([profile_key, count]) => ({ profile_key, count }));

    const codeStats = {
      generated: codes.filter((c) => c.status === "generated").length,
      redeemed: codes.filter((c) => c.status === "redeemed").length,
      expired: codes.filter((c) => c.status === "expired").length,
    };

    const prizeStats = prizes.map((p) => ({
      name: p.name,
      redeemed: p.stock_total != null && p.stock_remaining != null
        ? p.stock_total - p.stock_remaining
        : 0,
      remaining: p.stock_remaining,
    }));

    const recentSessions = [...sessions]
      .sort((a, b) => b.played_at.localeCompare(a.played_at))
      .slice(0, 10)
      .map((s) => ({ profile_key: s.profile_key as ProfileKey, age_group: s.age_group, played_at: s.played_at }));

    // Average sessions per hour (based on first/last played)
    let avgPerHour = 0;
    if (sessions.length >= 2) {
      const sorted = sessions.map((s) => s.played_at).sort();
      const firstMs = new Date(sorted[0]).getTime();
      const lastMs = new Date(sorted[sorted.length - 1]).getTime();
      const hours = (lastMs - firstMs) / (1000 * 60 * 60);
      avgPerHour = hours > 0 ? Math.round(sessions.length / hours) : sessions.length;
    }

    setStats({
      totalSessions: sessions.length,
      todaySessions,
      avgSessionsPerHour: avgPerHour,
      profileCounts,
      ageCounts,
      topProfiles,
      codeStats,
      prizeStats,
      recentSessions,
      scoreAvg,
    });
    setLastRefresh(new Date());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [selectedEventId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
          <EventSelectorDropdown />
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-xs text-muted-foreground">
              Aggiornato {lastRefresh.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button
            onClick={load}
            disabled={loading || !selectedEventId}
            className="bg-primary hover:bg-primary/90 disabled:opacity-40 text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {loading ? "..." : "↺ Aggiorna"}
          </button>
        </div>
      </div>

      {!selectedEventId && (
        <div className="text-center py-20 text-muted-foreground">
          Seleziona un evento per vedere le statistiche
        </div>
      )}

      {selectedEventId && loading && !stats && (
        <div className="text-center py-20 text-muted-foreground">Caricamento statistiche...</div>
      )}

      {stats && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-4 gap-4">
            <StatCard label="Partecipazioni totali" value={stats.totalSessions} />
            <StatCard label="Oggi" value={stats.todaySessions} />
            <StatCard label="Media / ora" value={stats.avgSessionsPerHour} sub="dalla prima partita" />
            <StatCard
              label="Codici riscattati"
              value={`${stats.codeStats.redeemed}/${stats.codeStats.redeemed + stats.codeStats.generated}`}
              sub={`${stats.codeStats.generated} ancora da riscattare`}
            />
          </div>

          {/* Profiles + Age split */}
          <div className="grid grid-cols-3 gap-4">
            {/* Profile distribution */}
            <div className="col-span-2 bg-background border border-border rounded-xl p-5 space-y-4 shadow-sm">
              <h2 className="text-sm font-semibold text-foreground">Distribuzione Profili</h2>
              <div className="space-y-4">
                {stats.topProfiles.map(({ profile_key, count }) => (
                  <ProfileBar
                    key={profile_key}
                    profile={profile_key}
                    count={count}
                    total={stats.totalSessions}
                  />
                ))}
              </div>
            </div>

            {/* Age group + Score avg */}
            <div className="space-y-4">
              <div className="bg-background border border-border rounded-xl p-5 space-y-4 shadow-sm">
                <h2 className="text-sm font-semibold text-foreground">Fascia d'età</h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Young (1982+)</span>
                    <span className="font-bold text-foreground">{stats.ageCounts.young}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Classic (&lt;1982)</span>
                    <span className="font-bold text-foreground">{stats.ageCounts.classic}</span>
                  </div>
                </div>
              </div>

              <div className="bg-background border border-border rounded-xl p-5 space-y-4 shadow-sm">
                <h2 className="text-sm font-semibold text-foreground">Score Medio</h2>
                <div className="space-y-2">
                  {[
                    { label: "Ambiente", value: stats.scoreAvg.verde, color: HERA_COLORS.verde },
                    { label: "Acqua", value: stats.scoreAvg.ciano, color: HERA_COLORS.ciano },
                    { label: "Energia", value: stats.scoreAvg.magenta, color: HERA_COLORS.magenta },
                  ].map((s) => (
                    <div key={s.label} className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">{s.label}</span>
                      <span className="font-bold text-lg" style={{ color: s.color }}>{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Prizes + Recent */}
          <div className="grid grid-cols-2 gap-4">
            {/* Prize stock */}
            <div className="bg-background border border-border rounded-xl p-5 space-y-4 shadow-sm">
              <h2 className="text-sm font-semibold text-foreground">Stock Premi</h2>
              {stats.prizeStats.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nessun premio configurato</p>
              ) : (
                <div className="space-y-3">
                  {stats.prizeStats.map((p) => (
                    <div key={p.name} className="flex justify-between items-center">
                      <span className="text-sm text-foreground truncate max-w-[180px]">{p.name}</span>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-semibold text-foreground">{p.redeemed} riscattati</span>
                        {p.remaining != null && (
                          <span className="text-xs text-muted-foreground ml-2">/ {p.remaining} rimasti</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent sessions */}
            <div className="bg-background border border-border rounded-xl p-5 space-y-4 shadow-sm">
              <h2 className="text-sm font-semibold text-foreground">Ultime 10 Partecipazioni</h2>
              {stats.recentSessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nessuna partecipazione</p>
              ) : (
                <div className="space-y-2">
                  {stats.recentSessions.map((s, i) => (
                    <div key={i} className="flex justify-between items-center text-sm">
                      <span
                        className="font-semibold"
                        style={{ color: PROFILE_COLORS[s.profile_key] }}
                      >
                        {PROFILE_LABELS[s.profile_key]}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {s.age_group === "young" ? "Young" : "Classic"} ·{" "}
                        {new Date(s.played_at).toLocaleTimeString("it-IT", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <EventSelectorProvider>
      <DashboardContent />
    </EventSelectorProvider>
  );
}
