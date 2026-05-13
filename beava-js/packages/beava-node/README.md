# @beava/node

TypeScript HTTP client for the [Beava](https://beava.dev) feature server data plane (`POST /ping`, `/register`, `/push`, `/get`, `/batch_get`, `/reset`). Uses `fetch` only (Node 18+, Bun, Deno with npm compatibility).

```ts
import { createBeavaClient } from "@beava/node";

const client = createBeavaClient({ baseUrl: "http://127.0.0.1:8080" });
await client.ping();
```

See the [beava-js README](https://github.com/beava-dev/beava/tree/main/beava-js) for tests and integration.

## License

Apache-2.0
