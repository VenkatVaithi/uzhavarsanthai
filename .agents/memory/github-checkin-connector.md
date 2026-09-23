---
name: GitHub check-in connector behavior
description: Constraints encountered when checking the monorepo into GitHub through the Replit connector.
---

The GitHub connector can reject large Git tree writes and HTML payloads containing executable script markup with Cloudflare responses, even when normal API rate limits are healthy. Use small, serialized writes and verify the remote tree and file contents after check-in.

**Why:** The target repository was empty and the connector blocked the efficient Git data upload path, so a complete check-in required a fallback upload strategy.

**How to apply:** Prefer the Git data API for normal repositories, but if the connector blocks it, fall back to serialized Contents API writes and direct remote verification. Avoid weakening application behavior unless an equivalent entrypoint is validated locally. In particular, Vite static production builds require a real module script in source HTML; a connector-compatible body loader can leave production serving unbundled `/src` files and a blank page.