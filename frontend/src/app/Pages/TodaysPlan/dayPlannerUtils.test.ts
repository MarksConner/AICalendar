import { describe, it, expect } from "vitest";
import { parseTimeToMinutes } from "./dayPlannerUtils";

describe("parseTimeToMinutes", () => {
  it("parses valid 24h times and rejects invalid inputs", () => {
    expect(parseTimeToMinutes("09:30")).toBe(570);
    expect(parseTimeToMinutes("0:00")).toBe(0);
    expect(parseTimeToMinutes("23:59")).toBe(1439);

    expect(parseTimeToMinutes("24:00")).toBeNull();
    expect(parseTimeToMinutes("9:7")).toBeNull();
    expect(parseTimeToMinutes("9:70")).toBeNull();
    expect(parseTimeToMinutes("abc")).toBeNull();
  });
});
