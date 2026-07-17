"use client";

import {
  ArrowCounterClockwiseIcon,
  CheckCircleIcon,
  ClockCountdownIcon,
  EyeIcon,
  EyeSlashIcon,
  LockKeyIcon,
  UserIcon,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ref, update } from "firebase/database";
import { firebaseAuth, firebaseDb } from "@/lib/firebase-client";
import type { PublicSettings } from "@/lib/config-store";

type Result = { error?: string; reauthenticate?: boolean };

export function SettingsForm({ initial }: { initial: PublicSettings }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const newPassword = String(form.get("newPassword") || "");
    const confirmPassword = String(form.get("confirmPassword") || "");

    if (newPassword !== confirmPassword) {
      setMessage({ tone: "error", text: "The new password confirmation does not match." });
      return;
    }

    setPending(true);
    setMessage(null);
    try {
      const feedingIntervalHours = Number(form.get("feedingIntervalHours"));
      const cleaningIntervalDays = Number(form.get("cleaningIntervalDays"));
      if (!firebaseAuth.currentUser) {
        setMessage({ tone: "error", text: "Your Firebase session has expired. Sign in again before saving settings." });
        return;
      }

      try {
        await update(ref(firebaseDb, "devices/aqua-main/config"), {
          feedingIntervalHours,
          cleaningIntervalDays,
        });
      } catch (error) {
        const code = error instanceof Error && "code" in error
          ? String((error as { code?: unknown }).code)
          : "";
        setMessage({
          tone: "error",
          text: code.includes("PERMISSION_DENIED")
            ? "Firebase denied this change. Confirm you are signed in as the Aqua operator."
            : "Firebase could not save the automation settings.",
        });
        return;
      }

      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.get("username"),
          currentPassword: form.get("currentPassword"),
          newPassword,
          feedingIntervalHours,
          cleaningIntervalDays,
        }),
      });
      const result = (await response.json()) as Result;
      if (!response.ok) {
        if (response.status === 401) {
          router.replace("/login");
          router.refresh();
          return;
        }
        setMessage({ tone: "error", text: result.error || "Settings could not be saved." });
        return;
      }
      if (result.reauthenticate) {
        router.replace("/login?credentials=updated");
        router.refresh();
        return;
      }
      formElement.reset();
      const usernameInput = formElement.elements.namedItem("username") as HTMLInputElement | null;
      const feedingInput = formElement.elements.namedItem("feedingIntervalHours") as HTMLInputElement | null;
      const cleaningInput = formElement.elements.namedItem("cleaningIntervalDays") as HTMLInputElement | null;
      if (usernameInput) usernameInput.value = String(form.get("username"));
      if (feedingInput) feedingInput.value = String(form.get("feedingIntervalHours"));
      if (cleaningInput) cleaningInput.value = String(form.get("cleaningIntervalDays"));
      setMessage({ tone: "success", text: "Schedule settings saved to Firebase and this Aqua Command server." });
      router.refresh();
    } catch {
      setMessage({ tone: "error", text: "The Aqua Command server could not be reached." });
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="settings-form" onSubmit={submit}>
      <section className="settings-section" aria-labelledby="credentials-heading">
        <div className="settings-section-heading">
          <span><LockKeyIcon size={21} weight="duotone" aria-hidden="true" /></span>
          <div><h2 id="credentials-heading">Login credentials</h2><p>Changing either credential signs out every active browser session.</p></div>
        </div>

        <div className="settings-fields two-column">
          <div className="field-group">
            <label htmlFor="settings-username">Administrator username</label>
            <div className="input-shell">
              <UserIcon size={18} weight="duotone" aria-hidden="true" />
              <input id="settings-username" name="username" defaultValue={initial.username} minLength={3} maxLength={32} required disabled={pending} />
            </div>
            <small>Use 3-32 letters, numbers, dots, underscores, or hyphens.</small>
          </div>

          <div className="field-group">
            <label htmlFor="current-password">Current password</label>
            <div className="input-shell">
              <LockKeyIcon size={18} weight="duotone" aria-hidden="true" />
              <input id="current-password" name="currentPassword" type={showPasswords ? "text" : "password"} autoComplete="current-password" disabled={pending} />
            </div>
            <small>Required only when changing the username or password.</small>
          </div>

          <div className="field-group">
            <label htmlFor="new-password">New password</label>
            <div className="input-shell">
              <LockKeyIcon size={18} weight="duotone" aria-hidden="true" />
              <input id="new-password" name="newPassword" type={showPasswords ? "text" : "password"} autoComplete="new-password" minLength={12} maxLength={128} disabled={pending} />
            </div>
            <small>Leave blank to keep the current password. Minimum 12 characters.</small>
          </div>

          <div className="field-group">
            <label htmlFor="confirm-password">Confirm new password</label>
            <div className="input-shell">
              <LockKeyIcon size={18} weight="duotone" aria-hidden="true" />
              <input id="confirm-password" name="confirmPassword" type={showPasswords ? "text" : "password"} autoComplete="new-password" minLength={12} maxLength={128} disabled={pending} />
              <button className="input-action" type="button" onClick={() => setShowPasswords((value) => !value)} aria-label={showPasswords ? "Hide passwords" : "Show passwords"}>
                {showPasswords ? <EyeSlashIcon size={18} /> : <EyeIcon size={18} />}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="settings-section" aria-labelledby="automation-heading">
        <div className="settings-section-heading">
          <span><ClockCountdownIcon size={21} weight="duotone" aria-hidden="true" /></span>
          <div><h2 id="automation-heading">Automation intervals</h2><p>These values sync to Firebase and are mirrored locally for the dashboard fallback.</p></div>
        </div>

        <div className="settings-fields two-column">
          <div className="field-group interval-field">
            <label htmlFor="feeding-interval">Feeding interval</label>
            <div className="number-input">
              <input id="feeding-interval" name="feedingIntervalHours" type="number" min={1} max={24} step={1} defaultValue={initial.feedingIntervalHours} required disabled={pending} />
              <span>hours</span>
            </div>
            <small>Allowed range: every 1-24 hours.</small>
          </div>

          <div className="field-group interval-field">
            <label htmlFor="cleaning-interval">Glass cleaning interval</label>
            <div className="number-input">
              <input id="cleaning-interval" name="cleaningIntervalDays" type="number" min={1} max={30} step={1} defaultValue={initial.cleaningIntervalDays} required disabled={pending} />
              <span>days</span>
            </div>
            <small>Allowed range: every 1-30 days.</small>
          </div>
        </div>
      </section>

      <div className="settings-actions">
        {message && (
          <p className={`form-message ${message.tone}`} role={message.tone === "error" ? "alert" : "status"}>
            {message.tone === "success" && <CheckCircleIcon size={17} weight="fill" aria-hidden="true" />}
            {message.text}
          </p>
        )}
        <button className="form-submit" type="submit" disabled={pending}>
          <ArrowCounterClockwiseIcon size={18} weight="bold" aria-hidden="true" />
          {pending ? "Saving settings" : "Save settings"}
        </button>
      </div>
    </form>
  );
}
