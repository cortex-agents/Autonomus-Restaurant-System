"use client";

import { useState } from "react";
import { useMe, useWhatsAppStatus } from "@/hooks/useAccount";
import { postFetcher } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-wrap justify-between gap-2 border-b border-border py-3 last:border-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground break-all">{value || "—"}</dd>
    </div>
  );
}

export default function AccountPage() {
  const { data: me, isLoading, error } = useMe();
  const { data: wa } = useWhatsAppStatus();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (next.length < 8) return setMsg({ ok: false, text: "New password must be at least 8 characters." });
    setBusy(true);
    try {
      await postFetcher("/auth/change-password", { current_password: current, new_password: next });
      setCurrent(""); setNext("");
      setMsg({ ok: true, text: "Password changed." });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Failed to change password" });
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) return <div className="page-container py-8 text-muted-foreground">Loading…</div>;
  if (error || !me) return <div className="page-container py-8 text-destructive">Could not load account.</div>;

  const last = wa?.last_inbound_message_at ? new Date(wa.last_inbound_message_at).toLocaleString() : "No customer message yet";

  return (
    <div className="page-container space-y-6 py-8">
      <h1 className="font-display text-2xl font-semibold">Account</h1>

      <section className="card-surface p-6">
        <h2 className="font-display text-lg font-semibold">Restaurant</h2>
        <dl className="mt-2">
          <Row label="Name" value={me.name} />
          <Row label="Login email" value={me.owner_email} />
          <Row label="Timezone" value={me.timezone} />
        </dl>
      </section>

      <section className="card-surface p-6">
        <h2 className="font-display text-lg font-semibold">WhatsApp</h2>
        <dl className="mt-2">
          <Row label="Customer-facing (bot) number" value={me.whatsapp_number} />
          <Row label="Owner alerts go to" value={me.owner_whatsapp_number} />
          <Row label="Channel" value={wa?.active_channel} />
          <Row label="Last customer message" value={last} />
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">
          Orders, menu and conversations shown in this dashboard belong only to this number.
        </p>
      </section>

      <section className="card-surface max-w-md p-6">
        <h2 className="font-display text-lg font-semibold">Change password</h2>
        <form onSubmit={changePassword} className="mt-3 space-y-3">
          <Input type="password" placeholder="Current password" value={current} onChange={(e) => setCurrent(e.target.value)} required autoComplete="current-password" />
          <Input type="password" placeholder="New password (8+ characters)" value={next} onChange={(e) => setNext(e.target.value)} required autoComplete="new-password" />
          {msg && <p className={`text-sm ${msg.ok ? "text-success" : "text-destructive"}`}>{msg.text}</p>}
          <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Update password"}</Button>
        </form>
      </section>
    </div>
  );
}
