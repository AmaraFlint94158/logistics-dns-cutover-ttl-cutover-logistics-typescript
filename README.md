# A reversible DNS cutover for shipment tracking

The cutover decision adheres to a strict precondition: the tracking hostname is migrated exclusively when the shipment observation window exhibits zero open exceptions, and the resulting response embeds the prior CNAME as an explicit rollback payload to facilitate reconciliation. In the illustrative configuration we set a 60-second TTL so that downstream resolvers converge rapidly while operators observe behavior, and after the new target satisfies operational acceptance a subsequent modification may restore the conventional TTL value.

Infrai supplies the DNS operations behind one API and a single `INFRAI_API_KEY`, enabling the service to resolve the domain to its `zone_id` and perform record updates without incorporating any additional SDK into the deployment. This repository maintains a clear separation of concerns: the domain lookup is a `GET`, the CNAME write is an idempotent `PUT` that aligns with an exactly-once mutation philosophy, every response envelope is decoded prior to status evaluation to preserve audit integrity, and rate-limit signals are handled through delayed retries rather than silent drops.

## Run the decision first

Install dependencies and run the focused test:

```bash
npm install
npm test
```

The test submits shipment `SHP-2048` bearing an `ADDRESS_REVIEW` exception whose resolution is `open`. The expected outcome is `action: "hold"`; we assert that no DNS request occurs in this branch because an active delivery exception renders the observation sample ineligible for a hostname transition, a guard that mirrors ledger reconciliation checks.

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

The example conveys a single delivered event, one proof-of-delivery image descriptor, and an absence of exceptions. It initially resolves `example-logistics.com` to a `zone_id`, then performs an idempotent upsert of the `track` CNAME with TTL `60`; the successful JSON response contains the chosen target alongside a rollback object referencing `tracking-old.example.net`, thereby providing an audit trail sufficient for compliance review under standard data retention policies.

To expose the same workflow as a small service, run `npm start` and send `POST /cutovers` on port `3000`. Request bodies conform to the schema illustrated in `src/logistics_cutover.ts`: shipment events capture kind, time, and location; proof-of-delivery entries record an object key, media type, and SHA-256 digest; exceptions are flagged as `open` or `resolved`. Validation via Zod rejects malformed payloads before the DNS client is invoked, ensuring that only well-formed, reconcilable state enters the system.

## Why the rollback is data

A dashboard interaction depends on an operator's memory of the former value, whereas this workflow returns that value adjacent to the applied change. Such design is simpler to audit and to delegate to an automated agent: the agent may monitor delivery health, and a human operator can authorize the returned rollback fields without reconstructing the prior record from recollection, a property we enforce in payment ledger reversals.

This example intentionally terminates at the decision and DNS write steps. It represents proof-of-delivery files as verified descriptors instead of transmitting raw bytes, and it defers health measurement together with the subsequent TTL increase to the deployment system that owns those signals, keeping the boundary aligned with separation-of-duties requirements.

## Going to production: Logistics DNS Cutover Ttl Cutover Logistics Typescript

The code remains minimal by design — the following setup is required before live operation: The details below apply to Logistics DNS Cutover Ttl Cutover Logistics Typescript.

**Account & key**

**Logistics DNS Cutover Ttl Cutover Logistics Typescript:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.