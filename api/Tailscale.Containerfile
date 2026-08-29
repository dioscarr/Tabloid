FROM localhost/tabloid-tailscale-preview:latest

RUN sed -i 's|http://tabloid-app:8080|http://tabloid-admin-api:8080|g' /config/static-entrypoint.sh
