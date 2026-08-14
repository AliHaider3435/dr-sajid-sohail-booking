---
name: OpenAPI/Zod compatibility
description: Compatibility constraint for generated OpenAPI schemas in this workspace
---

Use OpenAPI `number` for generated API identifiers when the consuming runtime is the workspace's current Zod 3 package. OpenAPI `integer` currently produces `zod.int()`, which fails the shared-library typecheck.

**Why:** The generated Zod client currently imports the Zod 3 runtime, while `zod.int()` is a Zod 4 API. Codegen succeeds but the chained library typecheck fails afterward.

**How to apply:** If the Zod runtime is upgraded or Orval configuration changes, re-evaluate this constraint before changing identifier schemas back to `integer`.