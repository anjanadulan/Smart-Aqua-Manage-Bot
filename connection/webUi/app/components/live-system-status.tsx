"use client";

import {
  ClockCountdownIcon,
  DropIcon,
  GaugeIcon,
  SparkleIcon,
  ThermometerSimpleIcon,
  WavesIcon,
} from "@phosphor-icons/react";
import { onValue, ref } from "firebase/database";
import { useEffect, useState } from "react";
import { firebaseDb } from "@/lib/firebase-client";
import { ScheduleCountdown } from "@/app/components/schedule-countdown";

type LiveStatus = {
  online: boolean;
  waterLevel: "BEST" | "MEDIUM" | "LOW" | "CRITICAL";
  waterQuality: "GOOD" | "AVERAGE" | "BAD";
  tdsPpm: number;
  temperatureC: number;
};

const fallbackStatus: LiveStatus = {
  online: false,
  waterLevel: "BEST",
  waterQuality: "GOOD",
  tdsPpm: 148,
  temperatureC: 26.4,
};

function levelProgress(level: LiveStatus["waterLevel"]): number {
  return { BEST: 92, MEDIUM: 66, LOW: 38, CRITICAL: 14 }[level];
}

function qualityProgress(quality: LiveStatus["waterQuality"]): number {
  return { GOOD: 86, AVERAGE: 58, BAD: 24 }[quality];
}

export function LiveSystemStatus({ feedingIntervalHours }: { feedingIntervalHours: number }) {
  const [status, setStatus] = useState(fallbackStatus);
  const [liveFeedingInterval, setLiveFeedingInterval] = useState(feedingIntervalHours);
  const [connection, setConnection] = useState<"connecting" | "live" | "offline">("connecting");

  useEffect(() => {
    const statusRef = ref(firebaseDb, "devices/aqua-main/status");
    const configRef = ref(firebaseDb, "devices/aqua-main/config");
    const unsubscribe = onValue(
      statusRef,
      (snapshot) => {
        const value = snapshot.val() as Partial<LiveStatus> | null;
        setStatus({ ...fallbackStatus, ...value });
        setConnection("live");
      },
      () => setConnection("offline"),
    );
    const unsubscribeConfig = onValue(configRef, (snapshot) => {
      const value = snapshot.val() as { feedingIntervalHours?: unknown } | null;
      if (typeof value?.feedingIntervalHours === "number") {
        setLiveFeedingInterval(value.feedingIntervalHours);
      }
    });
    return () => {
      unsubscribe();
      unsubscribeConfig();
    };
  }, [feedingIntervalHours]);

  return (
    <>
      <div className="status-grid" id="water-status" aria-label="Aquarium status">
        <article className="status-card">
          <div className="status-icon tone-aqua"><WavesIcon size={20} weight="duotone" aria-hidden="true" /></div>
          <div className="status-copy"><span>Water level</span><strong>{status.waterLevel}</strong></div>
          <div className="status-progress" aria-label={`${status.waterLevel} water level`}><span style={{ "--progress": `${levelProgress(status.waterLevel)}%` } as React.CSSProperties} /></div>
          <small>HW-038 sensor · {status.online ? "Live reading" : "Demo fallback"}</small>
        </article>

        <article className="status-card">
          <div className="status-icon tone-aqua"><SparkleIcon size={20} weight="duotone" aria-hidden="true" /></div>
          <div className="status-copy"><span>TDS water quality</span><strong>{status.waterQuality}</strong></div>
          <div className="status-progress" aria-label={`${status.waterQuality} water quality`}><span style={{ "--progress": `${qualityProgress(status.waterQuality)}%` } as React.CSSProperties} /></div>
          <small>{status.tdsPpm} ppm · TDS sensor</small>
        </article>

        <article className="status-card">
          <div className="status-icon tone-warm"><ThermometerSimpleIcon size={20} weight="duotone" aria-hidden="true" /></div>
          <div className="status-copy"><span>Temperature</span><strong>{status.temperatureC.toFixed(1)}°</strong></div>
          <div className="status-progress" aria-label="Temperature stability"><span style={{ "--progress": "66%" } as React.CSSProperties} /></div>
          <small>{status.online ? "Stable · live reading" : "Stable · demo fallback"}</small>
        </article>

        <article className="status-card">
          <div className="status-icon tone-blue"><ClockCountdownIcon size={20} weight="duotone" aria-hidden="true" /></div>
          <div className="status-copy"><span>Next feeding</span><strong><ScheduleCountdown field="nextFeedAt" /></strong></div>
          <div className="status-progress" aria-label="Next feeding schedule"><span style={{ "--progress": "72%" } as React.CSSProperties} /></div>
          <small>Every {liveFeedingInterval} hours · controller schedule</small>
        </article>
      </div>
      <div className={`firebase-sync-note ${connection}`} role="status">
        <span /> {connection === "live" ? "Firebase live status connected" : connection === "offline" ? "Firebase unavailable · showing safe fallback" : "Connecting to Firebase status…"}
      </div>
      <section className="sensor-logic" aria-label="Live sensor status categories">
        <div className="logic-group">
          <div className="logic-title">
            <span className="logic-icon"><DropIcon size={17} weight="duotone" /></span>
            <span><small>HW-038 WATER LEVEL</small><strong>{status.waterLevel}</strong></span>
          </div>
          <div className="logic-scale" aria-label={`Water level is ${status.waterLevel.toLowerCase()}`}>
            {(["BEST", "MEDIUM", "LOW", "CRITICAL"] as const).map((level) => (
              <span className={`logic-state ${level === status.waterLevel ? "active best" : ""} ${level === "CRITICAL" ? "critical" : ""}`} key={level}>{level[0] + level.slice(1).toLowerCase()}</span>
            ))}
          </div>
        </div>
        <div className="logic-group">
          <div className="logic-title">
            <span className="logic-icon"><GaugeIcon size={17} weight="duotone" /></span>
            <span><small>TDS WATER QUALITY</small><strong>{status.tdsPpm} ppm</strong></span>
          </div>
          <div className="logic-scale three-state" aria-label={`TDS water quality is ${status.waterQuality.toLowerCase()}`}>
            {(["GOOD", "AVERAGE", "BAD"] as const).map((quality) => (
              <span className={`logic-state ${quality === status.waterQuality ? "active best" : ""} ${quality === "AVERAGE" ? "average" : ""} ${quality === "BAD" ? "bad" : ""}`} key={quality}>{quality[0] + quality.slice(1).toLowerCase()}</span>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
