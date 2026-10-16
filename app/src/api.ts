import { env } from "../env";

let token: string | null = null;

export type ApiError = Error & { status?: number };

export type Sku = {
  id: number;
  title: string;
  price: number;
  thumbnail: string | null;
  quantity: number;
};

export type Selection = {
  id: number;
  sku_ids: number[];
  created_at: string;
};

type TokenResponse = { access_token: string; token_type: string };

export function setToken(value: string | null) {
  token = value;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(`${env.apiUrl}${path}`, { ...init, headers });
  } catch {
    throw Object.assign(new Error(`Can't reach the server at ${env.apiUrl}`), { status: 0 });
  }
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body?.detail?.message || body?.detail || body?.message || message;
    } catch {}
    throw Object.assign(new Error(message), { status: res.status });
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

export async function authenticate(mode: "login" | "register", email: string, password: string) {
  const { access_token } = await api<TokenResponse>(`/auth/${mode}`, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setToken(access_token);
}

export function listSkus() {
  return api<Sku[]>("/skus");
}

export function createSelection(skuIds: number[]) {
  return api<Selection>("/selections", {
    method: "POST",
    body: JSON.stringify({ sku_ids: skuIds }),
  });
}
