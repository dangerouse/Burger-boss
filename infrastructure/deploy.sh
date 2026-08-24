#!/usr/bin/env bash
# Push the game to the Cloudflare Pages project that Terraform created.
#
# Terraform owns the project; this script owns the file contents.
# Credentials come from the environment, falling back to terraform.tfvars so
# that one gitignored file serves both Terraform and wrangler.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TFVARS="$SCRIPT_DIR/terraform.tfvars"

# Read a "key = \"value\"" pair out of terraform.tfvars.
tfvar() {
  [ -f "$TFVARS" ] || return 0
  sed -n "s/^[[:space:]]*$1[[:space:]]*=[[:space:]]*\"\(.*\)\"[[:space:]]*$/\1/p" "$TFVARS" | head -1
}

: "${CLOUDFLARE_API_TOKEN:=$(tfvar cloudflare_api_token)}"
: "${CLOUDFLARE_ACCOUNT_ID:=$(tfvar cloudflare_account_id)}"
export CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID

if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
  echo "No Cloudflare API token found." >&2
  echo "Set CLOUDFLARE_API_TOKEN, or add cloudflare_api_token to $TFVARS" >&2
  exit 1
fi

PROJECT="${1:-$(tfvar project_name)}"
PROJECT="${PROJECT:-burger-boss}"

# Stage only the game. README.md, LICENSE and infrastructure/ stay off the
# public site.
DIST="$(mktemp -d)"
trap 'rm -rf "$DIST"' EXIT

cd "$REPO_ROOT"
cp index.html style.css game.js levels.js test.html test.js "$DIST/"

echo "Deploying $(find "$DIST" -type f | wc -l | tr -d ' ') files to Pages project '$PROJECT'..."
npx --yes wrangler pages deploy "$DIST" \
  --project-name "$PROJECT" \
  --branch main
