import { buildUserTimezoneAndTimeObject } from "../Pages/TodaysPlan/dayPlannerUtils";
import { handleSessionTimeout } from "../services/auth/sessionTimeout";
import { tryRefreshAccessToken } from "../services/adapters/http/httpClient";
const BASE_API_URL = import.meta.env.VITE_BASE_API_URL;

type RequestOptions = {
  method: "GET" | "POST";
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
};

export default class ChatClient {
  base_url: string;

  constructor() {
    if (!BASE_API_URL) throw new Error("VITE_BASE_API_URL is not defined");
    this.base_url = `${BASE_API_URL}`;
  }

  async request(options: RequestOptions): Promise<Response> {
    const doFetch = (accessToken = localStorage.getItem("access_token")) => fetch(this.base_url + options.url, {
      method: options.method,
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(options.headers || {}),
      },
      body: options.body ? JSON.stringify(options.body) : null,
    });

    let response = await doFetch();

    if (response.status === 401) {
      const newAccessToken = await tryRefreshAccessToken();
      if (newAccessToken) {
        response = await doFetch(newAccessToken);
      } else {
        handleSessionTimeout();
      }
    }

    return response;
  }

  async createChatAPI(content: string): Promise<Response> {
    return this.request({
      method: "POST",
      url: "/chats/first_message",
      body: { content },
    });
  }

  async getChatHistoryAPI(chat_id: string): Promise<Response> {
    return this.request({
      method: "GET",
      url: `/chats/get_all_messages_in_chat/${chat_id}`,
    });
  }

 async sendMessageAPI(
  chat_id: string,
  content: string,
  sender_is: boolean
): Promise<Response> {
  return this.request({
    method: "POST",
    url: "/messages/send_message",
    body: { chat_id, content, sender_is },
  });
}

  async askAI(message: string, calendar_id: string | null, chat_id: string | null, user_latitude?: number | null, user_longitude?: number | null): Promise<Response> {
    return this.request({
      method: "POST",
      url: "/chat",
      body: { message, calendar_id, chat_id, current_time: buildUserTimezoneAndTimeObject(), user_latitude, user_longitude },
    });
  }
}
