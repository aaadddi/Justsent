const defaultBackend = "http://127.0.0.1:8787";

export function getBackendBaseUrl(): string {
  return import.meta.env.VITE_BACKEND_URL ?? defaultBackend;
}

async function parseError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string };
    if (j.error) return j.error;
  } catch {
    /* ignore */
  }
  return res.statusText || `HTTP ${res.status}`;
}

export async function fetchBackendHealth(): Promise<{ status: string; tunnel_active: boolean }> {
  const base = getBackendBaseUrl().replace(/\/$/, "");
  const res = await fetch(`${base}/health`);
  if (!res.ok) {
    throw new Error(`backend returned ${res.status}`);
  }
  return res.json() as Promise<{ status: string; tunnel_active: boolean }>;
}

export type NewRecipient = { display_name: string; email?: string };

export type CreateShareRequest = {
  paths: string[];
  recipient_person_ids?: number[];
  new_recipients?: NewRecipient[];
  label?: string;
  expires_at?: string;
  password?: string;
  note?: string;
  isInternet?: boolean;
  isLAN?: boolean;
};

export type CreateShareResponse = {
  token: string;
  download_url: string;
  local_download_url: string;
  share_id: number;
  public_base_url: string;
  password?: string;
  note?: string;
};

type BackendCreateShareResponse = {
  token?: string;
  Token?: string;
  download_url?: string;
  PublicDownloadURL?: string;
  local_download_url?: string;
  LocalDownloadURL?: string;
  share_id?: number;
  ShareID?: number;
  public_base_url?: string;
  PublicBaseURL?: string;
  password?: string;
  Password?: string;
  note?: string;
  Note?: string;
};

export async function createShare(body: CreateShareRequest): Promise<CreateShareResponse> {
  const base = getBackendBaseUrl().replace(/\/$/, "");
  const res = await fetch(`${base}/v1/shares`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  const item = (await res.json()) as BackendCreateShareResponse;
  return {
    token: item.token ?? item.Token ?? "",
    download_url: item.download_url ?? item.PublicDownloadURL ?? "",
    local_download_url: item.local_download_url ?? item.LocalDownloadURL ?? "",
    share_id: item.share_id ?? item.ShareID ?? 0,
    public_base_url: item.public_base_url ?? item.PublicBaseURL ?? "",
    password: item.password ?? item.Password,
    note: item.note ?? item.Note,
  };
}

export type DownloadHistoryItem = {
  downloader_ip: string;
  downloaded_at: string;
};

export type ShareListItem = {
  id: number;
  token: string;
  created_at: string;
  label?: string | null;
  download_url: string;
  local_download_url: string;
  file_count: number;
  total_size: number;
  primary_name: string;
  recipient_summary?: string | null;
  password?: string;
  note?: string;
  file_paths: string[];
  downloads: number;
  is_active: boolean;
  expires_at?: string | null;
  is_internet: boolean;
  is_lan: boolean;
  download_history?: DownloadHistoryItem[];
};

type BackendShareItem = {
  id?: number;
  ID?: number;
  token?: string;
  Token?: string;
  created_at?: string;
  CreatedAt?: string;
  label?: string | null;
  Label?: string | null;
  download_url?: string;
  PublicDownloadURL?: string;
  local_download_url?: string;
  LocalDownloadURL?: string;
  file_count?: number;
  FileCount?: number;
  total_size?: number;
  TotalSize?: number;
  primary_name?: string;
  PrimaryName?: string;
  recipient_summary?: string | null;
  RecipientSummary?: string | null;
  password?: string;
  Password?: string;
  note?: string;
  Note?: string;
  file_paths?: string[];
  FilePaths?: string[];
  downloads?: number;
  Downloads?: number;
  is_active?: boolean;
  IsActive?: boolean;
  expires_at?: string | null;
  ExpiresAt?: string | null;
  is_internet?: boolean;
  IsInternet?: boolean;
  is_lan?: boolean;
  IsLAN?: boolean;
  download_history?: DownloadHistoryItem[];
  DownloadHistory?: DownloadHistoryItem[];
};

function mapShareItem(item: BackendShareItem): ShareListItem {
  return {
    id: item.id ?? item.ID ?? 0,
    token: item.token ?? item.Token ?? "",
    created_at: item.created_at ?? item.CreatedAt ?? "",
    label: item.label !== undefined ? item.label : (item.Label ?? null),
    download_url: item.download_url ?? item.PublicDownloadURL ?? "",
    local_download_url: item.local_download_url ?? item.LocalDownloadURL ?? "",
    file_count: item.file_count ?? item.FileCount ?? 0,
    total_size: item.total_size ?? item.TotalSize ?? 0,
    primary_name: item.primary_name ?? item.PrimaryName ?? "",
    recipient_summary: item.recipient_summary !== undefined ? item.recipient_summary : (item.RecipientSummary ?? null),
    password: item.password ?? item.Password,
    note: item.note ?? item.Note,
    file_paths: item.file_paths ?? item.FilePaths ?? [],
    downloads: item.downloads ?? item.Downloads ?? 0,
    is_active: item.is_active ?? item.IsActive ?? false,
    expires_at: item.expires_at !== undefined ? item.expires_at : (item.ExpiresAt ?? null),
    is_internet: item.is_internet ?? item.IsInternet ?? false,
    is_lan: item.is_lan ?? item.IsLAN ?? false,
    download_history: item.download_history ?? item.DownloadHistory ?? [],
  };
}

export async function listShares(): Promise<{ shares: ShareListItem[]; tunnelActive: boolean }> {
  const base = getBackendBaseUrl().replace(/\/$/, "");
  const res = await fetch(`${base}/v1/shares`);
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  const data = (await res.json()) as { shares?: BackendShareItem[]; tunnel_active?: boolean };
  const sharesList = data.shares || [];
  const mapped = sharesList.map(mapShareItem);
  return {
    shares: mapped,
    tunnelActive: data.tunnel_active ?? false,
  };
}

export async function deleteShare(token: string): Promise<void> {
  const base = getBackendBaseUrl().replace(/\/$/, "");
  const res = await fetch(`${base}/v1/shares?token=${token}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
}

export type TransferStats = {
  token: string;
  bytes_written: number;
  total_bytes: number;
  speed: number;
  is_active: boolean;
  session_id: string;
};

export type ActiveTransfersResponse = {
  [token: string]: TransferStats[];
};

export async function fetchTransfers(): Promise<ActiveTransfersResponse> {
  const base = getBackendBaseUrl().replace(/\/$/, "");
  const res = await fetch(`${base}/v1/transfers`);
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  return res.json() as Promise<ActiveTransfersResponse>;
}

export async function disconnectDownloader(token: string, ip: string): Promise<void> {
  const base = getBackendBaseUrl().replace(/\/$/, "");
  const res = await fetch(`${base}/v1/transfers?token=${token}&ip=${ip}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
}

export async function checkFiles(paths: string[]): Promise<{ exists: boolean; missing: string[] }> {
  const base = getBackendBaseUrl().replace(/\/$/, "");
  const res = await fetch(`${base}/v1/files/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paths }),
  });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  return res.json() as Promise<{ exists: boolean; missing: string[] }>;
}

export async function deleteShareHistory(token: string): Promise<void> {
  const base = getBackendBaseUrl().replace(/\/$/, "");
  const res = await fetch(`${base}/v1/shares?token=${token}&history=true`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
}

export async function clearAllSharesHistory(): Promise<void> {
  const base = getBackendBaseUrl().replace(/\/$/, "");
  const res = await fetch(`${base}/v1/shares?clear_all=true`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
}
