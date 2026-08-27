"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ArmoEvent, RegisterResult } from "@/lib/types";
import { HERA_COLORS } from "@/lib/constants";

const CUSTOMER_STATUS_OPTIONS = [
  { value: "", label: "Seleziona..." },
  { value: "cliente_gas", label: "Cliente Gas" },
  { value: "cliente_luce", label: "Cliente Luce" },
  { value: "cliente_gas_luce", label: "Cliente Gas e Luce" },
  { value: "non_cliente", label: "Non sono cliente" },
];

type Screen = "loading" | "form" | "success" | "error";

export default function RegisterPage() {
  const supabase = createClient();

  const [screen, setScreen] = useState<Screen>("loading");
  const [event, setEvent] = useState<ArmoEvent | null>(null);
  const [result, setResult] = useState<RegisterResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    name: "",
    surname: "",
    email: "",
    phone: "",
    birth_year: "",
    customer_status: "",
    codice_fiscale: "",
    consent_concorso: false,
    consent_profilazione: false,
    consent_marketing: false,
    consent_immagine: false,
  });

  useEffect(() => {
    loadEvent();
  }, []);

  async function loadEvent() {
    const { data } = await supabase
      .from("hera_armo_events")
      .select("*")
      .eq("is_active", true)
      .limit(1)
      .single();
    if (data) {
      setEvent(data as ArmoEvent);
      setScreen("form");
    } else {
      setScreen("error");
    }
  }

  function set(field: string, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: "" }));
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Campo obbligatorio";
    if (!form.surname.trim()) errs.surname = "Campo obbligatorio";
    if (!form.email.trim() || !/^[^@]+@[^@]+\.[^@]+$/.test(form.email))
      errs.email = "Email non valida";
    if (!form.phone.trim() || form.phone.trim().length < 8)
      errs.phone = "Numero non valido";
    const yr = parseInt(form.birth_year);
    if (!form.birth_year || isNaN(yr) || yr < 1920 || yr > 2010)
      errs.birth_year = "Anno non valido (1920–2010)";
    if (!form.consent_concorso)
      errs.consent_concorso = "Consenso obbligatorio per partecipare";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate() || !event) return;
    setSubmitting(true);

    const { data, error } = await supabase.rpc("hera_armo_register", {
      p_event_id: event.id,
      p_name: form.name.trim(),
      p_surname: form.surname.trim(),
      p_email: form.email.trim().toLowerCase(),
      p_phone: form.phone.trim(),
      p_birth_year: parseInt(form.birth_year),
      p_customer_status: form.customer_status || null,
      p_codice_fiscale: form.codice_fiscale.trim() || null,
      p_consent_concorso: form.consent_concorso,
      p_consent_profilazione: form.consent_profilazione,
      p_consent_marketing: form.consent_marketing,
      p_consent_immagine: form.consent_immagine,
    });

    if (error || !data) {
      setErrors({ _general: error?.message || "Errore durante la registrazione. Riprova." });
      setSubmitting(false);
      return;
    }

    setResult(data as RegisterResult);
    setScreen("success");
    setSubmitting(false);
  }

  const gradientStyle = {
    background: `linear-gradient(135deg, ${HERA_COLORS.verde}, ${HERA_COLORS.ciano}, ${HERA_COLORS.magenta})`,
  };

  if (screen === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Caricamento...</p>
      </div>
    );
  }

  if (screen === "error") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 text-center">
        <p className="text-destructive text-lg">Nessun evento attivo. Contatta lo staff.</p>
      </div>
    );
  }

  if (screen === "success" && result) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm text-center space-y-8">
          {/* Logo */}
          <img src="/brand/hera-logo.webp" alt="Gruppo Hera" className="h-10 w-auto mx-auto" />

          {/* Titolo */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              Benvenuto/a, {result.name}!
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              La tua registrazione è completata.<br />
              Vai al totem e inserisci questo codice per iniziare l'experience.
            </p>
          </div>

          {/* Codice */}
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
              Il tuo codice
            </p>
            <div
              className="rounded-2xl p-1 mx-auto inline-block shadow-xl"
              style={gradientStyle}
            >
              <div className="bg-white rounded-xl px-10 py-6">
                <span className="text-5xl font-black tracking-[0.2em] text-foreground font-mono">
                  {result.code}
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Mostra questo codice al totem interattivo
            </p>
          </div>

          {/* Indicatore evento */}
          {event && (
            <p className="text-xs text-muted-foreground/60">
              {event.name}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-10 pb-24">

        {/* Header */}
        <div className="text-center mb-8 space-y-4">
          <img src="/brand/hera-logo.webp" alt="Gruppo Hera" className="h-10 w-auto mx-auto" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Registrazione alla Web App
            </h1>
            <p className="text-muted-foreground text-sm mt-1 leading-relaxed">
              Per accedere all'experience è necessario registrarsi.<br />
              Solo all'interno dello stand l'interazione genera la raccolta leads.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>

          {/* Errore generale */}
          {errors._general && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-xl p-4">
              {errors._general}
            </div>
          )}

          {/* Nome + Cognome */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nome *" error={errors.name}>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Mario"
                className={inputClass(errors.name)}
                autoComplete="given-name"
              />
            </Field>
            <Field label="Cognome *" error={errors.surname}>
              <input
                type="text"
                value={form.surname}
                onChange={(e) => set("surname", e.target.value)}
                placeholder="Rossi"
                className={inputClass(errors.surname)}
                autoComplete="family-name"
              />
            </Field>
          </div>

          {/* Email */}
          <Field label="Email *" error={errors.email}>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="mario.rossi@email.it"
              className={inputClass(errors.email)}
              autoComplete="email"
              inputMode="email"
            />
          </Field>

          {/* Telefono */}
          <Field label="Numero di Telefono *" error={errors.phone}>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+39 333 1234567"
              className={inputClass(errors.phone)}
              autoComplete="tel"
              inputMode="tel"
            />
          </Field>

          {/* Anno di nascita */}
          <Field label="Anno di nascita *" error={errors.birth_year}>
            <input
              type="number"
              value={form.birth_year}
              onChange={(e) => set("birth_year", e.target.value)}
              placeholder="es. 1990"
              min={1920}
              max={2010}
              className={inputClass(errors.birth_year)}
              inputMode="numeric"
            />
          </Field>

          {/* Status cliente (opzionale) */}
          <Field label="Status cliente gas e/o luce" error={errors.customer_status}>
            <select
              value={form.customer_status}
              onChange={(e) => set("customer_status", e.target.value)}
              className={inputClass(errors.customer_status)}
            >
              {CUSTOMER_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>

          {/* Codice Fiscale (opzionale) */}
          <Field label="Codice Fiscale (opzionale)" error={errors.codice_fiscale}>
            <input
              type="text"
              value={form.codice_fiscale}
              onChange={(e) => set("codice_fiscale", e.target.value.toUpperCase())}
              placeholder="RSSMRA80A01H501T"
              className={inputClass(errors.codice_fiscale)}
              maxLength={16}
              autoComplete="off"
            />
          </Field>

          {/* Divider consensi */}
          <div className="border-t border-border pt-5">
            <p className="text-sm font-semibold text-foreground mb-4">Consensi privacy</p>
            <div className="space-y-4">

              <ConsentCheck
                id="consent_concorso"
                checked={form.consent_concorso}
                onChange={(v) => set("consent_concorso", v)}
                error={errors.consent_concorso}
                required
              >
                <span className="font-medium">a. Partecipazione al concorso</span>
                <span className="text-muted-foreground"> — Acconsento al trattamento dei dati personali per la partecipazione al concorso Armocromia Heravigliosa.</span>
                <span className="text-primary font-semibold"> (obbligatorio)</span>
              </ConsentCheck>

              <ConsentCheck
                id="consent_profilazione"
                checked={form.consent_profilazione}
                onChange={(v) => set("consent_profilazione", v)}
              >
                <span className="font-medium">b. Profilazione</span>
                <span className="text-muted-foreground"> — Acconsento al trattamento dei dati per finalità di profilazione.</span>
                <span className="text-muted-foreground text-xs"> (facoltativo)</span>
              </ConsentCheck>

              <ConsentCheck
                id="consent_marketing"
                checked={form.consent_marketing}
                onChange={(v) => set("consent_marketing", v)}
              >
                <span className="font-medium">c. Marketing e commerciale</span>
                <span className="text-muted-foreground"> — Acconsento al trattamento per finalità di marketing e comunicazioni commerciali.</span>
                <span className="text-muted-foreground text-xs"> (facoltativo)</span>
              </ConsentCheck>

              <ConsentCheck
                id="consent_immagine"
                checked={form.consent_immagine}
                onChange={(v) => set("consent_immagine", v)}
              >
                <span className="font-medium">d. Uso della propria immagine</span>
                <span className="text-muted-foreground"> — Acconsento all'uso della mia immagine per finalità promozionali, comunicazione e marketing.</span>
                <span className="text-muted-foreground text-xs"> (facoltativo)</span>
              </ConsentCheck>

            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 rounded-full text-white font-bold text-lg disabled:opacity-50 transition-all hover:scale-[1.02] shadow-lg"
              style={gradientStyle}
            >
              {submitting ? "Registrazione in corso..." : "AVANTI →"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

function inputClass(error?: string) {
  return `w-full bg-muted border ${error ? "border-destructive" : "border-input"} rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors text-base`;
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-foreground">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function ConsentCheck({
  id,
  checked,
  onChange,
  required,
  error,
  children,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="flex items-start gap-3 cursor-pointer">
        <div className="relative shrink-0 mt-0.5">
          <input
            id={id}
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="sr-only"
            required={required}
          />
          <div
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
              checked
                ? "bg-primary border-primary"
                : error
                ? "border-destructive bg-destructive/5"
                : "border-input bg-card"
            }`}
          >
            {checked && (
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>
        <span className="text-sm leading-relaxed text-foreground">{children}</span>
      </label>
      {error && <p className="text-xs text-destructive pl-8">{error}</p>}
    </div>
  );
}
