"use client";

import { onValue, ref } from "firebase/database";
import { useEffect, useState } from "react";
import { firebaseDb } from "@/lib/firebase-client";

type ScheduleField = "nextFeedAt" | "nextCleanAt";

function toMilliseconds(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  return value < 100_000_000_000 ? value * 1000 : value;
}

function formatRemaining(target: number | null, now: number): string {
  if (!target) return "Waiting for controller";
  const remaining = target - now;
  if (remaining <= 0) return "Due now";

  const totalMinutes = Math.ceil(remaining / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${String(hours).padStart(2, "0")}h`;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  return `${minutes}m`;
}

export function ScheduleCountdown({ field, prefix = "" }: { field: ScheduleField; prefix?: string }) {
  const [target, setTarget] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const unsubscribe = onValue(ref(firebaseDb, `devices/aqua-main/status/${field}`), (snapshot) => {
      setTarget(toMilliseconds(snapshot.val()));
    });
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => {
      unsubscribe();
      window.clearInterval(timer);
    };
  }, [field]);

  return <span>{prefix}{formatRemaining(target, now)}</span>;
}
