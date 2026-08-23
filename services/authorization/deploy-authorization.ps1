[CmdletBinding()] param([string]$Hostname='tabloid-authorization',[string]$TailnetDomain='tail70b7f1.ts.net')
$ErrorActionPreference='Stop'
$podman=Join-Path $env:LOCALAPPDATA 'Programs\Podman\podman.exe'
$root=$PSScriptRoot; $network='tabloid-access-control'; $service='tabloid-authorization-service'; $sidecar='tabloid-authorization-tailscale'; $data='tabloid-authorization-data'; $state='tabloid-authorization-tailscale-state'
& $podman build -t localhost/tabloid-authorization:latest -f (Join-Path $root 'Containerfile') $root
& $podman build -t localhost/tabloid-authorization-tailscale:latest -f (Join-Path $root 'Tailscale.Containerfile') $root
& $podman network exists $network 2>$null; if ($LASTEXITCODE -ne 0) { & $podman network create $network }
foreach($c in @($service,$sidecar)){ & $podman rm --force $c 2>$null }
foreach($v in @($data,$state)){ & $podman volume exists $v 2>$null; if($LASTEXITCODE -ne 0){& $podman volume create $v} }
& $podman run -d --name $service --restart unless-stopped --network $network --network-alias authorization-service -e AUTHZ_SERVICE_TOKEN=$env:AUTHZ_SERVICE_TOKEN -e AUTHZ_STORE=/data/authorization.json -v ($data + ':/data') localhost/tabloid-authorization:latest
& $podman run -d --name $sidecar --hostname $Hostname --restart unless-stopped --network $network -e TS_AUTHKEY=$env:TS_AUTHKEY -e TS_AUTH_ONCE=true -e TS_EXTRA_ARGS=--advertise-tags=tag:preview -e TS_HOSTNAME=$Hostname -e TS_STATE_DIR=/var/lib/tailscale -e TS_SERVE_CONFIG=/config/serve.json -e TS_USERSPACE=true -v ($state + ':/var/lib/tailscale') localhost/tabloid-authorization-tailscale:latest
Write-Host ("Access Control deployed at https://" + $Hostname + "." + $TailnetDomain + "/")
