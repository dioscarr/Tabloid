# Brain CMS adoption

Brain Studio provides branch-isolated page content management. Published copy is stored by `appId/pageId` in the persistent Podman volume `tabloid-brain-content`; rebuilding an application or the Brain service does not erase revisions.

## Application requirements

Every application must:

1. Ship `src/content-adapter.js`.
2. Import `initializeContentAdapter` in its entry module.
3. Call it after rendering and after `mountSharedNav()` with the stable app ID from `public/app.contract.json`.

```js
import { initializeContentAdapter } from './content-adapter.js'

mountSharedNav()
initializeContentAdapter('my-app')
```

The adapter discovers visible leaf text in the rendered `#app`, gives each field a stable page-scoped key, applies the latest published revision, and exposes the inventory to the shared Brain Studio component. Pages remain functional if Brain is unavailable.

## Editorial lifecycle

1. Open Brain Studio from the shared app launcher.
2. Edit any discovered field or ask Brain to rewrite the current page.
3. Preview changes locally.
4. Save a draft.
5. Confirm **Approve & publish**.
6. Select an older published revision to roll back.

Drafts, published values, actor, message, and timestamps are recorded. Publishing and rollback require an explicit confirmation. Content is isolated per branch app and page.

## Production boundary

The current tailnet deployment trusts Tabloid application origins and identifies the operator as `tailnet-admin`. Before exposing applications outside the private tailnet, place the write endpoints behind the planned Google identity provider and enforce the Authorization application's CMS roles server-side.
