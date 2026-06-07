import { createShare, listShares, deleteShare, clearAllSharesHistory } from "../lib/backend";

export const shareService = {
  create: createShare,
  list: listShares,
  delete: deleteShare,
  clearHistory: clearAllSharesHistory,
};
