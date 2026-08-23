#!/bin/sh
set -eu

case "${TABLOID_SERVE_DESTINATION:-}" in
  http://tabloid-app:8080|http://tabloid-app:8080/) ;;
  http://tabloid-static-gateway:8080/*)
    static_path=${TABLOID_SERVE_DESTINATION#http://tabloid-static-gateway:8080/}
    case "$static_path" in
      *[!a-z0-9/-]*|'') echo "Invalid TABLOID_SERVE_DESTINATION" >&2; exit 1 ;;
    esac
    ;;
  *)
    echo "Invalid TABLOID_SERVE_DESTINATION" >&2
    exit 1
    ;;
esac

sed "s|__TABLOID_SERVE_DESTINATION__|${TABLOID_SERVE_DESTINATION}|g" /config/serve.json > /tmp/serve.json
export TS_SERVE_CONFIG=/tmp/serve.json
exec /usr/local/bin/containerboot
