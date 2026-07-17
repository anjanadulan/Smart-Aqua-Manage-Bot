import {
  CameraIcon,
  ClockCountdownIcon,
  DropIcon,
  GearSixIcon,
  SquaresFourIcon,
  WavesIcon,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { LogoutButton } from "@/app/components/logout-button";

export function AppHeader({ active }: { active: "dashboard" | "settings" }) {
  return (
    <aside className="app-rail" aria-label="Aqua Command navigation">
      <Link className="rail-brand" href="/" aria-label="Aqua Command dashboard" title="Aqua Command">
        <DropIcon size={21} weight="fill" aria-hidden="true" />
      </Link>

      <nav className="rail-nav" aria-label="Primary navigation">
        <Link className={active === "dashboard" ? "active" : ""} href="/" title="Dashboard" aria-label="Dashboard">
          <SquaresFourIcon size={18} weight="bold" aria-hidden="true" />
        </Link>
        <Link href="/#water-status" title="Water status" aria-label="Water status">
          <WavesIcon size={18} weight="duotone" aria-hidden="true" />
        </Link>
        <Link href="/#automation" title="Automation" aria-label="Automation">
          <ClockCountdownIcon size={18} weight="duotone" aria-hidden="true" />
        </Link>
        <Link href="/#camera-title" title="Camera preview" aria-label="Camera preview">
          <CameraIcon size={18} weight="duotone" aria-hidden="true" />
        </Link>
      </nav>

      <div className="rail-footer">
        <Link className={active === "settings" ? "active" : ""} href="/settings" title="Settings" aria-label="Settings">
          <GearSixIcon size={18} weight="duotone" aria-hidden="true" />
        </Link>
        <LogoutButton compact />
      </div>
    </aside>
  );
}

