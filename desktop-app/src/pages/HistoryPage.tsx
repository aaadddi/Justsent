import HistoryView from "../components/HistoryView";
import { useTransferContext } from "../contexts/TransferContext";
import { usePolling } from "../hooks/usePolling";
import { AppTab } from "../types/app";

export default function HistoryPage() {
  const {
    shares,
    sharesLoading,
    handleReShareHistoryFiles,
    loadShares,
    setCurrentTab,
    backendOk,
  } = useTransferContext();

  usePolling(loadShares, 3000, backendOk === true);

  return (
    <HistoryView
      items={shares}
      loading={sharesLoading}
      onReShare={handleReShareHistoryFiles}
      onRefresh={loadShares}
      onGoToTransfers={() => setCurrentTab(AppTab.Transfers)}
    />
  );
}
