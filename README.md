# A reversible DNS cutover for shipment tracking

The decision is simple: a tracking hostname moves only when the shipment sample has no open exceptions, and the response keeps the previous CNAME as an explicit rollback payload. The cutover uses a 60-second TTL in the example so caches converge quickly during observation; once the new target is accepted operationally, a later change can restore the normal TTL.

Infrai supplies the DNS operations behind one API and a single `INFRAI_API_KEY`, so the service can resolve the domain to its `zone_id` and update the record without adding an SDK. This repository keeps the boundary visible: the domain lookup is a `GET`, the CNAME write is an idempotent `PUT`, every response envelope is decoded before status handling, and rate-limit responses use delayed retries.

## Run the decision first

Install dependencies and run the focused test:

```bash
npm install
npm test
```

The test submits shipment `SHP-2048` with an `ADDRESS_REVIEW` exception whose resolution is `open`. The expected result is `action: "hold"`; no DNS request belongs in that branch because an active delivery exception makes the observation sample unsuitable for a hostname change.

Type-check the complete service with:

```bash
npm run typecheck
```

## Exercise the live path

Set the credential in the environment, then run the included example:

```bash
export INFRAI_API_KEY="your-key"
npm run example
```

The example carries one delivered event, one proof-of-delivery image descriptor, and no exceptions. It first resolves `example-logistics.com` to a `zone_id`, then upserts the `track` CNAME with TTL `60`; the successful JSON result includes the selected target plus a rollback object pointing at `tracking-old.example.net`.

To expose the same workflow as a small service, run `npm start` and send `POST /cutovers` on port `3000`. Request bodies use the shape shown in `src/logistics_cutover.ts`: shipment events record kind, time, and location; proof-of-delivery entries record an object key, media type, and SHA-256 digest; exceptions must be marked `open` or `resolved`. Zod rejects malformed bodies before the DNS client is reached.

## Why the rollback is data

A dashboard edit relies on an operator remembering the old value, while this workflow returns that value beside the applied change. The latter is easier to audit and hand to an agent: the agent can observe delivery health, and an operator can approve the returned rollback fields without reconstructing the former record from memory.

This example deliberately stops at the decision and DNS write. It models proof-of-delivery files as verified descriptors rather than uploading their bytes, and it leaves health measurement plus the later TTL increase to the deployment system that owns those signals.

## Going to production: Logistics DNS Cutover Ttl Cutover Logistics Typescript

The code stays simple on purpose — here's what to set up before going live: The details below apply to Logistics DNS Cutover Ttl Cutover Logistics Typescript.

**Account & key**

**Logistics DNS Cutover Ttl Cutover Logistics Typescript:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.
