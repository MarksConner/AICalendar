import type { CreateEventFormData } from "../components/CreateEventDialog";
import { handleSessionTimeout } from "../services/auth/sessionTimeout";
import { tryRefreshAccessToken } from "../services/adapters/http/httpClient";
import EventClient from "../api_client/Event";

const BASE_API_URL = import.meta.env.VITE_BASE_API_URL;

type RequestOptions = {
  method: "GET" | "POST" | "PUT" | "DELETE";
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
};

export default class CalendarClient {
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

    async createCalendarAPI(calendar_name: string, date_start?: string, date_end?: string): Promise<Response> {
        return this.request({
            method: "POST",
            url: "/calendar/create",
            body: {user_id: localStorage.getItem("user_id"), calendar_name, date_start, date_end },
        });
    }

    async createCalendarICSAPI(calendarName: string, icsFile: File): Promise<Response> {
        const formData = new FormData();
        formData.append("calendarName", calendarName);
        formData.append("icsFile", icsFile);

        const doFetch = (accessToken = localStorage.getItem("access_token")) => fetch(this.base_url + "/calendar/import-ics", {
            method: "POST",
            headers: {
                ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            },
            body: formData,
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

    async getCalendarsAPI(): Promise<Response> {
        return this.request({
            method: "GET",
            url: "/calendar",
        });
    }

    async CreateEventAPI(eventData: CreateEventFormData): Promise<Response> {
        return this.request({
            method: "POST",
            url: "/events/create",
            body: {
            calendar_id: eventData.calendar_id,
            event_name: eventData.title,
            start_time: eventData.start_time,
            end_time: eventData.end_time || null,
            event_description: eventData.description || null,
            full_address: eventData.location || null,
            priority_rank: 0,
            },
        });
    }
    
    async getEventsAPI(date: string): Promise<Response> {
        return this.request({
            method: "GET",
            url: `/events?date=${date}`,
        });
    }
    
    async getAllEventsinAdayAPI(calendar_id: string, date: string): Promise<Response> {
        return this.request({
            method: "GET",
            url: `/events/calendar/${calendar_id}/day/${date}`,
        });
    }
// Takes a file object, calendar name, user id, and optional date range, and sends a POST request to the backend to import events from the ICS file into the specified calendar.   
    async ics_import({file, calendar_name, user_id,date_start, date_end,}: {file: File; calendar_name: string; user_id: string; date_start?: string | null;date_end?: string | null;
    }): Promise<Response> {
    const formData = new FormData();

    formData.append("file", file); // backend expects "file"
    formData.append("calendar_name", calendar_name); // backend expects "calendar_name"
    formData.append("user_id", user_id); // backend expects "user_id"

    if (date_start) {
        formData.append("date_start", date_start);
    }

    if (date_end) {
        formData.append("date_end", date_end);
    }

    const doFetch = (accessToken = localStorage.getItem("access_token")) => fetch(this.base_url + "/calendar/import-ics", {
        method: "POST",
        headers: {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: formData,
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
   
    async exportCalendarAPI(calendar_id: string): Promise<Response> {
        return this.request({
            method: "GET",
            url: `/calendar/export/${calendar_id}`,
        });
    }

    async publishCalendar(calendarId: string): Promise<Response> {
    return this.request({
        method: "GET",
        url: `/calendar/publish/${calendarId}`,
    });
    }

    async deleteCalendarAPI(calendar_id: string): Promise<Response> {
    return this.request({
        method: "DELETE",
        url: `/calendar/delete-calendar/${calendar_id}`,
    });
    }

}
