#!/usr/bin/env bash
#
# Prompts for the two Supabase keys and writes them into .env.local.
#
#   bash scripts/set-keys.sh
#
# Run it in Terminal (it needs to prompt you). Keys are not echoed to the
# screen and never leave this machine.
set -euo pipefail
cd "$(dirname "$0")/.."

ENV_FILE=".env.local"
[ -f "$ENV_FILE" ] || { echo "No $ENV_FILE found. Run: cp .env.example .env.local"; exit 1; }

echo
echo "  Supabase keys"
echo "  Find both at: Project Settings -> API"
echo "  https://supabase.com/dashboard/project/haxbdgacfcsejdhdkrhq/settings/api"
echo

# --- public key -------------------------------------------------------------
echo "  1) PUBLIC key  — labelled 'anon public'  (or starts with sb_publishable_)"
echo "     This one is safe to publish; it ships in the browser."
printf "     Paste it here: "
read -r ANON
echo

# --- secret key -------------------------------------------------------------
echo "  2) SECRET key  — labelled 'service_role'  (or starts with sb_secret_)"
echo "     This one bypasses all security. It stays on this machine only."
printf "     Paste it here (hidden): "
read -rs SERVICE
echo
echo

# --- validate ---------------------------------------------------------------
fail=0
check() { # name value
  local n="$1" v="$2"
  if [ -z "$v" ]; then echo "  x $n is empty"; fail=1; return; fi
  case "$v" in
    eyJ*|sb_publishable_*|sb_secret_*) echo "  ok $n looks like a Supabase key (${#v} chars)";;
    *) echo "  x $n does not look like a Supabase key — it should start with 'eyJ' or 'sb_'"; fail=1;;
  esac
}
check "Public key" "$ANON"
check "Secret key" "$SERVICE"

if [ "$ANON" = "$SERVICE" ]; then
  echo "  x Both keys are identical — they should be different"
  fail=1
fi
[ "$fail" -eq 0 ] || { echo; echo "  Nothing written. Re-run when you have both keys."; exit 1; }

# --- write ------------------------------------------------------------------
# Replace the whole line for each key, leaving everything else untouched.
python3 - "$ANON" "$SERVICE" <<'PY'
import sys, re
anon, service = sys.argv[1], sys.argv[2]
path = '.env.local'
out = []
for line in open(path):
    if re.match(r'\s*VITE_SUPABASE_ANON_KEY\s*=', line):
        out.append(f'VITE_SUPABASE_ANON_KEY={anon}\n')
    elif re.match(r'\s*SUPABASE_SERVICE_ROLE_KEY\s*=', line):
        out.append(f'SUPABASE_SERVICE_ROLE_KEY={service}\n')
    else:
        out.append(line)
open(path, 'w').writelines(out)
PY

echo
echo "  Saved to $ENV_FILE (git-ignored)."
echo "  Now tell Claude, or run: npm run bootstrap"
echo
