# @beava/client

Browser-oriented package name for the Beava TypeScript HTTP client. It re-exports the same fetch-based API as [`@beava/node`](https://www.npmjs.com/package/@beava/node), but lets front-end apps depend on a browser-scoped package name.

Use this package when your app talks to a Beava HTTP endpoint from a browser bundle. Use `@beava/node` for Node.js services and scripts.

## Install

```sh
npm install @beava/client
# or: pnpm add @beava/client
```

## Example

```ts
import { BeavaError, createBeavaClient } from "@beava/client";

const beava = createBeavaClient({
  baseUrl: "https://features.example.com",
  timeoutSeconds: 10,
});

await beava.push({
  event: "PageView",
  data: {
    user_id: "alice",
    path: "/pricing",
  },
});

try {
  const row = await beava.get({
    table: "UserActivity",
    key: "alice",
  });
  console.log(row);
} catch (error) {
  if (error instanceof BeavaError) {
    console.error(error.status, error.code, error.message);
  }
}
```

## API

`@beava/client` exports:

- `createBeavaClient`
- `BeavaError`
- `BeavaResponseValidationError`
- request and response types for `ping`, `register`, `push`, `get`, and `batchGet`
- Zod schemas for validating Beava wire payloads

The methods are the same as `@beava/node`:

| Method                                | Wire route        | Notes                          |
| ------------------------------------- | ----------------- | ------------------------------ |
| `ping()`                              | `POST /ping`      | Liveness and registry version. |
| `register({ nodes, force, dry_run })` | `POST /register`  | Registers descriptors.         |
| `push({ event, data })`               | `POST /push`      | Sends one event.               |
| `get({ table, key, features })`       | `POST /get`       | Reads one feature row.         |
| `batchGet({ requests })`              | `POST /batch_get` | Reads many feature rows.       |
| `reset()`                             | `POST /reset`     | Test-mode only state reset.    |

## Browser Notes

This package does not include auth, retries, or transport fallbacks. Pass any app-specific headers through `createBeavaClient({ headers })`, and keep Beava endpoints behind the same auth and CORS policy you use for the rest of your API.

```ts
const beava = createBeavaClient({
  baseUrl: "/api/beava",
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
```

## License

Apache-2.0
