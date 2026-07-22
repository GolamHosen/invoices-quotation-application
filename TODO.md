# Vercel Deployment Fix Plan

## Completed Steps
- [x] Analyzed codebase and identified issues
- [x] Got approval from user to proceed

## Pending Steps
- [x] Fix `next.config.ts`:
  - [x] Remove `output: "standalone"`
  - [x] Remove `@dnd-kit/*` from `serverExternalPackages`
  - [x] Fix `experimental.serverActions` configuration for Next.js 16
- [x] Fix `vercel.json`:
  - [x] Update function patterns to match App Router structure
  - [x] Adjust maxDuration values for Vercel plan compatibility
- [x] Fix `package.json`:
  - [x] Remove unused `drizzle-orm` dependency
  - [x] Remove unused `dotenv` dependency
- [x] Run `npm install` to update lockfile
- [x] Run `npm run build` to verify build succeeds
