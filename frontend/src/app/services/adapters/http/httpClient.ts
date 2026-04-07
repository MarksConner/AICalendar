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
type QueryValue = string | number | boolean | null | undefined;

type RequestJsonOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  query?: Record<string, QueryValue>;
};

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() ?? "";
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

function getAuthHeader() {
  if (typeof window === "undefined") {
    return null;
  }

  // Include the saved token on every API request, if present.
  const token = window.localStorage.getItem("authToken");
  if (!token) {
    return null;
  }

  return `Bearer ${token}`;
}

export async function requestJson<T>(
  path: string,
  options: RequestJsonOptions = {}
): Promise<T> {
  const { body, headers, query, ...init } = options;
  const requestHeaders = new Headers(headers);
  const authHeader = getAuthHeader();

  // If a token exists and caller did not pass one, inject Authorization automatically.
  if (authHeader && !requestHeaders.has("Authorization")) {
    requestHeaders.set("Authorization", authHeader);
  }

  if (body !== undefined && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  const response = await fetch(buildRequestUrl(path, query), {
    ...init,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

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
