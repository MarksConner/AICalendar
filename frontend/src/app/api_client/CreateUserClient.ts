/* Handles the API calls when creating a new User
Written by: Luis Perdomo 
FRs: 1 */
const BASE_API_URL = import.meta.env.VITE_BASE_API_URL;

export interface CreateUserPayload {
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  password: string;
}

// Define the request options type, including method, url, headers, body, etc.
// method: "GET" | "POST" | "PUT" | "DELETE" those are the common api methods
// url: the endpoint url, like "/users"
// query: optional query parameters as key-value pairs
// headers: optional headers as key-value pairs
// body: optional request body, typically for POST/PUT requests

type RequestOptions = {
  method: "GET" | "POST" | "PUT" | "DELETE";
  url: string; // like "/users"
  query?: Record<string, string>;
  headers?: Record<string, string>;
  body?: unknown;
};

// CreateUserClient class to handle user creation API calls
export default class CreateUserClient {
  base_url: string;

  constructor() {
    if (!BASE_API_URL) throw new Error("VITE_BASE_API_URL is not defined");
    this.base_url = `${BASE_API_URL}`;
  }

  async request(options: RequestOptions): Promise<Response> {
    let query = new URLSearchParams(options.query || {}).toString(); // convert query object to query string. URLSearchParams handles encoding, meaning special characters are converted to %XX format
    if (query !== "") query = "?" + query;

    try {
      return await fetch(this.base_url + options.url + query, {
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

  async createUser(payload: CreateUserPayload): Promise<Response> {
    return this.request({
      method: "POST",
      url: "/users",
      body: payload,
    });
  }
}