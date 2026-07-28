"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface Me {
  id: number;
  name: string;
  email: string;
  credits: number;
  available: number;
  teachTags: string[];
  learnTags: string[];
  learningStyle: string;
  teachingStyle: string;
}

export function useCurrentUser() {
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/auth/me");
    const data = await res.json();
    setUser(data.user);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { user, loading, refresh };
}

/**
 * Poll an async fetcher every `ms`. Returns the latest value plus a manual
 * refresh. Pauses while the tab is hidden to avoid pointless requests.
 */
export function usePoll<T>(fetcher: () => Promise<T>, ms = 4000) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const saved = useRef(fetcher);
  saved.current = fetcher;

  const refresh = useCallback(async () => {
    try {
      const next = await saved.current();
      setData(next);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const tick = () => {
      if (document.visibilityState === "visible" && active) refresh();
    };
    refresh();
    const timer = setInterval(tick, ms);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [refresh, ms]);

  return { data, loading, refresh };
}
