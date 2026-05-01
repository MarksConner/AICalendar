/**
 * Low-level HTTP wrapper. Most developers won't need to touch this file.
 *
 * Handles automatically:
 *   - Base URL (set VITE_API_BASE_URL in .env.local, e.g. http://localhost:8000)
 *   - Auth token injection (reads from localStorage after login)
 *   - JSON serialization/deserialization
 *   - Error message extraction from the response body
 *
 * Use requestJson() in httpDataService.ts to make API calls.
 */
import { clearAuthStorage, handleSessionTimeout } from "../../auth/sessionTimeout";

type QueryValue = string | number | boolean | null | undefined;

type RequestJsonOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  query?: Record<string, QueryValue>;
};

const rawBaseUrl = import.meta.env.VITE_BASE_API_URL?.trim() ?? "";
const apiBaseUrl = rawBaseUrl.replace(/\/+$/, "");

function buildRequestUrl(path: string, query?: Record<string, QueryValue>) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const target = apiBaseUrl
    ? `${apiBaseUrl}${normalizedPath}`
    : normalizedPath;
  const url = new URL(target, window.location.origin);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) {
        continue;
      }
      url.searchParams.set(key, String(value));
    }
  }

  return apiBaseUrl ? url.toString() : `${url.pathname}${url.search}`;
}

function extractErrorMessage(payload: unknown, fallback: string) {
  if (
    payload &&
    typeof payload === "object" &&
    "message" in payload &&
    typeof payload.message === "string"
  ) {
    return payload.message;
  }
  return fallback;
}

function getStoredAccessToken() {
  if (typeof window === "undefined") return null;

  return (
    window.localStorage.getItem("access_token") ??
    window.localStorage.getItem("authToken")
  );
}

function getAuthHeader() {
  const token = getStoredAccessToken();
  if (!token) return null;
  return `Bearer ${token}`;
}


function getStoredRefreshToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("refresh_token");
}

let refreshInFlight: Promise<string | null> | null = null;

export async function tryRefreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = refreshAccessToken();
  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await fetch(buildRequestUrl("/users/refresh"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json().catch(() => null);
    const newAccessToken =
      payload?.access_token ?? payload?.token ?? null;

    if (!newAccessToken) {
      return null;
    }

    window.localStorage.setItem("access_token", newAccessToken);
    return newAccessToken;
  } catch {
    return null;
  }
}

export async function requestJson<T>(
  path: string,
  options: RequestJsonOptions = {}
): Promise<T> {
  const { body, headers, query, ...init } = options;
  const requestHeaders = new Headers(headers);
  const authHeader = getAuthHeader();

  if (authHeader && !requestHeaders.has("Authorization")) {
    requestHeaders.set("Authorization", authHeader);
  }

  if (body !== undefined && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  const doFetch = async (accessTokenOverride?: string) => {
    const currentHeaders = new Headers(requestHeaders);

    if (accessTokenOverride) {
      currentHeaders.set("Authorization", `Bearer ${accessTokenOverride}`);
    }

    return fetch(buildRequestUrl(path, query), {
      ...init,
      headers: currentHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  };

  let response = await doFetch();

  const isRefreshRequest = path === "/users/refresh";
  const isLoginRequest = path === "/users/login";

  if (response.status === 401 && !isRefreshRequest && !isLoginRequest) {
    const newAccessToken = await tryRefreshAccessToken();

    if (newAccessToken) {
      response = await doFetch(newAccessToken);
    } else {
      handleSessionTimeout();
      throw new Error("Session timed out");
    }
  }

  const contentType = response.headers.get("Content-Type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json().catch(() => undefined) : undefined;

  if (!response.ok) {
    throw new Error(
      extractErrorMessage(payload, `Request failed with status ${response.status}`)
    );
  }

  return payload as T;
}
