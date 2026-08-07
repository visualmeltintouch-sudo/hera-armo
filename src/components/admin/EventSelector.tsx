"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ArmoEvent } from "@/lib/types";

interface EventSelectorContextValue {
  events: ArmoEvent[];
  selectedEventId: string | null;
  setSelectedEventId: (id: string | null) => void;
  selectedEvent: ArmoEvent | null;
  refreshEvents: () => Promise<void>;
}

const EventSelectorContext = createContext<EventSelectorContextValue | null>(
  null
);

export function useEventSelector() {
  const ctx = useContext(EventSelectorContext);
  if (!ctx)
    throw new Error("useEventSelector must be used within EventSelectorProvider");
  return ctx;
}

export function EventSelectorProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [events, setEvents] = useState<ArmoEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const supabase = createClient();

  async function refreshEvents() {
    const { data } = await supabase
      .from("hera_armo_events")
      .select("*")
      .order("created_at", { ascending: false });
    const list = (data as ArmoEvent[]) || [];
    setEvents(list);
    if (!selectedEventId && list.length > 0) {
      setSelectedEventId(list[0].id);
    }
  }

  useEffect(() => {
    refreshEvents();
  }, []);

  const selectedEvent =
    events.find((e) => e.id === selectedEventId) || null;

  return (
    <EventSelectorContext.Provider
      value={{
        events,
        selectedEventId,
        setSelectedEventId,
        selectedEvent,
        refreshEvents,
      }}
    >
      {children}
    </EventSelectorContext.Provider>
  );
}

export function EventSelectorDropdown() {
  const { events, selectedEventId, setSelectedEventId } = useEventSelector();

  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nessun evento. Creane uno nella sezione Eventi.
      </p>
    );
  }

  return (
    <select
      value={selectedEventId || ""}
      onChange={(e) => setSelectedEventId(e.target.value || null)}
      className="bg-muted border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-primary"
    >
      {events.map((ev) => (
        <option key={ev.id} value={ev.id}>
          {ev.name} {ev.is_active ? "●" : "○"}
        </option>
      ))}
    </select>
  );
}
