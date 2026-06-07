import { useState, useCallback } from "react";
import { fetchBackendHealth } from "../lib/backend";
import { usePolling } from "./usePolling";

export function useBackendHealth() {
  const [backendOk, setBackendOk] = useState<boolean | null>(null);
  const [tunnelActive, setTunnelActive] = useState<boolean>(false);

  const checkHealth = useCallback(async () => {
    try {
      const res = await fetchBackendHealth();
      setBackendOk(true);
      setTunnelActive(res.tunnel_active);
    } catch (err) {
      console.error("Failed to fetch health check status:", err);
      setBackendOk(false);
    }
  }, []);

  usePolling(checkHealth, 5000, true);

  return {
    backendOk,
    tunnelActive,
    setTunnelActive,
  };
}
