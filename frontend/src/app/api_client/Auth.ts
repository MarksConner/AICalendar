
const BASE_API_URL = import.meta.env.VITE_BASE_API_URL;
export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponseBody {
  access_token: string;
  refresh_token: string;
  user_id: string;
  token_type: string; 
}

type RequestOptions = {
  method: "GET" | "POST";
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
};

export default class LoginClient{
  base_url: string;

  constructor() {
    if (!BASE_API_URL) throw new Error("VITE_BASE_API_URL is not defined");
    this.base_url = `${BASE_API_URL}`; 
  }

  async request(options: RequestOptions): Promise<Response> {
    try {
      return await fetch(this.base_url + options.url, {
        method: options.method,
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
        body: options.body ? JSON.stringify(options.body) : null,
      });
    } catch (error: any) {
      return new Response(
        JSON.stringify({
          code: 500,
          message: "The server did not respond.",
          description: String(error),
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  async login(email: string, password: string): Promise<Response> {
    return this.request({
      method: "POST",
      url: "/users/login",
      body: { email, password },
    });
  }
  async sendVerificationEmail(email: string): Promise<Response> {
    return this.request({
      method: "POST",
      url: "/users/send_verification_email",
      body: { email },
    });
  }
  async SendRecoverPasswordEmail(email: string): Promise<Response> {
    return this.request({
      method: "POST",
      url: "/users/send_recover_password_email",
      body: { email },
    });
  }
  async updatePassword(email: string, token: string, newPassword: string): Promise<Response> {
    return this.request({
      method: "POST",
      url: "/users/update_password",
      body: { email, token, new_password: newPassword },
    });
  }
  async verifyEmail(email: string, token: string): Promise<Response> {
    return this.request({
      method: "POST",
      url: "/users/verify_email",
      body: { email, token },
    });
  }

  async getUserEmail(userId: string, authToken: string): Promise<Response> {
    return this.request({
      method: "GET",
      url: `/users/${userId}/email`,
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
  }
  async getUserName(userId: string, authToken: string): Promise<Response> {
    return this.request({
      method: "GET",
      url: `/users/${userId}/username`,
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
  }

  async refresh(refreshToken: string): Promise<Response> {
  return this.request({
    method: "POST",
    url: "/users/refresh",
    body: { refresh_token: refreshToken },
  });
  }
  
}

