import { ShieldCheckIcon } from "@phosphor-icons/react/dist/ssr";
import { AppHeader } from "@/app/components/app-header";
import { SettingsForm } from "@/app/settings/settings-form";
import { getPublicSettings } from "@/lib/config-store";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireSession();
  const settings = await getPublicSettings();
  if (!settings) return null;

  return (
    <main className="dashboard-shell workspace-shell">
      <AppHeader active="settings" />
      <div className="workspace-main">
        <header className="workspace-topbar settings-topbar">
          <div className="workspace-greeting">
            <span className="section-label">AQUA COMMAND</span>
            <h1>System settings</h1>
          </div>
          <div className="settings-topbar-status">
            <ShieldCheckIcon size={18} weight="duotone" aria-hidden="true" />
            <span>Protected operator access</span>
          </div>
        </header>
        <div className="settings-layout">
          <header className="settings-page-heading">
            <div>
              <span className="section-label">CONFIGURATION</span>
              <h2>Care schedule and access</h2>
              <p>Manage operator access and the intervals used by automatic aquarium care.</p>
            </div>
            <div className="settings-security-note">
              <ShieldCheckIcon size={22} weight="duotone" aria-hidden="true" />
              <span><strong>Local server</strong>Changes stay on this Aqua Command instance.</span>
            </div>
          </header>
          <SettingsForm initial={settings} />
        </div>
      </div>
    </main>
  );
}
