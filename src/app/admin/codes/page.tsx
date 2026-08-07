"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  EventSelectorProvider,
  EventSelectorDropdown,
  useEventSelector,
} from "@/components/admin/EventSelector";
import { DataTable } from "@/components/admin/DataTable";
import type { ArmoCode } from "@/lib/types";

interface CodeWithPrize extends ArmoCode {
  hera_armo_prizes: { label: string } | null;
}

function CodesContent() {
  const supabase = createClient();
  const { selectedEventId } = useEventSelector();
  const [codes, setCodes] = useState<CodeWithPrize[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, redeemed: 0 });

  async function load() {
    if (!selectedEventId) return;
    const { data } = await supabase
      .from("hera_armo_codes")
      .select("*, hera_armo_prizes(label)")
      .eq("event_id", selectedEventId)
      .order("created_at", { ascending: false });
    const list = (data as CodeWithPrize[]) || [];
    setCodes(list);
    setStats({
      total: list.length,
      pending: list.filter((c) => c.status === "generated").length,
      redeemed: list.filter((c) => c.status === "redeemed").length,
    });
  }

  useEffect(() => {
    load();
  }, [selectedEventId]);

  const statusColors: Record<string, string> = {
    generated: "bg-secondary/20 text-secondary",
    redeemed: "bg-hera-verde/20 text-hera-verde",
    expired: "bg-destructive/20 text-destructive",
  };
  const statusLabels: Record<string, string> = {
    generated: "In attesa",
    redeemed: "Riscattato",
    expired: "Scaduto",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-foreground">Codici</h1>
          <EventSelectorDropdown />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Totali</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-secondary">{stats.pending}</p>
          <p className="text-xs text-muted-foreground">In attesa</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-hera-verde">{stats.redeemed}</p>
          <p className="text-xs text-muted-foreground">Riscattati</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border">
        <DataTable
          columns={[
            {
              key: "code",
              label: "Codice",
              render: (c) => (
                <code className="bg-muted px-2 py-1 rounded text-primary text-xs">
                  {c.code}
                </code>
              ),
            },
            {
              key: "prize",
              label: "Premio",
              render: (c) => c.hera_armo_prizes?.label || "—",
            },
            {
              key: "status",
              label: "Stato",
              render: (c) => (
                <span
                  className={`text-xs px-2 py-1 rounded-full ${statusColors[c.status]}`}
                >
                  {statusLabels[c.status]}
                </span>
              ),
            },
            {
              key: "created_at",
              label: "Creato",
              render: (c) =>
                new Date(c.created_at).toLocaleString("it-IT"),
            },
            {
              key: "redeemed_at",
              label: "Riscattato",
              render: (c) =>
                c.redeemed_at
                  ? new Date(c.redeemed_at).toLocaleString("it-IT")
                  : "—",
            },
          ]}
          data={codes}
          emptyMessage="Nessun codice generato"
        />
      </div>
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
