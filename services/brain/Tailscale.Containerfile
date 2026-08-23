FROM docker.io/tailscale/tailscale:stable
COPY tailscale-serve.json /config/serve.json
