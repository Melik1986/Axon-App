# Axon Flow AI CI/CD (Replit + EAS Workflows)

This project uses:

1. `EAS Workflows` for mobile CI/CD (quality, OTA updates, Android builds).
2. `Replit Deployments` for backend deploy by branch.

GitHub Actions are not used for EAS build/update steps.

## Branch Strategy

1. `dev` branch:
   - runs quality checks in EAS workflow;
   - publishes OTA to `dev` branch/channel for Expo Go testing;
   - builds internal Android artifact with `development` profile.
2. `main` branch:
   - runs production quality checks in EAS workflow;
   - builds production Android artifact (`production` profile);
   - publishes OTA to `production` branch/channel after successful build.

## EAS Workflow Files

1. `.eas/workflows/dev.yml`
2. `.eas/workflows/main.yml`

They are triggered by branch events and `workflow_dispatch`.

## EAS Profile and Channel Mapping

Configured in `eas.json`:

1. `development` profile -> `channel: dev`
2. `preview` profile -> `channel: preview`
3. `production` profile -> `channel: production`

This keeps OTA routing explicit and deterministic.

## Replit Deployment Setup

Configure two deployment targets in Replit:

1. `axon-dev`
   - source branch: `dev`
   - install command: `npm ci --omit=dev`
   - build command: `npm run server:nest:build`
   - run command: `npm run server:nest:prod`
2. `axon-prod`
   - source branch: `main`
   - install command: `npm ci --omit=dev`
   - build command: `npm run server:nest:build`
   - run command: `npm run server:nest:prod`

Both targets must expose a fast health endpoint:

1. `GET /health`
2. target response time under 5 seconds

## Environment Separation

1. Keep separate secret sets for `dev` and `prod` in Replit.
2. Keep EAS secrets/environment profile-specific (development vs production).

## Expo Go Testing Flow

1. QA devices use Expo Go and consume updates from `dev` channel.
2. Production users consume updates from `production` channel only.

## Caching

1. EAS built-in dependency/build caches are enabled by default.
2. Build jobs explicitly set `EAS_USE_CACHE=1` in workflow files.

## Operational Rollout

1. Trigger `.eas/workflows/dev.yml` manually once (`workflow_dispatch`) and verify:
   - quality checks pass;
   - `dev` OTA is published;
   - `development` Android build is created.
2. Trigger `.eas/workflows/main.yml` manually once and verify:
   - quality checks pass;
   - production Android build is created;
   - production OTA is published.
3. Enable branch protection in Git provider:
   - `dev`: require `quality_dev`
   - `main`: require `quality_main`
