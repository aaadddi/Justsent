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

export async function fetchBackendHealth(): Promise<{ status: string }> {
  const base = getBackendBaseUrl().replace(/\/$/, "");
  const res = await fetch(`${base}/health`);
  if (!res.ok) {
    throw new Error(`backend returned ${res.status}`);
  }
  return res.json() as Promise<{ status: string }>;
}

export type NewRecipient = { display_name: string; email?: string };

export type CreateShareRequest = {
  paths: string[];
  recipient_person_ids?: number[];
  new_recipients?: NewRecipient[];
  label?: string;
  expires_at?: string;
};

export type CreateShareResponse = {
  token: string;
  download_url: string;
  share_id: number;
  public_base_url: string;
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
  return res.json() as Promise<CreateShareResponse>;
}

export type ShareListItem = {
  id: number;
  token: string;
  created_at: string;
  label?: string | null;
  download_url: string;
  file_count: number;
  total_size: number;
  primary_name: string;
  recipient_summary?: string | null;
};

export async function listShares(): Promise<ShareListItem[]> {
  const base = getBackendBaseUrl().replace(/\/$/, "");
  const res = await fetch(`${base}/v1/shares`);
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  const data = (await res.json()) as { shares: ShareListItem[] };
  return data.shares ?? [];
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
};

export type ActiveTransfersResponse = {
  [token: string]: TransferStats;
};

export async function fetchTransfers(): Promise<ActiveTransfersResponse> {
  const base = getBackendBaseUrl().replace(/\/$/, "");
  const res = await fetch(`${base}/v1/transfers`);
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  return res.json() as Promise<ActiveTransfersResponse>;
}
