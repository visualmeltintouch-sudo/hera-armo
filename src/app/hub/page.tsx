"use client";

import { useState } from "react";
import { HERA_COLORS } from "@/lib/constants";

const G = `linear-gradient(135deg, ${HERA_COLORS.verde}, ${HERA_COLORS.ciano}, ${HERA_COLORS.magenta})`;

const PRIZE_CODES = [
  { code: "WIN-SCONTO10", prize: "Sconto bolletta 10%",  status: "generated" },
  { code: "WIN-BIGLIETT", prize: "Biglietto evento",     status: "generated" },
  { code: "WIN-SCONTO20", prize: "Sconto bolletta 20%",  status: "generated" },
  { code: "WIN-VOUCHER1", prize: "Voucher digitale",     status: "generated" },
  { code: "RED-SCONTO10", prize: "Sconto bolletta 10%",  status: "redeemed"  },
  { code: "RED-BIGLIETT", prize: "Biglietto evento",     status: "redeemed"  },
  { code: "EXP-SCONTO20", prize: "Sconto bolletta 20%",  status: "expired"   },
];

const ADMIN_LINKS = [
  { path: "/admin/dashboard?hub=1", label: "Dashboard" },
  { path: "/admin/events?hub=1",    label: "Eventi" },
  { path: "/admin/questions?hub=1", label: "Domande" },
  { path: "/admin/profiles?hub=1",  label: "Profili" },
  { path: "/admin/prizes?hub=1",    label: "Premi" },
  { path: "/admin/codes?hub=1",     label: "Codici" },
  { path: "/admin/operators?hub=1", label: "Operatori" },
  { path: "/admin/stats?hub=1",     label: "Statistiche" },
  { path: "/admin/settings?hub=1",  label: "Impostazioni" },
];

function Pill({ text, color }: { text: string; color: string }) {
  return (
    <span
      className="text-xs font-mono px-2 py-0.5 rounded-full"
      style={{ background: color + "22", color }}
    >
      {text}
    </span>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1500); }}
      className="text-xs px-2 py-1 rounded border border-white/20 text-white/40 hover:text-white hover:border-white/50 transition-all font-mono shrink-0"
    >
      {ok ? "✓" : "copia"}
    </button>
  );
}

