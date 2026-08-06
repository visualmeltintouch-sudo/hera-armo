"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Field, inputClass } from "@/components/admin/FormModal";
import {
  EventSelectorProvider,
  EventSelectorDropdown,
  useEventSelector,
} from "@/components/admin/EventSelector";
import type { ArmoSettings } from "@/lib/types";

function SettingsContent() {
  const supabase = createClient();
  const { selectedEventId } = useEventSelector();
  const [settings, setSettings] = useState<ArmoSettings | null>(null);
  const [form, setForm] = useState({
    year_cutoff: 1982,
    hera_threshold: 2,
    questions_per_session: 10,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function load() {
    if (!selectedEventId) return;
    const { data } = await supabase
      .from("hera_armo_settings")
      .select("*")
      .eq("event_id", selectedEventId)
      .single();

    if (data) {
      const s = data as ArmoSettings;
      setSettings(s);
      setForm({
        year_cutoff: s.year_cutoff,
        hera_threshold: s.hera_threshold,
        questions_per_session: s.questions_per_session,
      });
    } else {
      setSettings(null);
    }
  }

  useEffect(() => {
    load();
  }, [selectedEventId]);

  async function handleSave() {
    if (!selectedEventId) return;
    setSaving(true);

    if (settings) {
      await supabase
        .from("hera_armo_settings")
        .update(form)
        .eq("id", settings.id);
    } else {
      await supabase.from("hera_armo_settings").insert({
        ...form,
        event_id: selectedEventId,
      });
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    load();
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-xl font-bold text-white">Impostazioni</h1>
        <EventSelectorDropdown />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-lg space-y-6">
        <Field label="Anno di nascita soglia (giovani = da questo anno in poi)">
          <input
            type="number"
            className={inputClass}
            value={form.year_cutoff}
            onChange={(e) =>
              setForm({
                ...form,
                year_cutoff: parseInt(e.target.value) || 1982,
              })
            }
          />
          <p className="text-xs text-gray-500 mt-1">
            Nati dal {form.year_cutoff} in poi → domande giovani. Prima del{" "}
            {form.year_cutoff} → domande classic.
          </p>
        </Field>

        <Field label="Soglia Gradiente Hera">
          <input
            type="number"
            min={0}
            className={inputClass}
            value={form.hera_threshold}
            onChange={(e) =>
              setForm({
                ...form,
                hera_threshold: parseInt(e.target.value) || 0,
              })
            }
          />
          <p className="text-xs text-gray-500 mt-1">
            Se la differenza tra il punteggio massimo e minimo delle 3
            categorie è ≤ {form.hera_threshold}, viene assegnato il profilo
            Hera (gradiente completo).
          </p>
        </Field>

        <Field label="Domande per sessione">
          <input
            type="number"
            min={1}
            max={20}
            className={inputClass}
            value={form.questions_per_session}
            onChange={(e) =>
              setForm({
                ...form,
                questions_per_session: parseInt(e.target.value) || 10,
              })
            }
          />
        </Field>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-sm font-medium px-6 py-2 rounded-lg transition-colors"
          >
            {saving ? "Salvataggio..." : "Salva"}
          </button>
          {saved && (
            <span className="text-green-400 text-sm">Salvato!</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <EventSelectorProvider>
      <SettingsContent />
    </EventSelectorProvider>
  );
}
