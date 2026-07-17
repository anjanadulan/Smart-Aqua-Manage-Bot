"use client";

import { SignOutIcon } from "@phosphor-icons/react";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { firebaseAuth } from "@/lib/firebase-client";

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      await signOut(firebaseAuth);
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <button className={`logout-button ${compact ? "rail-action" : ""}`} type="button" onClick={logout} disabled={pending} aria-label={compact ? "Sign out" : undefined}>
      <SignOutIcon size={17} weight="bold" aria-hidden="true" />
      <span>{pending ? "Signing out" : "Sign out"}</span>
    </button>
  );
}

