export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name?: string;
  };
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
      id: "user-1",
      email,
      name: "Demo User",
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