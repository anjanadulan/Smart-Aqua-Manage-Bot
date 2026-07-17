import "server-only";

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export const FEED_INTERVAL_MIN = 1;
export const FEED_INTERVAL_MAX = 24;
export const CLEANING_INTERVAL_MIN = 1;
export const CLEANING_INTERVAL_MAX = 30;

type StoredSettings = {
  username: string;
  passwordHash: string;
  feedingIntervalHours: number;
  cleaningIntervalDays: number;
  sessionVersion: number;
  updatedAt: string;
};

export type PublicSettings = Pick<
  StoredSettings,
  "username" | "feedingIntervalHours" | "cleaningIntervalDays" | "sessionVersion"
>;

const DATA_DIRECTORY = process.env.AQUA_DATA_DIR
  ? path.resolve(process.env.AQUA_DATA_DIR)
  : path.join(process.cwd(), ".data");
const SETTINGS_FILE = path.join(DATA_DIRECTORY, "settings.json");

function isStoredSettings(value: unknown): value is StoredSettings {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<StoredSettings>;
  return (
    typeof candidate.username === "string" &&
    typeof candidate.passwordHash === "string" &&
    typeof candidate.feedingIntervalHours === "number" &&
    typeof candidate.cleaningIntervalDays === "number" &&
    typeof candidate.sessionVersion === "number" &&
    typeof candidate.updatedAt === "string"
  );
}

async function readStoredSettings(): Promise<StoredSettings | null> {
  try {
    const parsed: unknown = JSON.parse(await readFile(SETTINGS_FILE, "utf8"));
    return isStoredSettings(parsed) ? parsed : null;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return null;
    throw error;
  }
}

function settingsFromEnvironment(): StoredSettings | null {
  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) return null;

  return {
    username,
    passwordHash: hashPassword(password),
    feedingIntervalHours: 6,
    cleaningIntervalDays: 7,
    sessionVersion: 1,
    updatedAt: new Date().toISOString(),
  };
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derivedKey = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${derivedKey.toString("hex")}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [algorithm, saltHex, keyHex] = storedHash.split("$");
  if (algorithm !== "scrypt" || !saltHex || !keyHex) return false;

  try {
    const expected = Buffer.from(keyHex, "hex");
    const actual = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export async function getSettings(): Promise<StoredSettings | null> {
  return (await readStoredSettings()) ?? settingsFromEnvironment();
}

export async function getPublicSettings(): Promise<PublicSettings | null> {
  const settings = await getSettings();
  if (!settings) return null;
  const { username, feedingIntervalHours, cleaningIntervalDays, sessionVersion } = settings;
  return { username, feedingIntervalHours, cleaningIntervalDays, sessionVersion };
}

export async function saveSettings(settings: StoredSettings): Promise<void> {
  await mkdir(DATA_DIRECTORY, { recursive: true });
  const temporaryFile = `${SETTINGS_FILE}.${process.pid}.tmp`;
  await writeFile(temporaryFile, `${JSON.stringify(settings, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  await rename(temporaryFile, SETTINGS_FILE);
}

export async function updateSettings(input: {
  username: string;
  feedingIntervalHours: number;
  cleaningIntervalDays: number;
  newPassword?: string;
}): Promise<{ settings: StoredSettings; credentialsChanged: boolean }> {
  const current = await getSettings();
  if (!current) throw new Error("Authentication is not configured.");

  const credentialsChanged = input.username !== current.username || Boolean(input.newPassword);
  const next: StoredSettings = {
    ...current,
    username: input.username,
    passwordHash: input.newPassword ? hashPassword(input.newPassword) : current.passwordHash,
    feedingIntervalHours: input.feedingIntervalHours,
    cleaningIntervalDays: input.cleaningIntervalDays,
    sessionVersion: credentialsChanged ? current.sessionVersion + 1 : current.sessionVersion,
    updatedAt: new Date().toISOString(),
  };

  await saveSettings(next);
  return { settings: next, credentialsChanged };
}

export function hasSessionSecret(): boolean {
  return (process.env.SESSION_SECRET?.length ?? 0) >= 32;
}

