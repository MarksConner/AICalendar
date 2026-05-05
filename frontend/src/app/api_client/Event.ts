/* Handles API calls for Events on the Calendar 
Written by: Luis Perdomo */
const BASE_API_URL = import.meta.env.VITE_BASE_API_URL;

export interface AddEventPayload {
  event_name : string;
  start_time : string;
  end_time? : string;
  description? : string;
  priority? : number;
};

export interface BookEventPayload {
  name: string;
  email: string;
  notes?: string;
}


export type RequestOptions = {
  method: "GET" | "POST" | "PUT" | "DELETE";
  url: string;
  query?: Record<string, string>;
  headers?: Record<string, string>;
  body?: unknown;
};

export default class EventClient {
  base_url: string;
  constructor() {
    if (!BASE_API_URL) throw new Error("VITE_BASE_API_URL is not defined");
    this.base_url = `${BASE_API_URL}`;
  }
   async request(options: RequestOptions): Promise<Response> {
    let query = new URLSearchParams(options.query || {}).toString();
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
  async addEvent(payload: AddEventPayload): Promise<Response> {
    return this.request({
      method: "POST",
      url: "/events/create",
      body: payload,
    });
  }
  
  async setEventBookable(eventId: string): Promise<Response> {
    return this.request({
      method: "PUT",
      url: `/events/bookable/${eventId}`,
    });
  }

  async getBookableEvents(calendarId: string): Promise<Response> {
    return this.request({
      method: "GET",
      url: `/events/calendar/${calendarId}/bookable`,
    });
  }

  async bookEvent(eventId: string, payload: BookEventPayload): Promise<Response> {
    return this.request({
      method: "POST",
      url: `/events/book/${eventId}`,
      body: payload,
    });
  }
}