# Production Exclusion List

These files and directories should be excluded from production builds or deployment artifacts to reduce size and improve security.

## Directories

- `docs/` - Documentation not required for runtime.
- `scripts/` - Build/Dev scripts.
- `coverage/` - Test coverage reports.
- `.cursor/` - IDE settings.
- `.trae/` - IDE settings.
- `client/lib/__tests__/` - Client-side tests.
- `server/src/**/*.spec.ts` - Server-side tests.
- `client/replit_integrations/` - Replit-specific integrations (verify usage before exclusion).

## Files

- `*.log`
- `*.test.ts`
- `*.spec.ts`
- `jest.config.js`
- `jest.setup.js`
- `tsconfig.spec.json`
- `eslint.config.js`
- `drizzle.config.ts` (Unless running migrations in prod container via source)

## Deployment Recommendations

1. **Server**: When using `npm run server:build`, the output is in `server_dist/`. Only this folder and `package.json` (for production deps) are strictly required for runtime if bundled correctly.
2. **Client**: Expo builds (APK/IPA) automatically exclude development files based on `metro.config.js`.
3. **Docker**: Add the above patterns to `.dockerignore` to keep the build context light.
