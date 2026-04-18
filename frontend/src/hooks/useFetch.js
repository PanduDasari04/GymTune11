/**
 * useFetch — generic data fetching hook with loading + error state.
 * Re-fetches whenever `url` changes. Pass null to skip.
 */
import { useState, useEffect, useCallback } from "react";
import api from "../lib/api.js";

export function useFetch(url) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(!!url);
  const [error,   setError]   = useState(null);

  const refetch = useCallback(async () => {
    if (!url) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.get(url);
      setData(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => { refetch(); }, [refetch]);

  return { data, loading, error, refetch };
}
