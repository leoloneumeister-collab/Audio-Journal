"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RetryButton({ entryId }: { entryId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function retry() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/entries/${entryId}/process`, { method: "POST" });
    if (!res.ok) setError((await res.json()).error ?? "Still not working, try again later.");
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="card flex flex-col gap-2">
      <p className="text-sm">Your companion hasn&apos;t taken this entry in yet.</p>
      <button className="btn" onClick={retry} disabled={busy}>
        {busy ? "Listening…" : "Process entry"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
