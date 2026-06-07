import { type TransferStats } from "../lib/backend";

export type SelectedFile = {
  name: string;
  size?: number;
  path?: string;
};

export type StatefulFile = {
  id: string;
  name: string;
  size?: number;
  path?: string;
  isSharing: boolean;
  shareLink: string | null;
  localShareLink: string | null;
  shareInternet: boolean;
  shareNearby: boolean;
  shareError: string | null;
  shareCreating: boolean;
  isActionsOpen: boolean;
  isDownloading?: boolean;
  bytesWritten?: number;
  speed?: number;
  isCompleted?: boolean;
  activeDownloads?: TransferStats[];
  passwordProtected: boolean;
  passwordValue: string;
  noteValue: string;
};
