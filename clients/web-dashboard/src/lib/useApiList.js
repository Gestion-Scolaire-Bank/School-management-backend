import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Stale-while-revalidate list fetcher.
 * - Keeps previous data visible while reloading (no flicker/empty on input change).
 * - Ignores out-of-order responses (race guard via request id).
 * - Never wipes data on error (keeps stale + exposes error).
 */
export function useApiList(fetcher, { immediate = true } = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  const reqId = useRef(0);

  const load = useCallback(async (...args) => {
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    try {
      const res = await fetcher(...args);
      if (reqId.current !== id) return res; // stale response, ignore
      setData(res?.data ?? res ?? []);
    } catch (e) {
      if (reqId.current !== id) return null;
      // keep previous data on error — do NOT setData([])
      setError(e);
    } finally {
      if (reqId.current === id) setLoading(false);
    }
    return null;
  }, [fetcher]);

  useEffect(() => {
    if (immediate) load();
  }, [immediate, load]);

  return { data, setData, loading, error, reload: load };
}
