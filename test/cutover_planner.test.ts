import assert from "node:assert/strict";
import test from "node:test";
import { cutoverRequestSchema, planCutover } from "../src/cutover_planner.js";

test("holds the DNS cutover while a shipment exception is open", () => {
  const request = cutoverRequestSchema.parse({
    domain: "example-logistics.com",
    hostname: "track",
    currentTarget: "tracking-old.example.net",
    nextTarget: "tracking-new.example.net",
    shortTtl: 60,
    shipment: {
      shipmentId: "SHP-2048",
      events: [{ kind: "exception", occurredAt: "2026-09-30T08:00:00.000Z", location: "Shanghai" }],
      proofOfDelivery: [],
      exceptions: [{ code: "ADDRESS_REVIEW", resolution: "open" }]
    }
  });

  assert.deepEqual(planCutover(request), {
    action: "hold",
    reason: "Shipment exception ADDRESS_REVIEW must be resolved before DNS changes",
    shipmentId: "SHP-2048"
  });
});
