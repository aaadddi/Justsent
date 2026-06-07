import { useState, useCallback } from "react";
import { type ShareListItem } from "../lib/backend";
import { shareService } from "../services/shareService";

export function useShares(
  backendOk: boolean | null,
  setTunnelActive: (active: boolean) => void
) {
  const [shares, setShares] = useState<ShareListItem[]>([]);
  const [sharesLoading, setSharesLoading] = useState(false);

  const loadShares = useCallback(async () => {
    if (backendOk !== true) return;
    setSharesLoading(true);
    try {
      const res = await shareService.list();
      setShares(res.shares);
      setTunnelActive(res.tunnelActive);
    } catch {
      setShares([]);
    } finally {
      setSharesLoading(false);
    }
  }, [backendOk, setTunnelActive]);

  return {
    shares,
    sharesLoading,
    loadShares,
    setShares,
  };
}
