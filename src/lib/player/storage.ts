import type { PlayerProfile, SupportedLocale } from "@/lib/types";
import { createUuid } from "@/lib/id";

export const PROFILE_KEY = "chess-coach-player-v1";

export function createProfile(nickname: string, locale: SupportedLocale): PlayerProfile {
  const now = new Date().toISOString();
  return {
    playerId: createUuid(),
    nickname: nickname.trim().slice(0, 20),
    preferredLocale: locale,
    opponentEngine: "stockfish",
    createdAt: now,
    updatedAt: now,
    lessonProgress: {
      learnedRules: [], seenRules: [], gamesPlayed: 0,
      legalMovesMade: 0, illegalMoveAttempts: 0,
    },
    recurringMistakes: [],
  };
}

export function loadProfile(): PlayerProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const value = localStorage.getItem(PROFILE_KEY);
    if (!value) return null;
    const profile = JSON.parse(value) as PlayerProfile;
    return profile.playerId && profile.nickname ? profile : null;
  } catch { return null; }
}

export function saveProfile(profile: PlayerProfile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...profile, updatedAt: new Date().toISOString() }));
}

export function clearProfile(): void {
  localStorage.removeItem(PROFILE_KEY);
}
