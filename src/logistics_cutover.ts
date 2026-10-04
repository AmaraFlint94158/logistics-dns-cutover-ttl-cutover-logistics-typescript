import { createServer, type ServerResponse } from "node:http";
import { pathToFileURL } from "node:url";
import { ZodError } from "zod";
import { cutoverRequestSchema, planCutover, type CutoverRequest } from "./cutover_planner.js";
import { InfraiDnsClient, InfraiError } from "./infrai_dns.js";

function writeJson(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(value));
}

export async function executeCutover(input: CutoverRequest, client: InfraiDnsClient) {
  const decision = planCutover(input);
  if (decision.action === "hold") return { decision };

  const zoneId = await client.getZoneId(input.domain);
  const change = await client.upsertCname({
    zone_id: zoneId,
    name: input.hostname,
    content: decision.target,
    ttl: decision.ttl,
    idempotencyKey: `shipment-${decision.shipmentId}-${decision.target}`
  });

  return {
    decision,
    change,
    rollback: {
      zone_id: zoneId,
      record_type: "CNAME" as const,
      name: input.hostname,
      content: decision.rollbackTarget,
      ttl: decision.ttl
    }
  };
}

const example: CutoverRequest = {
  domain: "example-logistics.com",
  hostname: "track",
  currentTarget: "tracking-old.example.net",
  nextTarget: "tracking-new.example.net",
  shortTtl: 60,
  shipment: {
    shipmentId: "SHP-2048",
    events: [{ kind: "delivered", occurredAt: "2026-09-30T08:00:00.000Z", location: "Shanghai" }],
    proofOfDelivery: [{
      objectKey: "pod/SHP-2048/signature.png",
      contentType: "image/png",
      sha256: "a".repeat(64)
    }],
    exceptions: []
  }
};

async function main(): Promise<void> {
  const apiKey = process.env.INFRAI_API_KEY;
  if (!apiKey) throw new Error("Set INFRAI_API_KEY before running the service");
  const client = new InfraiDnsClient(apiKey);

  if (process.argv.includes("--example")) {
    console.log(JSON.stringify(await executeCutover(example, client), null, 2));
    return;
  }

  const port = Number(process.env.PORT ?? 3000);
  createServer(async (request, response) => {
    if (request.method !== "POST" || request.url !== "/cutovers") {
      writeJson(response, 404, { error: "route_not_found" });
      return;
    }

    try {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      const input = cutoverRequestSchema.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      const result = await executeCutover(input, client);
      writeJson(response, result.decision.action === "hold" ? 409 : 200, result);
    } catch (error) {
      if (error instanceof ZodError || error instanceof SyntaxError) {
        writeJson(response, 400, { error: "invalid_request" });
      } else if (error instanceof InfraiError) {
        writeJson(response, error.status >= 400 && error.status < 500 ? error.status : 502, {
          error: error.code
        });
      } else {
        writeJson(response, 502, { error: "upstream_request_failed" });
      }
    }
  }).listen(port, () => console.log(`Logistics cutover service listening on http://localhost:${port}`));
}

const entryPath = process.argv[1];
if (entryPath && import.meta.url === pathToFileURL(entryPath).href) {
  void main();
}
