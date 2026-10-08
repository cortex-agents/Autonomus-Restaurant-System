"use client";

import { useState } from "react";
import { useConversations, useTranscript } from "@/hooks/useConversations";

const STATUSES = ["", "active", "escalated", "abandoned", "completed"];

export default function ConversationsPage() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const { data, isLoading, error } = useConversations(status || undefined, page);
  const { data: transcript, isLoading: tLoading } = useTranscript(selected);

  return (
    <div className="page-container py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold">Conversations</h1>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); setSelected(null); }}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          {STATUSES.map((s) => <option key={s} value={s}>{s || "All statuses"}</option>)}
        </select>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card-surface divide-y divide-border">
          {isLoading && <p className="p-5 text-muted-foreground">Loading…</p>}
          {error && <p className="p-5 text-destructive">{(error as Error).message}</p>}
          {data?.items.length === 0 && <p className="p-5 text-muted-foreground">No conversations yet.</p>}
          {data?.items.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelected(c.id)}
              className={`block w-full p-4 text-left hover:bg-muted/60 ${selected === c.id ? "bg-muted" : ""}`}
            >
              <div className="flex justify-between gap-2">
                <span className="font-medium">{c.customer_phone}</span>
                <span className="text-xs uppercase text-muted-foreground">{c.status}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {c.order_stage ? `${c.order_stage} · ` : ""}
                {new Date(c.last_activity_at || c.started_at).toLocaleString()}
              </p>
              {c.escalated_reason && <p className="mt-1 text-xs text-destructive">{c.escalated_reason}</p>}
            </button>
          ))}
          <div className="flex justify-between p-3">
            <button className="text-sm disabled:opacity-40" disabled={page === 1} onClick={() => setPage(page - 1)}>← Prev</button>
            <button className="text-sm disabled:opacity-40" disabled={!data || data.items.length < data.page_size} onClick={() => setPage(page + 1)}>Next →</button>
          </div>
        </div>

        <div className="card-surface p-5">
          {!selected && <p className="text-muted-foreground">Select a conversation to read the transcript.</p>}
          {selected && tLoading && <p className="text-muted-foreground">Loading…</p>}
          {transcript && (
            <div className="space-y-2">
              {transcript.messages.map((m) => (
                <div key={m.id} className={`flex ${m.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${m.direction === "outbound" ? "bg-primary/10" : "bg-muted"}`}>
                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">{m.role} · {new Date(m.created_at).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
