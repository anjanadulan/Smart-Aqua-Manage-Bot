"use client";

import { EyeIcon, EyeSlashIcon, LockKeyIcon, SignInIcon, UserIcon } from "@phosphor-icons/react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { firebaseAuth } from "@/lib/firebase-client";

export function LoginForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);

    const form = new FormData(event.currentTarget);
    try {
      const credential = await signInWithEmailAndPassword(
        firebaseAuth,
        String(form.get("email")),
        String(form.get("password")),
      );
      const idToken = await credential.user.getIdToken();
      const response = await fetch("/api/auth/firebase-session", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        await signOut(firebaseAuth);
        setError(result.error || "Unable to sign in.");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch (error) {
      const code = error instanceof Error && "code" in error
        ? String((error as { code?: unknown }).code)
        : "";
      setError(code.includes("invalid-credential") || code.includes("invalid-login-credentials")
        ? "Invalid email or password."
        : "Firebase sign-in could not be completed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit} noValidate>
      <div className="field-group">
        <label htmlFor="email">Email address</label>
        <div className="input-shell">
          <UserIcon size={18} weight="duotone" aria-hidden="true" />
          <input id="email" name="email" type="email" autoComplete="username" required disabled={!configured || pending} />
        </div>
      </div>

      <div className="field-group">
        <label htmlFor="password">Password</label>
        <div className="input-shell">
          <LockKeyIcon size={18} weight="duotone" aria-hidden="true" />
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            disabled={!configured || pending}
          />
          <button
            className="input-action"
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            disabled={!configured}
          >
            {showPassword ? <EyeSlashIcon size={18} /> : <EyeIcon size={18} />}
          </button>
        </div>
      </div>

      {error && <p className="form-message error" role="alert">{error}</p>}

      <button className="form-submit" type="submit" disabled={!configured || pending}>
        <SignInIcon size={18} weight="bold" aria-hidden="true" />
        {pending ? "Checking credentials" : "Sign in securely"}
      </button>
    </form>
  );
}
