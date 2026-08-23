#!/bin/sh
set -eu

case "${TABLOID_STATIC_PATH:-}" in
  *[!a-z0-9/-]*|'') echo "Invalid TABLOID_STATIC_PATH" >&2; exit 1 ;;
esac

sed "s|__TABLOID_STATIC_PATH__|${TABLOID_STATIC_PATH}|g" /config/serve.json > /tmp/serve.json
export TS_SERVE_CONFIG=/tmp/serve.json
exec /usr/local/bin/containerboot
