import { z } from "zod";

export const cutoverRequestSchema = z.object({
  domain: z.string().min(1),
  hostname: z.string().min(1),
  currentTarget: z.string().min(1),
  nextTarget: z.string().min(1),
  shortTtl: z.number().int().min(30).max(300),
  shipment: z.object({
    shipmentId: z.string().min(1),
    events: z.array(z.object({
      kind: z.enum(["picked_up", "in_transit", "out_for_delivery", "delivered", "exception"]),
      occurredAt: z.string().datetime(),
      location: z.string().min(1)
    })).min(1),
    proofOfDelivery: z.array(z.object({
      objectKey: z.string().min(1),
      contentType: z.string().min(1),
      sha256: z.string().regex(/^[a-f0-9]{64}$/)
    })),
    exceptions: z.array(z.object({
      code: z.string().min(1),
      resolution: z.enum(["open", "resolved"])
    }))
  })
});

export type CutoverRequest = z.infer<typeof cutoverRequestSchema>;

export type CutoverDecision =
  | { action: "hold"; reason: string; shipmentId: string }
  | { action: "cutover"; shipmentId: string; target: string; rollbackTarget: string; ttl: number };

export function planCutover(input: CutoverRequest): CutoverDecision {
  const openException = input.shipment.exceptions.find((item) => item.resolution === "open");
  if (openException) {
    return {
      action: "hold",
      reason: `Shipment exception ${openException.code} must be resolved before DNS changes`,
      shipmentId: input.shipment.shipmentId
    };
  }

  return {
    action: "cutover",
    shipmentId: input.shipment.shipmentId,
    target: input.nextTarget,
    rollbackTarget: input.currentTarget,
    ttl: input.shortTtl
  };
}
