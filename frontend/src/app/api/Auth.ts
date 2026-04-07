/**
 * MOCK ONLY — do not import this file outside of mockDataService.ts.
 *
 * Contains mock implementations of auth operations (login, createUser).
 * The real implementations live in httpDataService.ts and call the FastAPI backend.
 */
import type { User } from "../Types/User";

export interface LoginResponse {
  token: string;
  user: User;
}

export interface CreateUserResponse {
  user: User;
  token?: string;
}

/**
 * Log in API call is handled here, mock data for now.
 * Password is just password123
 * Please insert actual api call for backend here.
 */
export async function login(
  email: string,
  password: string
): Promise<LoginResponse> {
  // TODO: replace this whole block with a real network call when backend is ready
  await new Promise((resolve) => setTimeout(resolve, 500)); // fake network delay

  if (!email || !password) {
    throw new Error("Email and password are required.");
  }

  if (password !== "password123") {
    throw new Error("Invalid email or password.");
  }

  return {
    token: "mock-jwt-token-123",
    user: {
      user_id: "user-1",
      email,
      username: email.split("@")[0],
      first_name: "Demo",
      last_name: "User",
      email_verified: false,
    },
  };
  /*
  // Real version should look like something like this:
  const res = await fetch("/api/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const msg = body?.message || "Login failed.";
    throw new Error(msg);
  }

  return (await res.json()) as LoginResponse;
  */
}

export async function createUser(
  email: string,
  username: string,
  first_name: string,
  last_name: string,
  password: string
): Promise<CreateUserResponse> {
  // Simulate backend latency for now so UI can exercise loading/error states.
  await new Promise((resolve) => setTimeout(resolve, 500));

  if (!email || !username || !first_name || !last_name || !password) {
    throw new Error("All user fields are required.");
  }

  return {
    user: {
      user_id: `user-${Date.now()}`,
      email,
      username,
      first_name,
      last_name,
      email_verified: false,
    },
  };
}
