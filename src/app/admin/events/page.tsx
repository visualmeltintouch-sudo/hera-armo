"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { DataTable } from "@/components/admin/DataTable";
import {
  FormModal,
  Field,
  inputClass,
} from "@/components/admin/FormModal";
import type { ArmoEvent } from "@/lib/types";

const emptyEvent = {
  name: "",
  location: "",
  code_letter: "A",
  date_start: "",
  date_end: "",
  is_active: false,
};

export default function EventsPage() {
  const supabase = createClient();
  const [events, setEvents] = useState<ArmoEvent[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ArmoEvent | null>(null);
  const [form, setForm] = useState(emptyEvent);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    const { data } = await supabase
      .from("hera_armo_events")
      .select("*")
      .order("created_at", { ascending: false });
    setEvents((data as ArmoEvent[]) || []);
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyEvent);
    setModalOpen(true);
  }

  function openEdit(event: ArmoEvent) {
    setEditing(event);
    setForm({
      name: event.name,
      location: event.location || "",
      code_letter: event.code_letter,
      date_start: event.date_start,
      date_end: event.date_end || "",
      is_active: event.is_active,
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      name: form.name,
      location: form.location || null,
      code_letter: form.code_letter,
      date_start: form.date_start,
      date_end: form.date_end || null,
      is_active: form.is_active,
    };

    if (editing) {
      await supabase
        .from("hera_armo_events")
        .update(payload)
        .eq("id", editing.id);
    } else {
      const { data } = await supabase
        .from("hera_armo_events")
        .insert(payload)
        .select()
        .single();
      if (data) {
        await supabase.from("hera_armo_settings").insert({
          event_id: data.id,
        });
      }
    }

    setSubmitting(false);
    setModalOpen(false);
    load();
  }

  async function handleDelete(event: ArmoEvent) {
    if (!confirm(`Eliminare l'evento "${event.name}"?`)) return;
    await supabase.from("hera_armo_events").delete().eq("id", event.id);
    load();
  }

  async function handleDuplicate(event: ArmoEvent) {
    const { data: newEvent } = await supabase
      .from("hera_armo_events")
      .insert({
        name: `${event.name} (copia)`,
        location: event.location,
        code_letter: event.code_letter,
        date_start: event.date_start,
        date_end: event.date_end,
        is_active: false,
      })
      .select()
      .single();

    if (!newEvent) return;

    await supabase.from("hera_armo_settings").insert({ event_id: newEvent.id });

    const { data: questions } = await supabase
      .from("hera_armo_questions")
      .select("*")
      .eq("event_id", event.id);
    if (questions && questions.length > 0) {
      await supabase.from("hera_armo_questions").insert(
        questions.map((q: Record<string, unknown>) => ({
          ...q,
          id: undefined,
          event_id: newEvent.id,
          created_at: undefined,
        }))
      );
    }

    const { data: profiles } = await supabase
      .from("hera_armo_profiles")
      .select("*")
      .eq("event_id", event.id);
    if (profiles && profiles.length > 0) {
      await supabase.from("hera_armo_profiles").insert(
        profiles.map((p: Record<string, unknown>) => ({
          ...p,
          id: undefined,
          event_id: newEvent.id,
          created_at: undefined,
        }))
      );
    }

    const { data: prizes } = await supabase
      .from("hera_armo_prizes")
      .select("*")
      .eq("event_id", event.id);
    if (prizes && prizes.length > 0) {
      await supabase.from("hera_armo_prizes").insert(
        prizes.map((p: Record<string, unknown>) => ({
          ...p,
          id: undefined,
          event_id: newEvent.id,
          created_at: undefined,
          stock_remaining: (p as { stock_total: number | null }).stock_total,
        }))
      );
    }

    load();
  }

  async function toggleActive(event: ArmoEvent) {
    await supabase
      .from("hera_armo_events")
      .update({ is_active: !event.is_active })
      .eq("id", event.id);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-foreground">Eventi</h1>
        <button
          onClick={openCreate}
          className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Nuovo Evento
        </button>
      </div>

      <div className="bg-card rounded-xl border border-border">
        <DataTable
          columns={[
            { key: "name", label: "Nome" },
            { key: "location", label: "Luogo" },
            { key: "date_start", label: "Inizio" },
            { key: "date_end", label: "Fine" },
            {
              key: "is_active",
              label: "Stato",
              render: (e) => (
                <button
                  onClick={() => toggleActive(e)}
                  className={`text-xs px-2 py-1 rounded-full ${
                    e.is_active
                      ? "bg-hera-verde/20 text-hera-verde"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {e.is_active ? "Attivo" : "Inattivo"}
                </button>
              ),
            },
            { key: "code_letter", label: "Lettera" },
          ]}
          data={events}
          onEdit={openEdit}
          onDelete={handleDelete}
          actions={(e) => (
            <button
              onClick={() => handleDuplicate(e)}
              className="text-secondary hover:text-secondary/80 text-xs mr-2"
            >
              Duplica
            </button>
          )}
          emptyMessage="Nessun evento creato"
        />
      </div>

      <FormModal
        title={editing ? "Modifica Evento" : "Nuovo Evento"}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        submitting={submitting}
      >
        <Field label="Nome">
          <input
            className={inputClass}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </Field>
        <Field label="Luogo">
          <input
            className={inputClass}
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Data Inizio">
            <input
              type="date"
              className={inputClass}
              value={form.date_start}
              onChange={(e) =>
                setForm({ ...form, date_start: e.target.value })
              }
              required
            />
          </Field>
          <Field label="Data Fine">
            <input
              type="date"
              className={inputClass}
              value={form.date_end}
              onChange={(e) => setForm({ ...form, date_end: e.target.value })}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Lettera Codice">
            <input
              className={inputClass}
              value={form.code_letter}
              onChange={(e) =>
                setForm({
                  ...form,
                  code_letter: e.target.value.toUpperCase().slice(0, 1),
                })
              }
              maxLength={1}
              required
            />
          </Field>
          <Field label="Stato">
            <label className="flex items-center gap-2 py-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) =>
                  setForm({ ...form, is_active: e.target.checked })
                }
                className="rounded"
              />
              <span className="text-sm text-foreground/80">Attivo</span>
            </label>
          </Field>
        </div>
      </FormModal>
    </div>
  );
}