export default function HubPage() {
  return (
    <>
      <style>{`
        @font-face {
          font-family: 'Circular';
          src: url('/fonts/CircularStd-Book.woff') format('woff');
          font-weight: 400 700;
          font-style: normal;
        }
        .hub * { font-family: 'Circular', system-ui, sans-serif !important; }
      `}</style>

      <div className="hub min-h-screen bg-neutral-950 text-white">
        <div className="max-w-5xl mx-auto px-8 py-14 space-y-14">

          {/* Header */}
          <div>
            <span className="text-xs font-mono text-white/30 tracking-widest uppercase">Alpha interno — non condividere</span>
            <h1 className="text-5xl font-bold mt-2 bg-clip-text text-transparent" style={{ backgroundImage: G }}>
              HERA Armocromia
            </h1>
            <p className="text-white/40 mt-1">Hub di accesso rapido</p>
          </div>

          {/* ── ACCESSO DIRETTO ── */}
          <section className="space-y-4">
            <h2 className="text-xs font-mono uppercase tracking-widest text-white/30">Accesso diretto — 1 clic</h2>
            <div className="grid grid-cols-3 gap-4">

              <a
                href="/"
                className="group relative rounded-2xl overflow-hidden border border-white/10 hover:border-white/30 transition-all"
              >
                <div className="absolute inset-x-0 top-0 h-1" style={{ background: G }} />
                <div className="p-6 space-y-3">
                  <div className="text-4xl">🎨</div>
                  <div>
                    <p className="text-lg font-semibold">Experience</p>
                    <p className="text-sm text-white/40 mt-0.5">Totem utente — primo schermo</p>
                  </div>
                  <div
                    className="w-full py-3 rounded-xl text-center text-sm font-semibold text-white transition-opacity"
                    style={{ background: G }}
                  >
                    Apri →
                  </div>
                </div>
              </a>

              <a
                href="/admin/dashboard?hub=1"
                className="group relative rounded-2xl overflow-hidden border border-white/10 hover:border-white/30 transition-all"
              >
                <div className="absolute inset-x-0 top-0 h-1" style={{ background: G }} />
                <div className="p-6 space-y-3">
                  <div className="text-4xl">⚙️</div>
                  <div>
                    <p className="text-lg font-semibold">Admin Panel</p>
                    <p className="text-sm text-white/40 mt-0.5">Auto-login come admin test</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 space-y-1">
                    <p className="text-xs text-white/40 font-mono">admin@heratest.it</p>
                    <p className="text-xs text-white/40 font-mono">Hera2026!</p>
                  </div>
                  <div
                    className="w-full py-3 rounded-xl text-center text-sm font-semibold text-white"
                    style={{ background: G }}
                  >
                    Accedi →
                  </div>
                </div>
              </a>

              <a
                href="/operator?code=OPER1"
                className="group relative rounded-2xl overflow-hidden border border-white/10 hover:border-white/30 transition-all"
              >
                <div className="absolute inset-x-0 top-0 h-1" style={{ background: G }} />
                <div className="p-6 space-y-3">
                  <div className="text-4xl">🏷️</div>
                  <div>
                    <p className="text-lg font-semibold">Operatore Stand</p>
                    <p className="text-sm text-white/40 mt-0.5">Auto-login come Stand 1</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 space-y-1">
                    <p className="text-xs text-white/40 font-mono">Codice: OPER1</p>
                    <p className="text-xs text-white/40 font-mono">Stand Operatore 1</p>
                  </div>
                  <div
                    className="w-full py-3 rounded-xl text-center text-sm font-semibold text-white"
                    style={{ background: G }}
                  >
                    Accedi →
                  </div>
                </div>
              </a>
            </div>
          </section>

          {/* ── CREDENZIALI ── */}
          <section className="space-y-4">
            <h2 className="text-xs font-mono uppercase tracking-widest text-white/30">Credenziali</h2>
            <div className="grid grid-cols-2 gap-6">

              <div className="rounded-2xl border border-white/10 bg-white/3 p-6 space-y-4">
                <p className="text-sm font-semibold text-white/60">Admin Panel — Supabase Auth</p>
                <div className="space-y-3">
                  {[
                    { label: "Email", value: "admin@heratest.it" },
                    { label: "Password", value: "Hera2026!" },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white/30">{label}</p>
                        <p className="font-mono text-base text-white">{value}</p>
                      </div>
                      <CopyBtn text={value} />
                    </div>
                  ))}
                </div>
                <a
                  href="/admin/dashboard?hub=1"
                  className="block w-full py-3 rounded-xl text-center text-sm font-semibold text-white"
                  style={{ background: G }}
                >
                  Vai all'admin (auto-login) →
                </a>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/3 p-6 space-y-4">
                <p className="text-sm font-semibold text-white/60">Operatori Stand — codice accesso</p>
                <div className="space-y-3">
                  {[
                    { label: "Stand 1", value: "OPER1",   href: "/operator?code=OPER1" },
                    { label: "Stand 2", value: "OPER2",   href: "/operator?code=OPER2" },
                    { label: "Dev bypass", value: "TEST123", href: "/operator?code=TEST123" },
                  ].map(({ label, value, href }) => (
                    <div key={value} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white/30">{label}</p>
                        <p className="font-mono text-xl font-bold tracking-widest text-white">{value}</p>
                      </div>
                      <CopyBtn text={value} />
                      <a
                        href={href}
                        className="text-xs px-3 py-2 rounded-lg text-white font-semibold shrink-0"
                        style={{ background: G }}
                      >
                        Entra
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-2 gap-6">

            {/* ── SEZIONI ADMIN ── */}
            <section className="space-y-4">
              <h2 className="text-xs font-mono uppercase tracking-widest text-white/30">Sezioni admin</h2>
              <div className="rounded-2xl border border-white/10 bg-white/3 p-5 flex flex-wrap gap-2">
                {ADMIN_LINKS.map(({ path, label }) => (
                  <a
                    key={path}
                    href={path}
                    className="px-4 py-2 rounded-xl border border-white/10 text-sm text-white/60 hover:text-white hover:border-white/30 transition-all"
                  >
                    {label}
                  </a>
                ))}
              </div>
            </section>

            {/* ── CODICI PREMIO TEST ── */}
            <section className="space-y-4">
              <h2 className="text-xs font-mono uppercase tracking-widest text-white/30">Codici premio test</h2>
              <div className="rounded-2xl border border-white/10 bg-white/3 p-5 space-y-2">
                {PRIZE_CODES.map(({ code, prize, status }) => (
                  <div key={code} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-sm font-bold tracking-wider text-white">{code}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-white/30">{prize}</span>
                        <Pill
                          text={status === "generated" ? "da riscattare" : status === "redeemed" ? "già ritirato" : "scaduto"}
                          color={status === "generated" ? HERA_COLORS.verde : status === "redeemed" ? "#888" : "#555"}
                        />
                      </div>
                    </div>
                    <CopyBtn text={code} />
                  </div>
                ))}
              </div>
            </section>
          </div>

          <p className="text-white/15 text-xs text-center font-mono">
            HERA Armocromia Heravigliosa · Hub interno · Alpha
          </p>
        </div>
      </div>
    </>
  );
}
