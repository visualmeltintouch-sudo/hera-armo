"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
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
import type { ArmoProfile, ProfileKey, AgeGroup } from "@/lib/types";

const PROFILE_KEYS: ProfileKey[] = ["ambiente", "acqua", "energia", "hera"];
const PROFILE_COLORS: Record<ProfileKey, string> = {
  ambiente: "border-hera-verde bg-hera-verde/20",
  acqua: "border-primary bg-primary/20",
  energia: "border-hera-magenta bg-hera-magenta/20",
  hera: "border-secondary bg-secondary/20",
};
const PROFILE_LABELS: Record<ProfileKey, string> = {
  ambiente: "Ambiente (Verde)",
  acqua: "Acqua (Ciano)",
  energia: "Energia (Magenta)",
  hera: "Hera (Gradiente completo)",
};

function ProfilesContent() {
  const supabase = createClient();
  const { selectedEventId } = useEventSelector();
  const [profiles, setProfiles] = useState<ArmoProfile[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ArmoProfile | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const emptyForm = {
    profile_key: "ambiente" as ProfileKey,
    age_group: "young" as AgeGroup,
    name: "",
    claim: "",
    description: "",
  };
  const [form, setForm] = useState(emptyForm);

  async function load() {
    if (!selectedEventId) return;
    const { data } = await supabase
      .from("hera_armo_profiles")
      .select("*")
      .eq("event_id", selectedEventId)
      .order("profile_key")
      .order("age_group");
    setProfiles((data as ArmoProfile[]) || []);
  }

  useEffect(() => {
    load();
  }, [selectedEventId]);

  function openEdit(p: ArmoProfile) {
    setEditing(p);
    setForm({
      profile_key: p.profile_key,
      age_group: p.age_group,
      name: p.name,
      claim: p.claim,
      description: p.description,
    });
    setModalOpen(true);
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const payload = { ...form, event_id: selectedEventId };

    if (editing) {
      await supabase
        .from("hera_armo_profiles")
        .update(payload)
        .eq("id", editing.id);
    } else {
      await supabase.from("hera_armo_profiles").insert(payload);
    }

    setSubmitting(false);
    setModalOpen(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminare questo profilo?")) return;
    await supabase.from("hera_armo_profiles").delete().eq("id", id);
    load();
  }

  async function seedProfiles() {
    if (!selectedEventId) return;
    if (
      !confirm(
        "Creare i profili predefiniti per entrambe le fasce di età?"
      )
    )
      return;

    const defaults: Omit<ArmoProfile, "id" | "created_at" | "is_active">[] = [
      { event_id: selectedEventId, profile_key: "ambiente", age_group: "young", name: "GREEN FLAG", claim: "I'M A GREEN FLAG, BABY.", description: "Sei quella persona che fa scelte giuste senza trasformarle in una conferenza TED. Recuperi, riusi, viaggi leggero." },
      { event_id: selectedEventId, profile_key: "acqua", age_group: "young", name: "FLOW MODE", claim: "SONO NEL CHILL, SEGUO IL FLOW!", description: "Ti muovi fluido come l'acqua, ti adatti a tutto e riesci a far sembrare effortless ogni impegno." },
      { event_id: selectedEventId, profile_key: "energia", age_group: "young", name: "FULL CHARGE", claim: "FULL CHARGE, I'M ALL IN!", description: "Sei quella persona che esce di casa con batteria al 100%, piano B pronto e una soluzione per tutto." },
      { event_id: selectedEventId, profile_key: "hera", age_group: "young", name: "ENERGY MIX", claim: "I'M NOT A TYPE. LA MIA ARMOCROMIA È SEMPLICEMENTE HERAVIGLIOSA!", description: "Il tuo profilo è Main Mix Energy: un blend Heraviglioso di istinto, equilibrio e caos controllato." },
      { event_id: selectedEventId, profile_key: "ambiente", age_group: "classic", name: "Gradiente Ambiente", claim: "Sei così green che attorno a te tutto fiorisce.", description: "La tua sensibilità verso il mondo ambiente emerge in ogni scelta quotidiana." },
      { event_id: selectedEventId, profile_key: "acqua", age_group: "classic", name: "Gradiente Acqua", claim: "Per te ogni goccia conta davvero.", description: "La tua attenzione all'acqua si riflette nelle tue abitudini di ogni giorno." },
      { event_id: selectedEventId, profile_key: "energia", age_group: "classic", name: "Gradiente Energia", claim: "La tua energia è fatta di scelte intelligenti.", description: "Le tue scelte quotidiane dimostrano una grande consapevolezza energetica." },
      { event_id: selectedEventId, profile_key: "hera", age_group: "classic", name: "Gradiente Hera", claim: "Sei un mix Heraviglioso di buone abitudini.", description: "Il tuo profilo riflette un equilibrio perfetto tra ambiente, acqua ed energia." },
    ];

    await supabase.from("hera_armo_profiles").insert(defaults);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-foreground">Profili</h1>
          <EventSelectorDropdown />
        </div>
        <div className="flex gap-2">
          {profiles.length === 0 && selectedEventId && (
            <button
              onClick={seedProfiles}
              className="bg-secondary hover:bg-secondary/90 text-foreground text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Crea Predefiniti
            </button>
          )}
          <button
            onClick={openCreate}
            disabled={!selectedEventId}
            className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + Nuovo Profilo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PROFILE_KEYS.map((key) => {
          const group = profiles.filter((p) => p.profile_key === key);
          return (
            <div
              key={key}
              className={`border rounded-xl p-5 ${PROFILE_COLORS[key]}`}
            >
              <h3 className="text-foreground font-semibold mb-3">
                {PROFILE_LABELS[key]}
              </h3>
              {group.length === 0 ? (
                <p className="text-muted-foreground text-sm">Non configurato</p>
              ) : (
                <div className="space-y-3">
                  {group.map((p) => (
                    <div
                      key={p.id}
                      className="bg-card/50 rounded-lg p-3 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {p.age_group === "young" ? "Giovani" : "Classic"}
                        </span>
                        <div className="space-x-2">
                          <button
                            onClick={() => openEdit(p)}
                            className="text-primary hover:text-primary/80 text-xs"
                          >
                            Modifica
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="text-destructive hover:text-destructive text-xs"
                          >
                            Elimina
                          </button>
                        </div>
                      </div>
                      <p className="text-foreground font-medium">{p.name}</p>
                      <p className="text-foreground/80 text-sm italic">
                        {p.claim}
                      </p>
                      <p className="text-muted-foreground text-xs">{p.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <FormModal
        title={editing ? "Modifica Profilo" : "Nuovo Profilo"}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        submitting={submitting}
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Profilo">
            <select
              className={selectClass}
              value={form.profile_key}
              onChange={(e) =>
                setForm({
                  ...form,
                  profile_key: e.target.value as ProfileKey,
                })
              }
            >
              {PROFILE_KEYS.map((k) => (
                <option key={k} value={k}>
                  {PROFILE_LABELS[k]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Target">
            <select
              className={selectClass}
              value={form.age_group}
              onChange={(e) =>
                setForm({
                  ...form,
                  age_group: e.target.value as AgeGroup,
                })
              }
            >
              <option value="young">Giovani</option>
              <option value="classic">Classic</option>
            </select>
          </Field>
        </div>
        <Field label="Nome Profilo">
          <input
            className={inputClass}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </Field>
        <Field label="Claim">
          <input
            className={inputClass}
            value={form.claim}
            onChange={(e) => setForm({ ...form, claim: e.target.value })}
            required
          />
        </Field>
        <Field label="Descrizione">
          <textarea
            className={inputClass + " min-h-[100px] resize-y"}
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
          />
        </Field>
      </FormModal>
    </div>
  );
}

export default function ProfilesPage() {
  return (
    <EventSelectorProvider>
      <ProfilesContent />
    </EventSelectorProvider>
  );
}
