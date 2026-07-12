/**
 * RM console preferences — purely client-side UI settings (speed, default
 * channel, signature, notification toggle), scoped per user so a shared
 * branch computer doesn't leak one RM's settings into another's session.
 * Persisted to localStorage rather than the backend: there's no multi-device
 * sync requirement for these, and it keeps Save instant with no network
 * dependency.
 */

const STORAGE_PREFIX = "observe_prefs_";

const SPEED_MS = { Slow: 3000, Normal: 1500, Fast: 500 };

export const DEFAULT_PREFERENCES = {
  defaultChannel: "WhatsApp",
  speed: "Normal",
  notifications: true,
  signature: ""
};

export function getPreferences(userId) {
  if (!userId) return { ...DEFAULT_PREFERENCES };
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + userId);
    if (!raw) return { ...DEFAULT_PREFERENCES };
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function savePreferences(userId, prefs) {
  if (!userId) return;
  localStorage.setItem(STORAGE_PREFIX + userId, JSON.stringify(prefs));
}

export function getSpeedMs(speedLabel) {
  return SPEED_MS[speedLabel] || SPEED_MS.Normal;
}
