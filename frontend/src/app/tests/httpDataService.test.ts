import { describe, it, expect, vi } from "vitest";
import * as httpClient from "../services/adapters/http/httpClient";
import { getPrimaryCalendarId } from "../services/adapters/http/httpDataService";

describe("getPrimaryCalendarId", () => {
  it("returns the calendar id from the API response", async () => {
    vi.spyOn(httpClient, "requestJson").mockResolvedValue([
      { calendar_id: "abc123" }
    ]);

    const result = await getPrimaryCalendarId();

    expect(result).toBe("abc123");
    expect(httpClient.requestJson).toHaveBeenCalledWith("/calendar");
  });
});
