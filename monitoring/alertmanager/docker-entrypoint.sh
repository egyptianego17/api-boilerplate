#!/bin/sh
set -e

# ── Alertmanager env-var substitution entrypoint ──
# Replaces ${VAR} placeholders in the template with actual environment variable values.
# Only variables that are non-empty are substituted; unset vars remain as-is (still commented out).

TEMPLATE=/etc/alertmanager/alertmanager.tmpl
CONFIG=/tmp/alertmanager.yml

cp "$TEMPLATE" "$CONFIG"

for var in SLACK_WEBHOOK_URL SMTP_SMARTHOST SMTP_USERNAME SMTP_PASSWORD ALERT_EMAIL_TO ALERT_EMAIL_FROM; do
  eval val=\$$var
  if [ -n "$val" ]; then
    sed -i "s|\${${var}}|${val}|g" "$CONFIG"
  fi
done

exec /bin/alertmanager --config.file="$CONFIG" --storage.path=/alertmanager "$@"
