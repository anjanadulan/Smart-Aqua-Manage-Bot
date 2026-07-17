import {
  BellRingingIcon,
  CameraIcon,
  CheckCircleIcon,
  ClockCountdownIcon,
  FanIcon,
  FishSimpleIcon,
  GaugeIcon,
  LightningIcon,
  MagnifyingGlassIcon,
  BellIcon,
  MoonStarsIcon,
  ShieldCheckIcon,
  SparkleIcon,
  VideoCameraIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/dist/ssr";
import { AppHeader } from "@/app/components/app-header";
import { LiveStateChip, StatusControlButton } from "@/app/components/status-control";
import { ScheduleCountdown } from "@/app/components/schedule-countdown";
import { LiveSystemStatus } from "@/app/components/live-system-status";
import { getPublicSettings } from "@/lib/config-store";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const activity = [
  { time: "13:42", title: "TDS quality checked", detail: "148 ppm classified as Good", tone: "ok" },
  { time: "12:10", title: "Filter cycle completed", detail: "Pump returned to automatic mode", tone: "ok" },
  { time: "09:00", title: "Scheduled feeding", detail: "One portion dispensed", tone: "info" },
];

export default async function Home() {
  await requireSession();
  const settings = await getPublicSettings();
  if (!settings) return null;
  return (
    <main className="dashboard-shell workspace-shell">
      <AppHeader active="dashboard" />
      <div className="workspace-main">
        <header className="workspace-topbar">
          <div className="workspace-greeting">
            <span className="section-label">CONTROL CENTER</span>
            <h1>Good morning, Aqua operator</h1>
          </div>
          <div className="workspace-actions">
            <label className="workspace-search">
              <MagnifyingGlassIcon size={15} aria-hidden="true" />
              <input type="search" aria-label="Search dashboard" placeholder="Search" />
            </label>
            <button className="notification-button" type="button" aria-label="Open notifications">
              <BellIcon size={17} weight="duotone" aria-hidden="true" />
              <span />
            </button>
            <span className="demo-badge"><span /> Firebase linked</span>
          </div>
        </header>

        <div className="dashboard-grid">
        <section className="primary-column">
          <div className="overview-heading">
            <div>
              <span className="section-label">SYSTEM OVERVIEW</span>
              <h2>Your aquarium is running smoothly.</h2>
              <p>Monitor water conditions and manage essential equipment from one control surface.</p>
            </div>
            <div className="health-score">
              <ShieldCheckIcon size={23} weight="duotone" aria-hidden="true" />
              <span><strong>All systems normal</strong>4 of 4 checks passed</span>
            </div>
          </div>

          <LiveSystemStatus feedingIntervalHours={settings.feedingIntervalHours} />

          <section className="section-block" id="automation" aria-labelledby="controls-title">
            <div className="section-heading">
              <div>
                <span className="section-label">EQUIPMENT</span>
                <h2 id="controls-title">System controls</h2>
              </div>
              <span className="static-note">Relay status controls</span>
            </div>

            <div className="controls-grid">
              <article className="control-card control-active">
                <div className="control-topline">
                  <span className="control-icon"><FanIcon size={22} weight="duotone" /></span>
                  <LiveStateChip field="filtrationRelay" onLabel="Running" offLabel="Off" />
                </div>
                <div className="control-content">
                  <h3>Filtration pump</h3>
                  <p>Continuous water circulation and mechanical filtration.</p>
                </div>
                <div className="control-footer">
                  <span><GaugeIcon size={15} /> Relay channel 1</span>
                  <StatusControlButton field="filtrationRelay" mode="toggle" onLabel="Turn off" offLabel="Turn on" />
                </div>
              </article>

              <article className="control-card">
                <div className="control-topline">
                  <span className="control-icon violet"><MoonStarsIcon size={22} weight="duotone" /></span>
                  <LiveStateChip field="uvRelay" onLabel="Running" offLabel="Off" />
                </div>
                <div className="control-content">
                  <h3>UV sterilizer</h3>
                  <p>Automatic 12-hour night cycle from 18:00 to 06:00.</p>
                </div>
                <div className="control-footer">
                  <span><LightningIcon size={15} /> Starts in 04:18</span>
                  <StatusControlButton field="uvRelay" mode="toggle" onLabel="Turn off" offLabel="Turn on" />
                </div>
              </article>

              <article className="control-card">
                <div className="control-topline">
                  <span className="control-icon amber"><FishSimpleIcon size={22} weight="duotone" /></span>
                  <LiveStateChip field="feederActive" onLabel="Running" offLabel="Ready" />
                </div>
                <div className="control-content">
                  <h3>Automatic feeder</h3>
                  <p>Automatic portions are scheduled every {settings.feedingIntervalHours} hours.</p>
                </div>
                <div className="control-footer">
                  <span><CheckCircleIcon size={15} /> IR surface clear</span>
                  <StatusControlButton field="feederActive" mode="momentary" onLabel="Running" offLabel="Feed now" />
                </div>
              </article>

              <article className="control-card">
                <div className="control-topline">
                  <span className="control-icon blue"><SparkleIcon size={22} weight="duotone" /></span>
                  <LiveStateChip field="glassCleanerActive" onLabel="Running" offLabel="Idle" />
                </div>
                <div className="control-content">
                  <h3>Glass cleaner</h3>
                  <p>Automatic glass cleaning runs every {settings.cleaningIntervalDays} days.</p>
                </div>
                <div className="control-footer">
                  <span><ClockCountdownIcon size={15} /> <ScheduleCountdown field="nextCleanAt" prefix="Auto clean in " /></span>
                  <StatusControlButton field="glassCleanerActive" mode="momentary" onLabel="Running" offLabel="Start cycle" />
                </div>
              </article>
            </div>
          </section>

          <section className="safety-panel" aria-labelledby="safety-title">
            <div className="safety-icon"><BellRingingIcon size={23} weight="duotone" /></div>
            <div>
              <span className="section-label">SAFETY MONITOR</span>
              <h2 id="safety-title">No active alerts</h2>
              <p>HW-038 critical-level shutdown and TDS quality warnings are armed.</p>
            </div>
            <button type="button">View alert history</button>
          </section>
        </section>

        <aside className="side-column" aria-label="Camera and recent activity">
          <section className="camera-panel" aria-labelledby="camera-title">
            <div className="panel-heading">
              <div>
                <span className="section-label">LIVE VIEW</span>
                <h2 id="camera-title">ESP32-CAM preview</h2>
              </div>
              <span className="live-badge"><span /> Live</span>
            </div>

            <div className="camera-viewport" role="img" aria-label="Demo aquarium camera preview">
              <div className="camera-water-light" />
              <div className="plant plant-left"><i /><i /><i /></div>
              <div className="plant plant-right"><i /><i /></div>
              <div className="fish fish-one"><span /></div>
              <div className="fish fish-two"><span /></div>
              <div className="camera-grain" />
              <div className="camera-hud">
                <span><VideoCameraIcon size={13} weight="fill" /> CAM-01</span>
                <span>640 × 480</span>
              </div>
              <div className="camera-time">14:02:36</div>
            </div>

            <div className="camera-meta">
              <span><CameraIcon size={16} /> ESP32-CAM</span>
              <span><span className="signal-bars"><i /><i /><i /></span> Good signal</span>
            </div>
            <button className="camera-button" type="button"><CameraIcon size={17} /> Open full preview</button>
          </section>

          <section className="activity-panel" aria-labelledby="activity-title">
            <div className="panel-heading">
              <div>
                <span className="section-label">TIMELINE</span>
                <h2 id="activity-title">Recent activity</h2>
              </div>
              <button type="button">View all</button>
            </div>

            <div className="activity-list">
              {activity.map((item) => (
                <article className="activity-item" key={`${item.time}-${item.title}`}>
                  <span className={`activity-dot ${item.tone}`} />
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.detail}</p>
                  </div>
                  <time>{item.time}</time>
                </article>
              ))}
            </div>
          </section>

          <section className="device-strip">
            <div><span className="device-icon"><LightningIcon size={17} /></span><span><small>Main controller</small><strong>ESP32 DevKit</strong></span></div>
            <div><span className="device-icon"><CameraIcon size={17} /></span><span><small>Camera module</small><strong>ESP32-CAM</strong></span></div>
            <div className="device-notice"><WarningCircleIcon size={16} /><span>Demo data only. No hardware is connected.</span></div>
          </section>
        </aside>
        </div>
      </div>
    </main>
  );
}
