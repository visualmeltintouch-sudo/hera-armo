"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { DataTable } from "@/components/admin/DataTable";
import {
  FormModal,
  Field,
  inputClass,
  selectClass,
} from "@/components/admin/FormModal";
import {
  EventSelectorProvider,
  EventSelectorDropdown,
  useEventSelector,
} from "@/components/admin/EventSelector";
import type { ArmoQuestion } from "@/lib/types";

function QuestionsContent() {
  const supabase = createClient();
  const { selectedEventId } = useEventSelector();
  const [questions, setQuestions] = useState<ArmoQuestion[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ArmoQuestion | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const emptyForm = {
    age_group: "young" as "young" | "classic",
    sort_order: 0,
    question_text: "",
    option_a_text: "",
    option_a_verde: 0,
    option_a_ciano: 0,
    option_a_magenta: 0,
    option_b_text: "",
    option_b_verde: 0,
    option_b_ciano: 0,
    option_b_magenta: 0,
    is_active: true,
  };
  const [form, setForm] = useState(emptyForm);

  async function load() {
    if (!selectedEventId) return;
    const { data } = await supabase
      .from("hera_armo_questions")
      .select("*")
      .eq("event_id", selectedEventId)
      .order("age_group")
      .order("sort_order");
    setQuestions((data as ArmoQuestion[]) || []);
  }

  useEffect(() => {
    load();
  }, [selectedEventId]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(q: ArmoQuestion) {
    setEditing(q);
    setForm({
      age_group: q.age_group,
      sort_order: q.sort_order,
      question_text: q.question_text,
      option_a_text: q.option_a_text,
      option_a_verde: q.option_a_verde,
      option_a_ciano: q.option_a_ciano,
      option_a_magenta: q.option_a_magenta,
      option_b_text: q.option_b_text,
      option_b_verde: q.option_b_verde,
      option_b_ciano: q.option_b_ciano,
      option_b_magenta: q.option_b_magenta,
      is_active: q.is_active,
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const payload = { ...form, event_id: selectedEventId };

    if (editing) {
      await supabase
        .from("hera_armo_questions")
        .update(payload)
        .eq("id", editing.id);
    } else {
      await supabase.from("hera_armo_questions").insert(payload);
    }

    setSubmitting(false);
    setModalOpen(false);
    load();
  }

  async function handleDelete(q: ArmoQuestion) {
    if (!confirm("Eliminare questa domanda?")) return;
    await supabase.from("hera_armo_questions").delete().eq("id", q.id);
    load();
  }

  const numField = (key: string, value: number) => (
    <input
      type="number"
      min={0}
      className={inputClass + " text-center"}
      value={value}
      onChange={(e) =>
        setForm({ ...form, [key]: parseInt(e.target.value) || 0 })
      }
    />
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-white">Domande</h1>
          <EventSelectorDropdown />
        </div>
        <button
          onClick={openCreate}
          disabled={!selectedEventId}
          className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Nuova Domanda
        </button>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800">
        <DataTable
          columns={[
            { key: "sort_order", label: "#" },
            {
              key: "age_group",
              label: "Target",
              render: (q) => (
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    q.age_group === "young"
                      ? "bg-purple-900/50 text-purple-400"
                      : "bg-blue-900/50 text-blue-400"
                  }`}
                >
                  {q.age_group === "young" ? "Giovani" : "Classic"}
                </span>
              ),
            },
            {
              key: "question_text",
              label: "Domanda",
              render: (q) => (
                <span className="block max-w-xs truncate">
                  {q.question_text}
                </span>
              ),
            },
            {
              key: "scores",
              label: "Punteggi A / B",
              render: (q) => (
                <div className="text-xs space-y-0.5">
                  <div>
                    A:{" "}
                    <span className="text-green-400">V{q.option_a_verde}</span>{" "}
                    <span className="text-cyan-400">C{q.option_a_ciano}</span>{" "}
                    <span className="text-pink-400">M{q.option_a_magenta}</span>
                  </div>
                  <div>
                    B:{" "}
                    <span className="text-green-400">V{q.option_b_verde}</span>{" "}
                    <span className="text-cyan-400">C{q.option_b_ciano}</span>{" "}
                    <span className="text-pink-400">M{q.option_b_magenta}</span>
                  </div>
                </div>
              ),
            },
            {
              key: "is_active",
              label: "Stato",
              render: (q) => (
                <span
                  className={
                    q.is_active ? "text-green-400" : "text-gray-500"
                  }
                >
                  {q.is_active ? "Attiva" : "Inattiva"}
                </span>
              ),
            },
          ]}
          data={questions}
          onEdit={openEdit}
          onDelete={handleDelete}
          emptyMessage="Nessuna domanda per questo evento"
        />
      </div>

      <FormModal
        title={editing ? "Modifica Domanda" : "Nuova Domanda"}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        submitting={submitting}
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Target">
            <select
              className={selectClass}
              value={form.age_group}
              onChange={(e) =>
                setForm({
                  ...form,
                  age_group: e.target.value as typeof form.age_group,
                })
              }
            >
              <option value="young">Giovani (1997+)</option>
              <option value="classic">Classic (pre-1997)</option>
            </select>
          </Field>
          <Field label="Ordine">
            <input
              type="number"
              className={inputClass}
              value={form.sort_order}
              onChange={(e) =>
                setForm({
                  ...form,
                  sort_order: parseInt(e.target.value) || 0,
                })
              }
            />
          </Field>
        </div>

        <Field label="Testo Domanda">
          <textarea
            className={inputClass + " min-h-[80px] resize-y"}
            value={form.question_text}
            onChange={(e) =>
              setForm({ ...form, question_text: e.target.value })
            }
            required
          />
        </Field>

        <div className="border border-gray-700 rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium text-gray-300">Opzione A</p>
          <Field label="Testo">
            <input
              className={inputClass}
              value={form.option_a_text}
              onChange={(e) =>
                setForm({ ...form, option_a_text: e.target.value })
              }
              required
            />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Verde">{numField("option_a_verde", form.option_a_verde)}</Field>
            <Field label="Ciano">{numField("option_a_ciano", form.option_a_ciano)}</Field>
            <Field label="Magenta">{numField("option_a_magenta", form.option_a_magenta)}</Field>
          </div>
        </div>

        <div className="border border-gray-700 rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium text-gray-300">Opzione B</p>
          <Field label="Testo">
            <input
              className={inputClass}
              value={form.option_b_text}
              onChange={(e) =>
                setForm({ ...form, option_b_text: e.target.value })
              }
              required
            />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Verde">{numField("option_b_verde", form.option_b_verde)}</Field>
            <Field label="Ciano">{numField("option_b_ciano", form.option_b_ciano)}</Field>
            <Field label="Magenta">{numField("option_b_magenta", form.option_b_magenta)}</Field>
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) =>
              setForm({ ...form, is_active: e.target.checked })
            }
            className="rounded"
          />
          <span className="text-sm text-gray-300">Attiva</span>
        </label>
      </FormModal>
    </div>
  );
}

export default function QuestionsPage() {
  return (
    <EventSelectorProvider>
      <QuestionsContent />
    </EventSelectorProvider>
  );
}
