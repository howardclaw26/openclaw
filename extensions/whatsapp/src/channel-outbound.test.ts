import { describe, expect, it } from "vitest";
import { whatsappChannelOutbound } from "./channel-outbound.js";

describe("whatsappChannelOutbound normalizePayload", () => {
  it("drops leading blank lines but preserves intentional indentation", () => {
    expect(
      whatsappChannelOutbound.normalizePayload?.({
        payload: { text: "\n \n    indented" },
      }),
    ).toEqual({
      text: "    indented",
    });
  });
});
