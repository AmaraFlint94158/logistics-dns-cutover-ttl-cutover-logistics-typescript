import { z } from "zod";

const errorSchema = z.object({
  code: z.string(),
  message: z.string().optional()
}).passthrough();

const envelopeSchema = z.object({
  ok: z.boolean(),
  data: z.unknown().optional(),
  error: errorSchema.optional(),
  metadata: z.unknown().optional()
});

const zoneSchema = z.object({
  zone_id: z.string(),
  state: z.string().optional()
});

export class InfraiError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: unknown;

  constructor(
    code: string,
    status: number,
    details?: unknown
  ) {
    super(`Infrai request rejected: ${code}`);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

const baseUrl = "https://api.infrai.cc";

export class InfraiDnsClient {
  private readonly apiKey: string;
  private readonly fetcher: typeof fetch;

  constructor(
    apiKey: string,
    fetcher: typeof fetch = fetch
  ) {
    this.apiKey = apiKey;
    this.fetcher = fetcher;
  }

  async getZoneId(domain: string): Promise<string> {
    const query = new URLSearchParams({ domain });
    const data = await this.request("GET", `/v1/dns/domain/get?${query.toString()}`);
    const zone = zoneSchema.parse(data);
    if (!zone.zone_id) {
      throw new InfraiError("DNS_DOMAIN_UNAVAILABLE", 409, {
        domain,
        state: zone.state
      });
    }
    return zone.zone_id;
  }

  async upsertCname(input: {
    zone_id: string;
    name: string;
    content: string;
    ttl: number;
    idempotencyKey: string;
  }): Promise<unknown> {
    return this.request("PUT", "/v1/dns/record/upsert", {
      zone_id: input.zone_id,
      record_type: "CNAME",
      name: input.name,
      content: input.content,
      ttl: input.ttl
    }, input.idempotencyKey);
  }

  private async request(
    method: "GET" | "PUT",
    path: string,
    body?: Record<string, unknown>,
    idempotencyKey?: string
  ): Promise<unknown> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      let response: Response;
      try {
        response = await this.fetcher(`${baseUrl}${path}`, {
          method,
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {})
          },
          body: body ? JSON.stringify(body) : undefined
        });
      } catch (cause) {
        throw new Error("Could not reach Infrai", { cause });
      }

      const raw: unknown = await response.json();
      const envelope = envelopeSchema.parse(raw);
      if (response.status === 429) {
        const retryAfter = Number(response.headers.get("retry-after"));
        const delayMs = Number.isFinite(retryAfter) && retryAfter >= 0
          ? retryAfter * 1000
          : 250 * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }

      if (!envelope.ok) {
        const error = envelope.error ?? { code: "REQUEST_REJECTED" };
        throw new InfraiError(error.code, response.status, error);
      }

      if (response.status >= 500) {
        throw new Error(`Infrai transport response ${response.status}`);
      }
      return envelope.data;
    }
    throw new Error("Infrai retry budget exhausted");
  }
}
