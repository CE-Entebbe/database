#!/usr/bin/env bash
# Pushes optional integration secrets from the current environment to the deployed Worker.
# Only variables that are set are sent; missing ones simply keep that feature hidden.
set -euo pipefail
for v in RESEND_API_KEY EMAIL_FROM GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET PUBLIC_URL; do
  if [ -n "${!v:-}" ]; then printf '%s' "${!v}" | npx wrangler secret put "$v" >/dev/null && echo "set $v"; else echo "skip $v (not set)"; fi
done
