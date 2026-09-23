---
name: Database SSL modes
description: Environment-specific PostgreSQL SSL behavior for this workspace.
---

Development PostgreSQL does not support SSL, while production connections should use explicit certificate verification.

**Why:** Forcing `sslmode=verify-full` in every environment broke local database queries even though it was appropriate for the published database.

**How to apply:** Keep development connections on their provisioned mode and enforce `sslmode=verify-full` only when the API runs with `NODE_ENV=production`.