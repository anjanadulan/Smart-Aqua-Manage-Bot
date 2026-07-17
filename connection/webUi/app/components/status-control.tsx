"use client";

import { onValue, ref, set } from "firebase/database";
import { useEffect, useState } from "react";
import { firebaseAuth, firebaseDb } from "@/lib/firebase-client";

const statusPath = "devices/aqua-main/status";

type BooleanField = "filtrationRelay" | "uvRelay" | "feederActive" | "glassCleanerActive";

function useStatusBoolean(field: BooleanField) {
  const [value, setValue] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const unsubscribe = onValue(ref(firebaseDb, `${statusPath}/${field}`), (snapshot) => {
      setValue(snapshot.val() === true);
    });
    return unsubscribe;
  }, [field]);

  async function write(nextValue: boolean) {
    if (!firebaseAuth.currentUser) return false;
    setPending(true);
    try {
      await set(ref(firebaseDb, `${statusPath}/${field}`), nextValue);
      setValue(nextValue);
      return true;
    } catch {
      return false;
    } finally {
      setPending(false);
    }
  }

  return { value, pending, write };
}

export function LiveStateChip({
  field,
  onLabel,
  offLabel,
}: {
  field: BooleanField;
  onLabel: string;
  offLabel: string;
}) {
  const { value } = useStatusBoolean(field);
  return <span className={`state-chip ${value ? "state-on" : "state-idle"}`}>{value ? onLabel : offLabel}</span>;
}

export function StatusControlButton({
  field,
  mode,
  onLabel,
  offLabel,
}: {
  field: BooleanField;
  mode: "toggle" | "momentary";
  onLabel: string;
  offLabel: string;
}) {
  const { value, pending, write } = useStatusBoolean(field);
  const label = mode === "momentary" && value ? "Running" : value ? onLabel : offLabel;

  return (
    <button
      className={`control-button ${mode === "toggle" && value ? "danger-action" : ""}`}
      type="button"
      disabled={pending || (mode === "momentary" && value)}
      onClick={() => void write(mode === "toggle" ? !value : true)}
    >
      {pending ? "Updating…" : label}
    </button>
  );
}
