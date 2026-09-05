"use client";

import { useState, useTransition } from "react";
import { claimUniversity, proposeChange, resolveCorrection, reviewRepresentative, verifyRecord } from "@/lib/actions/governance";

export function CorrectionDecision({ requestId, applicable }: { requestId: string; applicable: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (decision: "approve" | "reject") =>
    startTransition(async () => {
      const result = await resolveCorrection(requestId, decision);
      setError(result?.error ?? null);
    });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className="btn btn-sm btn-accent" disabled={pending || !applicable} onClick={() => run("approve")}>
        Apply change
      </button>
      <button type="button" className="btn btn-sm" disabled={pending} onClick={() => run("reject")}>
        Reject
      </button>
      {!applicable && <span className="text-xs text-mist">Needs a manual edit</span>}
      {error && <span className="text-xs text-rust">{error}</span>}
    </div>
  );
}

export function RepresentativeDecision({ representativeId }: { representativeId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex gap-2">
      <button
        type="button"
        className="btn btn-sm btn-accent"
        disabled={pending}
        onClick={() => startTransition(async () => { await reviewRepresentative(representativeId, "verify"); })}
      >
        Verify
      </button>
      <button
        type="button"
        className="btn btn-sm"
        disabled={pending}
        onClick={() => startTransition(async () => { await reviewRepresentative(representativeId, "reject"); })}
      >
        Reject
      </button>
    </div>
  );
}

export function VerifyButton({ entityType, entityId }: { entityType: "TuitionRecord" | "LivingCostRecord"; entityId: string }) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-sm"
      disabled={pending || done}
      onClick={() =>
        startTransition(async () => {
          await verifyRecord(entityType, entityId);
          setDone(true);
        })
      }
    >
      {done ? "Verified" : "Mark verified"}
    </button>
  );
}

export function ProposeChangeForm({
  universityId,
  records,
}: {
  universityId: string;
  records: { entityType: string; entityId: string; field: string; label: string; current: string }[];
}) {
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState("");
  const [message, setMessage] = useState("");
  const [evidence, setEvidence] = useState("");
  const [state, setState] = useState<{ error?: string; ok?: boolean }>({});
  const [pending, startTransition] = useTransition();
  const record = records[index];

  if (!record) return <p className="text-sm text-slate">No editable records for this university yet.</p>;

  return (
    <div className="space-y-3">
      <div>
        <label className="label" htmlFor="record">Record to correct</label>
        <select id="record" className="input" value={index} onChange={(event) => setIndex(Number(event.target.value))}>
          {records.map((entry, position) => (
            <option key={`${entry.entityId}-${entry.field}`} value={position}>
              {entry.label} — currently {entry.current}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="value">Correct value</label>
        <input id="value" className="input" inputMode="decimal" value={value} onChange={(event) => setValue(event.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="evidence">Link to the official page</label>
        <input id="evidence" className="input" placeholder="https://" value={evidence} onChange={(event) => setEvidence(event.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="message">What changed and when</label>
        <textarea id="message" className="input min-h-20" value={message} onChange={(event) => setMessage(event.target.value)} />
      </div>

      {state.error && <p className="text-sm text-rust">{state.error}</p>}
      {state.ok && <p className="text-sm text-viridian">Sent for review. An administrator applies it once verified.</p>}

      <button
        type="button"
        className="btn btn-accent"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await proposeChange({
              universityId,
              entityType: record.entityType,
              entityId: record.entityId,
              field: record.field,
              claimedValue: value,
              message,
              evidenceUrl: evidence,
            });
            setState(result && "error" in result && result.error ? { error: result.error } : { ok: true });
          })
        }
      >
        {pending ? "Sending…" : "Submit for review"}
      </button>
    </div>
  );
}

export function ClaimForm({ universities }: { universities: { id: string; name: string }[] }) {
  const [universityId, setUniversityId] = useState(universities[0]?.id ?? "");
  const [workEmail, setWorkEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [state, setState] = useState<{ error?: string; ok?: boolean }>({});
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      <div>
        <label className="label" htmlFor="claim-university">University</label>
        <select id="claim-university" className="input" value={universityId} onChange={(event) => setUniversityId(event.target.value)}>
          {universities.map((university) => (
            <option key={university.id} value={university.id}>{university.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="claim-email">Work email</label>
        <input id="claim-email" className="input" type="email" value={workEmail} onChange={(event) => setWorkEmail(event.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="claim-title">Job title</label>
        <input id="claim-title" className="input" value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} />
      </div>
      {state.error && <p className="text-sm text-rust">{state.error}</p>}
      {state.ok && <p className="text-sm text-viridian">Claim submitted. An administrator will review it.</p>}
      <button
        type="button"
        className="btn btn-accent"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await claimUniversity(universityId, workEmail, jobTitle);
            setState(result?.error ? { error: result.error } : { ok: true });
          })
        }
      >
        {pending ? "Submitting…" : "Claim this profile"}
      </button>
    </div>
  );
}
