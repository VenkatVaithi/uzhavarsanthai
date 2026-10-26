---
name: Clerk abuse-protection testing
description: Scope of authentication abuse-protection coverage after the Clerk migration.
---

Test the application's handling of Clerk rate-limit decisions rather than restoring the old local password authentication or simulating Clerk's internal thresholds.

**Why:** The user explicitly chose Clerk-focused abuse-protection coverage in place of the obsolete local-authentication rate-limit tests after the authentication migration.

**How to apply:** Use a local upstream fixture for proxy response and request-isolation tests. Distinguish preservation of 429 responses, retry instructions, and subsequent recovery from proof of Clerk's actual account/IP thresholds or reset timers. Do not claim fixture-driven tests verify provider-owned enforcement.
