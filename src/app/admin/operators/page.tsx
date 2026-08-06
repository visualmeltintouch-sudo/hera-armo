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
import type { ArmoOperator, ArmoEvent } from "@/lib/types";

function generateAccessCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default function OperatorsPage() {
  const supabase = createClient();
  const [operators, setOperators] = useState<ArmoOperator[]>([]);
  const [events, setEvents] = useState<ArmoEvent[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ArmoOperator | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const emptyForm = {
    name: "",
    access_code: generateAccessCode(),
    event_id: "",
    is_active: true,
  };
  const [form, setForm] = useState(emptyForm);

  async function load() {
    const [{ data: ops }, { data: evts }] = await Promise.all([
      supabase
        .from("hera_armo_operators")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("hera_armo_events")
        .select("*")
        .order("name"),
    ]);
    setOperators((ops as ArmoOperator[]) || []);
    setEvents((evts as ArmoEvent[]) || []);
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, access_code: generateAccessCode() });
    setModalOpen(true);
  }

  function openEdit(op: ArmoOperator) {
    setEditing(op);
    setForm({
      name: op.name,
      access_code: op.access_code,
      event_id: op.event_id || "",
      is_active: op.is_active,
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const payload = {
      name: form.name,
      access_code: form.access_code,
      event_id: form.event_id || null,
      is_active: form.is_active,
    };

    if (editing) {
      await supabase
        .from("hera_armo_operators")
        .update(payload)
        .eq("id", editing.id);
    } else {
      await supabase.from("hera_armo_operators").insert(payload);
    }

    setSubmitting(false);
    setModalOpen(false);
    load();
  }

  async function handleDelete(op: ArmoOperator) {
    if (!confirm(`Eliminare l'operatore "${op.name}"?`)) return;
    await supabase.from("hera_armo_operators").delete().eq("id", op.id);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-white">Operatori</h1>
        <button
          onClick={openCreate}
          className="bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Nuovo Operatore
        </button>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800">
        <DataTable
          columns={[
            { key: "name", label: "Nome" },
            {
              key: "access_code",
              label: "Codice Accesso",
              render: (op) => (
                <code className="bg-gray-800 px-2 py-1 rounded text-cyan-400 text-xs">
                  {op.access_code}
                </code>
              ),
            },
            {
              key: "event_id",
              label: "Evento",
              render: (op) => {
                if (!op.event_id) return <span className="text-gray-500">Tutti</span>;
                const ev = events.find((e) => e.id === op.event_id);
                return <span>{ev?.name || "—"}</span>;
              },
            },
            {
              key: "is_active",
              label: "Stato",
              render: (op) => (
                <span
                  className={
                    op.is_active ? "text-green-400" : "text-gray-500"
                  }
                >
                  {op.is_active ? "Attivo" : "Inattivo"}
                </span>
              ),
            },
          ]}
          data={operators}
          onEdit={openEdit}
          onDelete={handleDelete}
          emptyMessage="Nessun operatore"
        />
      </div>

      <FormModal
        title={editing ? "Modifica Operatore" : "Nuovo Operatore"}
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
        <Field label="Codice Accesso">
          <div className="flex gap-2">
            <input
              className={inputClass}
              value={form.access_code}
              onChange={(e) =>
                setForm({ ...form, access_code: e.target.value.toUpperCase() })
              }
              required
            />
            <button
              type="button"
              onClick={() =>
                setForm({ ...form, access_code: generateAccessCode() })
              }
              className="text-xs text-cyan-400 hover:text-cyan-300 whitespace-nowrap"
            >
              Genera
            </button>
          </div>
        </Field>
        <Field label="Evento">
          <select
            className={selectClass}
            value={form.event_id}
            onChange={(e) => setForm({ ...form, event_id: e.target.value })}
          >
            <option value="">Tutti gli eventi</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name}
              </option>
            ))}
          </select>
        </Field>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) =>
              setForm({ ...form, is_active: e.target.checked })
            }
            className="rounded"
          />
          <span className="text-sm text-gray-300">Attivo</span>
        </label>
      </FormModal>
    </div>
  );
}
