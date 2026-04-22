/**
 * Mock adapter — mirrors httpDataService.ts method-for-method using local data.
 * Active when VITE_DATA_SOURCE=mock (the default). No backend needed.
 *
 * Mock data is stored in localStorage so it persists across page reloads.
 * To reset it, run this in the browser console: localStorage.clear()
 *
 * When you add a new method to AppDataService in contracts.ts, you must add
 * a matching stub here — TypeScript will error if any method is missing.
 */
import { createUser as mockCreateUser, login as mockLogin } from "../../api/Auth";
import { fetchMonthEvents as mockFetchMonthEvents } from "../../api/Calendar";
import {
  createDayTimelineItem as mockCreateDayTimelineItem,
  deleteDayTimelineItem as mockDeleteDayTimelineItem,
  fetchDayTimeline as mockFetchDayTimeline,
  getDaySchedulingHints as mockGetDaySchedulingHints,
  updateDayTimelineItem as mockUpdateDayTimelineItem,
} from "../../api/Today";
import { getDayAiSuggestions as mockGetDayAiSuggestions } from "../../api/AiSuggestions";
import type {
  AppDataService,
  AddEventParticipantInput,
  EventParticipant,
  ParticipantsForEvent,
  TravelTimeResponse,
} from "../contracts";
import { startMicrophoneInput, stopMicrophoneInput } from "../tts/mic_parsing";

export const mockDataService: AppDataService = {
  login(email, password) {
    return mockLogin(email, password);
  },
  createUser(payload) {
    return mockCreateUser(
      payload.email,
      payload.username,
      payload.first_name,
      payload.last_name,
      payload.password
    );
  },
  fetchMonthEvents(year, monthIndex) {
    return mockFetchMonthEvents(year, monthIndex);
  },
  fetchDayTimeline(date) {
    return mockFetchDayTimeline(date);
  },
  getDaySchedulingHints(date, request) {
    return mockGetDaySchedulingHints(date, request);
  },
  createDayEvent(date, input) {
    return mockCreateDayTimelineItem(date, {
      name: input.name,
      start: input.start,
      end: input.end ?? input.start,
      description: input.description,
      priority: input.priority ?? 0,
      location: input.location ?? null,
      flexible: input.flexible ?? false,
      travel_time_min: input.travel_time_min ?? 0,
    });
  },
  updateDayEvent(date, eventId, updates) {
    return mockUpdateDayTimelineItem(date, eventId, updates);
  },
  deleteDayEvent(date, eventId) {
    return mockDeleteDayTimelineItem(date, eventId);
  },
  getDayAiSuggestions(date, items) {
    return mockGetDayAiSuggestions(date, items);
  },

  // Participants — stubs only; participant features require the real backend
  addEventParticipant(_eventId: string, input: AddEventParticipantInput): Promise<EventParticipant> {
    return Promise.resolve({
      participant_id: crypto.randomUUID(),
      event_id: _eventId,
      name: input.name,
      info: input.info ?? null,
      role: input.role ?? null,
    });
  },
  removeEventParticipant(_participantId: string): Promise<void> {
    return Promise.resolve();
  },
  getParticipantsForEvent(eventId: string): Promise<ParticipantsForEvent> {
    return Promise.resolve({ event_id: eventId, participants: [] });
  },
  getParticipantInfo(_participantId: string): Promise<EventParticipant> {
    return Promise.reject(new Error("Not available in mock mode"));
  },
  getEventsForParticipant(_participantName: string) {
    return Promise.resolve([]);
  },

  // Microphone — delegates to the real mic parsing module (works in mock mode)
  async startMicrophoneTranscription(): Promise<string | null> {
    return startMicrophoneInput();
  },
  stopMicrophoneTranscription(): void {
    stopMicrophoneInput();
  },

  // Travel time — returns a fixed mock result centered on Boston for local dev
  getTravelTime(_eventId: string, _fromLat: number, _fromLng: number): Promise<TravelTimeResponse> {
    return Promise.resolve({
      travel_time_min: 14,
      event_lat: 42.3467,
      event_lng: -71.0972,
    });
  },
};
