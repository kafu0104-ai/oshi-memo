# 本人限定のスマホ用テスト環境

- URL: https://oshi-memo-test.yuu0629.chatgpt.site
- Sites project: appgprj_6ab9eb5e23e481919ff36104c0eaff91
- Access: owner-only (Sites platform gate). Do not change audience to public.
- Deployment succeeded: appgdep_6ab9ec8c14dc819199d29b22e8121b9d
- Source checkout: `.sites-deploy` (ignored, separate Git repository)
- Source commit: c857b742d59daa84f4aa4d67dd40a977d1e0e449

## Authentication

Supabase Redirect URLs must include exactly:
`https://oshi-memo-test.yuu0629.chatgpt.site/auth/callback`

Callback registration confirmed in the user screenshot on 2026-09-28. Keep existing local callback URLs.
The frontend uses location.origin when starting LINE login. The LINE Developers
callback to Supabase does not change. A new origin needs first-time LINE login.
Login persistence remains enabled through Supabase client defaults.
Sites entry authentication has its own session lifetime managed by the platform;
no custom session lifetime has been configured or promised.

## Data

Local browser data does not automatically move to a new URL. Save from the existing
browser to personal cloud sync, then read from cloud on the new URL using the same
LINE account. Sync is manual. Do not overwrite cloud data with an empty new browser.

## Deployment

The Sites hosting skill owns publication. Reuse `.openai/hosting.json` project_id.
The deployment snapshot contains the app, not local credentials or user browser data.
`.env.local` is ignored; only Supabase public client settings enter the frontend build.
Read/update the existing Site source via the skill before future publication.
Sync reviewed app changes into `.sites-deploy` excluding `.git`, `node_modules`,
`dist`, `.openai` and environment files, then run the Sites workflow with
`node scripts/build-sites.mjs` as its build command. Keep original development
checkout and running Vite app intact. Never publish new audience without permission.

The build embeds frontend assets in a Worker plus API routes for official-page and
thumbnail imports. The Worker rejects non-HTTPS/private destinations, validates DNS
and redirects, limits bytes/time, and requires same-origin API requests. All routes
remain behind the owner-only platform access gate. Responses include noindex headers.

Validated: TypeScript/build and 4 Worker routing/destination tests. Phone LINE login confirmed by user screenshots. Deployed chiikawa park HTML import returned HTTP 200 after adding the importer User-Agent. Latest deployment: appgdep_6ab9f3cf09108191b88c8cb56f4a21c4, source fe844e0b76bc28bf6420499aea3be44a11204d82. Mobile Safari form sizing and time/delete separation updated; physical phone visual confirmation remains pending.
