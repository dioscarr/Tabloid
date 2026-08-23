FROM docker.io/tailscale/tailscale:stable

COPY tailscale/serve.json /config/serve.json
COPY tailscale/static-entrypoint.sh /config/static-entrypoint.sh
RUN chmod 0755 /config/static-entrypoint.sh

CMD ["/config/static-entrypoint.sh"]
