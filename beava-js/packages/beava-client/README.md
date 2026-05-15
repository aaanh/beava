# @beava/client

Browser-oriented package name for the same Beava HTTP client as [`@beava/node`](https://www.npmjs.com/package/@beava/node) (global `fetch`, no Node-only APIs in the client path). Depends on `@beava/node`.

```ts
import { createBeavaClient } from "@beava/client";

const client = createBeavaClient({ baseUrl: "https://api.example.com" });
await client.ping();
```

## License

Apache-2.0
