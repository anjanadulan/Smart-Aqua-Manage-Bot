import { CheckCircleIcon, DropIcon, LockKeyIcon, ShieldCheckIcon, WarningCircleIcon } from "@phosphor-icons/react/dist/ssr";
import { redirect } from "next/navigation";
import { LoginForm } from "@/app/login/login-form";
import { getSession } from "@/lib/session";
import { getSettings, hasSessionSecret } from "@/lib/config-store";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ credentials?: string }>;
}) {
  if (await getSession()) redirect("/");
  const configured = Boolean(await getSettings()) && hasSessionSecret() && Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  );
  const credentialsUpdated = (await searchParams).credentials === "updated";

  return (
    <main className="auth-page">
      <section className="auth-panel" aria-labelledby="login-title">
        <div className="auth-brand">
          <span className="brand-symbol"><DropIcon size={23} weight="fill" aria-hidden="true" /></span>
          <span><small>SMART AQUA SYSTEM</small><strong>Aqua Command</strong></span>
        </div>

        <div className="auth-heading">
          <span className="auth-lock"><LockKeyIcon size={23} weight="duotone" aria-hidden="true" /></span>
          <div>
            <h1 id="login-title">Operator sign in</h1>
          <p>Sign in with the Firebase operator account to open system controls and settings.</p>
          </div>
        </div>

        {!configured && (
          <div className="config-warning" role="alert">
            <WarningCircleIcon size={21} weight="duotone" aria-hidden="true" />
            <div>
              <strong>Login setup required</strong>
              <p>Confirm the Firebase web configuration, FIREBASE_OPERATOR_UID, and SESSION_SECRET are present in <code>.env.local</code>, then restart the server.</p>
            </div>
          </div>
        )}

        {credentialsUpdated && (
          <p className="form-message success credential-update-message" role="status">
            <CheckCircleIcon size={18} weight="fill" aria-hidden="true" />
            Credentials updated. Sign in again with the new details.
          </p>
        )}

        <LoginForm configured={configured} />

        <div className="auth-footnote">
          <ShieldCheckIcon size={17} weight="duotone" aria-hidden="true" />
          <span>Firebase verifies your account before a signed, HTTP-only session cookie is issued.</span>
        </div>
      </section>
    </main>
  );
}
