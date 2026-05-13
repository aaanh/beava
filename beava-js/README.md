# beava-js

[Turborepo](https://turbo.build/repo) monorepo for the official Beava TypeScript packages: **`@beava/node`** (server-side HTTP client) and **`@beava/client`** (browser entry that re-exports the same fetch-based API).

## Layout

| Path | Package | Role |
|------|---------|------|
| `packages/beava-node` | `@beava/node` | `createBeavaClient`, Zod wire schemas, Vitest unit + optional HTTP integration tests |
| `packages/beava-client` | `@beava/client` | Re-exports `@beava/node` for app bundles that want a browser-scoped package name |

Workspace members are defined in **`pnpm-workspace.yaml`** (currently `packages/beava-node`; add `packages/beava-client` when that package lands). Library packages extend **`tsconfig.node-library.json`** at this directory root (no separate TypeScript config package).

## Prerequisites

- **Node** `>=18` (see root **`package.json`** `engines`)
- **pnpm** `9.x` via [Corepack](https://nodejs.org/api/corepack.html): `corepack enable pnpm`

## Commands

From **`beava-js/`**:

```sh
pnpm install
pnpm run build          # tsc emit for publishable packages
pnpm run lint           # eslint across workspace
pnpm run check-types    # tsc --noEmit
pnpm run test           # Vitest (see below)
```

Scoped examples:

```sh
pnpm exec turbo run build test --filter=@beava/node
pnpm exec turbo run lint check-types --filter=@beava/client
```

## Tests

**`@beava/node`** uses [Vitest](https://vitest.dev/). Default **`pnpm run test`** runs **unit tests** only (mocked `fetch`).

**HTTP integration tests** (real `beava` subprocess, same idea as `python/tests/test_transport_http.py`) run when:

1. The **`beava`** binary exists at **`target/debug/beava`** (repo root: run **`cargo build --bin beava`** from the Beava repo root), and  
2. You set **`BEAVA_INTEGRATION=1`**. Optionally set **`BEAVA_REPO_ROOT`** to the Beava git root if discovery fails.

```sh
# from beava-js/
BEAVA_INTEGRATION=1 BEAVA_REPO_ROOT=/path/to/beava pnpm exec turbo run test --filter=@beava/node
```

CI sets these when running the **`beava-js`** job in **`.github/workflows/ci.yml`**.

## Repo checks

From the **Beava repo root**, **`bash .github/scripts/check.sh`** can run Rust, Python, and this tree together. **`bash .github/scripts/check.sh --js`** runs **`pnpm install`** and **`turbo run lint check-types test`** under **`beava-js/`** only. If **`target/debug/beava`** exists (from **`cargo build --bin beava`**), **`BEAVA_INTEGRATION=1`** is set so all Vitest tests run; otherwise three HTTP integration tests are skipped and the log notes why.

## npm publish

1. Bump **`version`** in **`packages/beava-node/package.json`** and **`packages/beava-client/package.json`**, and set **`@beava/client`** `dependencies["@beava/node"]` to **`workspace:^<newVersion>`** (same major/minor/patch as **`@beava/node`**). **`pnpm publish`** rewrites that to a normal **`^`** range on the tarball.
2. From **`beava-js/`**: **`pnpm install`**, **`pnpm run build`**, **`pnpm run test`** (with integration if you use **`BEAVA_INTEGRATION=1`**).
3. **`pnpm publish --filter @beava/node --access public`** (uses **`prepack`** to run **`tsc`**; add **`--dry-run`** or **`pnpm pack --filter @beava/node`** to inspect the tarball).
4. After **`@beava/node`** is on the registry, **`pnpm publish --filter @beava/client --access public`**.

Use **`npm whoami`** / **`npm login`** (or **`pnpm config set //registry.npmjs.org/:_authToken`**). Scoped **`@beava/*`** packages need **`publishConfig.access`** (already **`public`**).

## Links

- [Turborepo tasks and filters](https://turbo.build/repo/docs/crafting-your-repository/running-tasks)
- Beava repo: [github.com/beava-dev/beava](https://github.com/beava-dev/beava)
