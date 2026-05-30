# @beava/node

TypeScript HTTP client for the [Beava](https://beava.dev) feature server data plane. It maps directly to the JSON routes exposed by a running `beava` server: `POST /ping`, `/register`, `/push`, `/get`, `/batch_get`, and `/reset`.

The package is ESM-only, typed, and uses standard `fetch`. It works in Node.js 18.18+ and other runtimes with npm compatibility and global `fetch`.

## Install

```sh
npm install @beava/node
# or: pnpm add @beava/node
```

Start a local Beava server before running client code:

```sh
beava
# default HTTP URL: http://127.0.0.1:8080
```

## Quickstart

```ts
import { BeavaError, createBeavaClient } from "@beava/node";

const beava = createBeavaClient({
  baseUrl: "http://127.0.0.1:8080",
  timeoutSeconds: 10,
});

await beava.ping();

await beava.register({
  nodes: [
    {
      kind: "event",
      name: "Purchase",
      schema: {
        fields: {
          user_id: "str",
          amount: "f64",
        },
        optional_fields: [],
      },
      dedupe_key: null,
      dedupe_window_ms: null,
      keep_events_for_ms: null,
    },
  ],
});

await beava.push({
  event: "Purchase",
  data: {
    user_id: "alice",
    amount: 42.5,
  },
});
```

Read from a feature table that your deployed Beava pipeline has registered:

```ts
try {
  const row = await beava.get({
    table: "UserSpend",
    key: "alice",
    features: ["total_spend"],
  });
  console.log(row);
} catch (error) {
  if (error instanceof BeavaError) {
    console.error(error.status, error.code, error.message);
  }
}
```

`register` accepts the same wire descriptor JSON used by `POST /register`. Most applications generate or copy that payload from the Beava pipeline definition they are deploying.

## API

```ts
const beava = createBeavaClient({
  baseUrl: "http://127.0.0.1:8080",
  timeoutSeconds: 30,
  headers: { Authorization: "Bearer ..." },
});
```

| Method                                | Wire route        | Notes                                                 |
| ------------------------------------- | ----------------- | ----------------------------------------------------- |
| `ping()`                              | `POST /ping`      | Returns `{ pong: true, registry_version }`.           |
| `register({ nodes, force, dry_run })` | `POST /register`  | Registers event and table descriptors.                |
| `push({ event, data })`               | `POST /push`      | Sends one event payload.                              |
| `get({ table, key, features })`       | `POST /get`       | Reads one feature row. `features` is optional.        |
| `batchGet({ requests })`              | `POST /batch_get` | Reads many feature rows and returns `results`.        |
| `reset()`                             | `POST /reset`     | Clears state when the server is running in test mode. |

Every method accepts an optional `AbortSignal` as its final argument:

```ts
const controller = new AbortController();
await beava.get({ table: "UserSpend", key: "alice" }, controller.signal);
```

## Errors

Server error envelopes become `BeavaError`:

```ts
try {
  await beava.register({ nodes: [] });
} catch (error) {
  if (error instanceof BeavaError) {
    console.log(error.status); // HTTP status
    console.log(error.code); // Beava wire error code
    console.log(error.path); // wire path, when present
    console.log(error.errors); // structured details, when present
  }
}
```

Malformed success responses throw `BeavaResponseValidationError`. This usually means the client and server versions disagree about the wire shape.

## Browser Apps

Use [`@beava/client`](https://www.npmjs.com/package/@beava/client) in browser bundles if you prefer a browser-scoped package name. It re-exports this same fetch-based API.

## Development

The source lives in the Beava monorepo under `beava-js/packages/beava-node`.

```sh
cd beava-js
pnpm install
pnpm exec turbo run lint check-types test --filter=@beava/node
```

See the [beava-js README](https://github.com/beava-dev/beava/tree/main/beava-js) for workspace commands, integration tests, and npm publish steps.

## License

Apache-2.0
