"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { DataTable } from "@/components/admin/DataTable";
import {
  FormModal,
  Field,
  inputClass,
} from "@/components/admin/FormModal";
import {
  EventSelectorProvider,
  EventSelectorDropdown,
  useEventSelector,
} from "@/components/admin/EventSelector";
import type { ArmoPrize } from "@/lib/types";

function PrizesContent() {
  const supabase = createClient();
  const { selectedEventId } = useEventSelector();
  const [prizes, setPrizes] = useState<ArmoPrize[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ArmoPrize | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const emptyForm = {
    name: "",
    label: "",
    image_url: "",
    weight: 1,
    stock_total: "",
    is_active: true,
  };
  const [form, setForm] = useState(emptyForm);

  async function load() {
    if (!selectedEventId) return;
    const { data } = await supabase
      .from("hera_armo_prizes")
      .select("*")
      .eq("event_id", selectedEventId)
      .order("created_at");
    setPrizes((data as ArmoPrize[]) || []);
  }

  useEffect(() => {
    load();
  }, [selectedEventId]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(p: ArmoPrize) {
    setEditing(p);
    setForm({
      name: p.name,
      label: p.label,
      image_url: p.image_url || "",
      weight: p.weight,
      stock_total: p.stock_total?.toString() || "",
      is_active: p.is_active,
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const stockTotal =
      form.stock_total === "" ? null : parseInt(form.stock_total);
    const payload = {
      name: form.name,
      label: form.label,
      image_url: form.image_url || null,
      weight: form.weight,
      stock_total: stockTotal,
      stock_remaining: editing ? undefined : stockTotal,
      is_active: form.is_active,
      event_id: selectedEventId,
    };

    if (editing) {
      await supabase
        .from("hera_armo_prizes")
        .update(payload)
        .eq("id", editing.id);
    } else {
      await supabase.from("hera_armo_prizes").insert(payload);
    }

    setSubmitting(false);
    setModalOpen(false);
    load();
  }

  async function handleDelete(p: ArmoPrize) {
    if (!confirm(`Eliminare il premio "${p.name}"?`)) return;
    await supabase.from("hera_armo_prizes").delete().eq("id", p.id);
    load();
  }

  async function handleRestock(p: ArmoPrize) {
    if (p.stock_total === null) return;
    if (!confirm(`Ripristinare lo stock di "${p.name}" a ${p.stock_total}?`))
      return;
    await supabase
      .from("hera_armo_prizes")
      .update({ stock_remaining: p.stock_total })
      .eq("id", p.id);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-white">Premi</h1>
          <EventSelectorDropdown />
        </div>
        <button
          onClick={openCreate}
          disabled={!selectedEventId}
          className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Nuovo Premio
        </button>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800">
        <DataTable
          columns={[
            { key: "name", label: "Nome interno" },
            { key: "label", label: "Label visibile" },
            { key: "weight", label: "Peso" },
            {
              key: "stock",
              label: "Stock",
              render: (p) =>
                p.stock_total === null ? (
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
                    <span className="text-gray-500">/{p.stock_total}</span>
                  </span>
                ),
            },
            {
              key: "is_active",
              label: "Stato",
              render: (p) => (
                <span
                  className={
                    p.is_active ? "text-green-400" : "text-gray-500"
                  }
                >
                  {p.is_active ? "Attivo" : "Inattivo"}
                </span>
              ),
            },
          ]}
          data={prizes}
          onEdit={openEdit}
          onDelete={handleDelete}
          actions={(p) =>
            p.stock_total !== null ? (
              <button
                onClick={() => handleRestock(p)}
                className="text-yellow-400 hover:text-yellow-300 text-xs mr-2"
              >
                Restock
              </button>
            ) : null
          }
          emptyMessage="Nessun premio per questo evento"
        />
      </div>

      <FormModal
        title={editing ? "Modifica Premio" : "Nuovo Premio"}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        submitting={submitting}
      >
        <Field label="Nome Interno">
          <input
            className={inputClass}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </Field>
        <Field label="Label Visibile">
          <input
            className={inputClass}
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            required
          />
        </Field>
        <Field label="URL Immagine">
          <input
            className={inputClass}
            value={form.image_url}
            onChange={(e) => setForm({ ...form, image_url: e.target.value })}
            placeholder="https://..."
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Peso (probabilità)">
            <input
              type="number"
              min={1}
              className={inputClass}
              value={form.weight}
              onChange={(e) =>
                setForm({
                  ...form,
                  weight: parseInt(e.target.value) || 1,
                })
              }
              required
            />
          </Field>
          <Field label="Stock Totale (vuoto = illimitato)">
            <input
              type="number"
              min={0}
              className={inputClass}
              value={form.stock_total}
              onChange={(e) =>
                setForm({ ...form, stock_total: e.target.value })
              }
              placeholder="Illimitato"
            />
          </Field>
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
          <span className="text-sm text-gray-300">Attivo</span>
        </label>
      </FormModal>
    </div>
  );
}

export default function PrizesPage() {
  return (
    <EventSelectorProvider>
      <PrizesContent />
    </EventSelectorProvider>
  );
}
