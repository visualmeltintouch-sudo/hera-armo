"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  EventSelectorProvider,
  EventSelectorDropdown,
  useEventSelector,
} from "@/components/admin/EventSelector";
import type { ArmoCode, ArmoRegistration } from "@/lib/types";

type TabKey = "registrations" | "prizes";
type PrizeStatusFilter = "all" | "generated" | "redeemed" | "expired";
type RegStatusFilter = "all" | "pending" | "playing" | "completed";

interface CodeWithPrize extends ArmoCode {
  hera_armo_prizes: { label: string } | null;
}

const STATUS_BADGE: Record<string, string> = {
  generated: "bg-yellow-100 text-yellow-800",
  redeemed:  "bg-green-100 text-green-800",
  expired:   "bg-red-100 text-red-800",
  pending:   "bg-yellow-100 text-yellow-800",
  playing:   "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
};

function exportCsv(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      headers.map((h) => {
        const v = r[h] ?? "";
        const s = String(v).replace(/"/g, '""');
        return /[,"\n]/.test(s) ? `"${s}"` : s;
      }).join(",")
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

function CodesContent() {
  const supabase = createClient();
  const { selectedEventId } = useEventSelector();
  const [tab, setTab] = useState<TabKey>("registrations");

  // Prize codes
  const [prizes, setPrizes] = useState<CodeWithPrize[]>([]);
  const [prizeFilter, setPrizeFilter] = useState<PrizeStatusFilter>("all");

  // Registrations
  const [registrations, setRegistrations] = useState<ArmoRegistration[]>([]);
  const [regFilter, setRegFilter] = useState<RegStatusFilter>("all");
  const [regSearch, setRegSearch] = useState("");

  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!selectedEventId) return;
    setLoading(true);

    const [prizeRes, regRes] = await Promise.all([
      supabase
        .from("hera_armo_codes")
        .select("*, hera_armo_prizes(label)")
        .eq("event_id", selectedEventId)
        .order("created_at", { ascending: false }),
      supabase
        .from("hera_armo_registrations")
        .select("*")
        .eq("event_id", selectedEventId)
        .order("created_at", { ascending: false }),
    ]);

    setPrizes((prizeRes.data as CodeWithPrize[]) || []);
    setRegistrations((regRes.data as ArmoRegistration[]) || []);
    setLoading(false);
  }, [selectedEventId]);

  useEffect(() => { load(); }, [load]);

  // Filtered lists
  const filteredPrizes = prizes.filter(
    (c) => prizeFilter === "all" || c.status === prizeFilter
  );
  const filteredRegs = registrations.filter((r) => {
    const matchStatus = regFilter === "all" || r.status === regFilter;
    const q = regSearch.toLowerCase();
    const matchSearch =
      !q ||
      r.name.toLowerCase().includes(q) ||
      r.surname.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      r.code.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  // Stats
  const prizeStats = {
    total: prizes.length,
    generated: prizes.filter((c) => c.status === "generated").length,
    redeemed: prizes.filter((c) => c.status === "redeemed").length,
    expired: prizes.filter((c) => c.status === "expired").length,
  };
  const regStats = {
    total: registrations.length,
    pending: registrations.filter((r) => r.status === "pending").length,
    playing: registrations.filter((r) => r.status === "playing").length,
    completed: registrations.filter((r) => r.status === "completed").length,
  };

  function exportPrizes() {
    exportCsv(
      filteredPrizes.map((c) => ({
        code: c.code,
        prize: c.hera_armo_prizes?.label ?? "",
        status: c.status,
        redeemed_at: c.redeemed_at ?? "",
        created_at: c.created_at,
      })),
      `codici-premio-${selectedEventId?.slice(0, 8)}.csv`
    );
  }

  function exportRegs() {
    exportCsv(
      filteredRegs.map((r) => ({
        codice: r.code,
        nome: r.name,
        cognome: r.surname,
        email: r.email,
        telefono: r.phone,
        anno_nascita: r.birth_year,
        fascia: r.age_group,
        status: r.status,
        status_cliente: r.customer_status ?? "",
        codice_fiscale: r.codice_fiscale ?? "",
        consent_concorso: r.consent_concorso,
        consent_profilazione: r.consent_profilazione,
        consent_marketing: r.consent_marketing,
        consent_immagine: r.consent_immagine,
        registrato_il: r.created_at,
      })),
      `registrazioni-${selectedEventId?.slice(0, 8)}.csv`
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-foreground">Codici</h1>
          <EventSelectorDropdown />
        </div>
        <button
          onClick={load}
          disabled={loading || !selectedEventId}
          className="bg-primary hover:bg-primary/90 disabled:opacity-40 text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg"
        >
          {loading ? "..." : "↺ Aggiorna"}
        </button>
      </div>

      {!selectedEventId && (
        <p className="text-center py-20 text-muted-foreground">Seleziona un evento</p>
      )}

      {selectedEventId && (
        <>
          {/* Tabs */}
          <div className="flex border-b border-border">
            {(["registrations", "prizes"] as TabKey[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                  tab === t
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "registrations"
                  ? `Registrazioni (${regStats.total})`
                  : `Codici Premio (${prizeStats.total})`}
              </button>
            ))}
          </div>

          {/* REGISTRATIONS TAB */}
          {tab === "registrations" && (
            <div className="space-y-4">
              {/* Stats pills */}
              <div className="flex gap-3 flex-wrap">
                {[
                  { label: "Totali", value: regStats.total, color: "bg-muted text-foreground" },
                  { label: "In attesa", value: regStats.pending, color: "bg-yellow-100 text-yellow-800" },
                  { label: "Giocando", value: regStats.playing, color: "bg-blue-100 text-blue-800" },
                  { label: "Completati", value: regStats.completed, color: "bg-green-100 text-green-800" },
                ].map((s) => (
                  <span key={s.label} className={`text-sm font-semibold px-3 py-1 rounded-full ${s.color}`}>
                    {s.label}: {s.value}
                  </span>
                ))}
              </div>

              {/* Filtri */}
              <div className="flex gap-3 items-center flex-wrap">
                <input
                  type="text"
                  placeholder="Cerca nome, email, codice..."
                  value={regSearch}
                  onChange={(e) => setRegSearch(e.target.value)}
                  className="flex-1 min-w-[200px] bg-muted border border-input rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                />
                <select
                  value={regFilter}
                  onChange={(e) => setRegFilter(e.target.value as RegStatusFilter)}
                  className="bg-muted border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="all">Tutti gli status</option>
                  <option value="pending">In attesa</option>
                  <option value="playing">Giocando</option>
                  <option value="completed">Completati</option>
                </select>
                <button
                  onClick={exportRegs}
                  className="bg-card border border-border text-foreground text-sm font-medium px-4 py-2 rounded-lg hover:border-primary transition-colors"
                >
                  ↓ CSV
                </button>
              </div>

              {/* Tabella */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        {["Codice", "Nome", "Email", "Fascia", "Status", "Consensi", "Registrato"].map((h) => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredRegs.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                            Nessuna registrazione
                          </td>
                        </tr>
                      ) : (
                        filteredRegs.map((r) => (
                          <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3 font-mono font-bold text-foreground tracking-wider">{r.code}</td>
                            <td className="px-4 py-3 text-foreground">{r.name} {r.surname}</td>
                            <td className="px-4 py-3 text-muted-foreground">{r.email}</td>
                            <td className="px-4 py-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                r.age_group === "young"
                                  ? "bg-purple-100 text-purple-800"
                                  : "bg-orange-100 text-orange-800"
                              }`}>
                                {r.age_group === "young" ? "Young" : "Classic"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[r.status]}`}>
                                {r.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {[
                                r.consent_concorso && "concorso",
                                r.consent_profilazione && "profil.",
                                r.consent_marketing && "mktg",
                                r.consent_immagine && "immagine",
                              ].filter(Boolean).join(" · ") || "—"}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground text-xs">
                              {new Date(r.created_at).toLocaleString("it-IT", {
                                day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
                              })}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* PRIZE CODES TAB */}
          {tab === "prizes" && (
            <div className="space-y-4">
              {/* Stats */}
              <div className="flex gap-3 flex-wrap">
                {[
                  { label: "Totali", value: prizeStats.total, color: "bg-muted text-foreground" },
                  { label: "Da riscattare", value: prizeStats.generated, color: "bg-yellow-100 text-yellow-800" },
                  { label: "Riscattati", value: prizeStats.redeemed, color: "bg-green-100 text-green-800" },
                  { label: "Scaduti", value: prizeStats.expired, color: "bg-red-100 text-red-800" },
                ].map((s) => (
                  <span key={s.label} className={`text-sm font-semibold px-3 py-1 rounded-full ${s.color}`}>
                    {s.label}: {s.value}
                  </span>
                ))}
              </div>

              {/* Filtri */}
              <div className="flex gap-3 items-center">
                <select
                  value={prizeFilter}
                  onChange={(e) => setPrizeFilter(e.target.value as PrizeStatusFilter)}
                  className="bg-muted border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="all">Tutti</option>
                  <option value="generated">Da riscattare</option>
                  <option value="redeemed">Riscattati</option>
                  <option value="expired">Scaduti</option>
                </select>
                <button
                  onClick={exportPrizes}
                  className="bg-card border border-border text-foreground text-sm font-medium px-4 py-2 rounded-lg hover:border-primary transition-colors"
                >
                  ↓ CSV
                </button>
              </div>

              {/* Tabella */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        {["Codice", "Premio", "Status", "Riscattato il", "Generato il"].map((h) => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredPrizes.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                            Nessun codice
                          </td>
                        </tr>
                      ) : (
                        filteredPrizes.map((c) => (
                          <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3 font-mono font-bold text-foreground tracking-wider">{c.code}</td>
                            <td className="px-4 py-3 text-foreground">{c.hera_armo_prizes?.label ?? "—"}</td>
                            <td className="px-4 py-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[c.status]}`}>
                                {c.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground text-xs">
                              {c.redeemed_at
                                ? new Date(c.redeemed_at).toLocaleString("it-IT", {
                                    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
                                  })
                                : "—"}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground text-xs">
                              {new Date(c.created_at).toLocaleString("it-IT", {
                                day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
                              })}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function CodesPage() {
  return (
    <EventSelectorProvider>
      <CodesContent />
    </EventSelectorProvider>
  );
}
