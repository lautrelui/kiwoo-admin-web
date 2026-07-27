// M4A-2 · participant data-loading hooks with dark-read/feature-gate + offline + stale-state handling.
//
// Design invariants:
//  - A 503 from a gated route is a DELIBERATE "unavailable/upgrade-in-progress" state, NOT a crash.
//  - Financial/actionable state must be validated by a LIVE server response; on offline or lifecycle
//    resume we discard optimistic assumptions and re-fetch.
//  - Money is never computed here.

import { useCallback, useEffect, useRef, useState } from "react";
import { marketplaceError, type MarketplaceError } from "@/services/marketplaceParticipantService";

export type FeatureAvailability = "available" | "disabled" | "unauthorized" | "error";

export interface AsyncResource<T> {
  data: T | null;
  loading: boolean;
  error: MarketplaceError | null;
  /** Derived availability for gate-aware rendering (503 → disabled, 401/403 → unauthorized). */
  availability: FeatureAvailability;
  reload: () => Promise<void>;
}

function availabilityOf(err: MarketplaceError | null): FeatureAvailability {
  if (!err) return "available";
  if (err.status === 503) return "disabled";
  if (err.status === 401 || err.status === 403) return "unauthorized";
  return "error";
}

/** Load a participant resource; expose loading/error + a stable reload. Never throws to the caller. */
export function useAsyncResource<T>(loader: () => Promise<T>, deps: unknown[] = []): AsyncResource<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<MarketplaceError | null>(null);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const alive = useRef(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const r = await loaderRef.current();
      if (alive.current) {
        setData(r);
        setError(null);
      }
    } catch (e) {
      if (alive.current) setError(marketplaceError(e));
    } finally {
      if (alive.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    alive.current = true;
    reload();
    return () => {
      alive.current = false;
    };
  }, [reload]);

  return { data, loading, error, availability: availabilityOf(error), reload };
}

/** Reactive online/offline flag. When offline, actionable state must be blocked (never queued). */
export function useOnline(): boolean {
  const [online, setOnline] = useState<boolean>(typeof navigator === "undefined" ? true : navigator.onLine);
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);
  return online;
}

/**
 * Re-run `reload` on lifecycle transitions that can leave the UI stale: window focus, tab restore
 * (visibilitychange → visible), reconnect (online). This replaces optimistic assumptions with the
 * server's current state before any action is enabled.
 */
export function useLifecycleRefresh(reload: () => void): void {
  const cb = useRef(reload);
  cb.current = reload;
  useEffect(() => {
    const onFocus = () => cb.current();
    const onVisible = () => {
      if (document.visibilityState === "visible") cb.current();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
}

/** A once-per-second ticking clock (for display-only SLA countdowns). */
export function useNowTick(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
