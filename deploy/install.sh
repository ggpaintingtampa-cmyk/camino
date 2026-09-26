#!/usr/bin/env bash
# Root-only provisioning. This script never opens a database or reads existing credentials.
set -euo pipefail
umask 077

usage() {
  printf '%s\n' 'Usage: bash deploy/install.sh --source ABS_PROJECT --node ABS_NODE --release RELEASE_NAME'
  printf '%s\n' 'Installs a sealed release, runtime and units; does not start services or alter Caddy.'
}
project_source=''
node_source=''
release_name=''
while (($#)); do
  case "$1" in
    --source) project_source="${2:?Missing source path}"; shift 2 ;;
    --node) node_source="${2:?Missing Node path}"; shift 2 ;;
    --release) release_name="${2:?Missing release name}"; shift 2 ;;
    --help) usage; exit 0 ;;
    *) usage >&2; exit 2 ;;
  esac
done
[[ "$(id -u)" == 0 ]] || { printf '%s\n' 'Run this provisioning script as root.' >&2; exit 1; }
[[ "$project_source" == /* && "$node_source" == /* && "$release_name" =~ ^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$ ]] || { usage >&2; exit 2; }
project_source="$(realpath -- "$project_source")"
node_source="$(realpath -- "$node_source")"
[[ -x "$node_source" ]] || { printf '%s\n' 'The supplied Node runtime is not executable.' >&2; exit 1; }
[[ "$("$node_source" -p 'Number(process.versions.node.split(".")[0]) >= 24')" == true ]] || { printf '%s\n' 'Use the verified Node 24+ runtime that built dependencies.' >&2; exit 1; }
for entry in dist/index.html server/main.ts server/cli.ts shared/domain.ts node_modules/tsx/dist/cli.mjs package.json pnpm-lock.yaml deploy/hermesctl deploy/hermes.service deploy/hermes-backup.service deploy/hermes-backup.timer; do
  [[ -f "$project_source/$entry" ]] || { printf 'Required built release file missing: %s\n' "$entry" >&2; exit 1; }
done
[[ -z "$(find "$project_source/dist" -type l -print -quit)" ]] || { printf '%s\n' 'Public assets must not contain symbolic links.' >&2; exit 1; }
release_path="/srv/hermes/releases/$release_name"
[[ ! -e "$release_path" && ! -L "$release_path" ]] || { printf '%s\n' 'That sealed release already exists. Choose a new version; existing releases are never overwritten.' >&2; exit 1; }
for path in /srv/hermes /srv/hermes/releases /var/lib/hermes /var/backups/hermes /opt/hermes /opt/hermes/node /opt/hermes/node/bin; do
  [[ ! -L "$path" ]] || { printf 'Refusing unexpected directory symlink: %s\n' "$path" >&2; exit 1; }
done
for unit in hermes.service hermes-backup.service hermes-backup.timer; do
  if [[ -e "/etc/systemd/system/$unit" ]]; then
    cmp -s "$project_source/deploy/$unit" "/etc/systemd/system/$unit" || { printf 'Existing unit differs; review it before changing it: %s\n' "$unit" >&2; exit 1; }
  fi
done
if [[ -e /usr/local/bin/hermesctl || -L /usr/local/bin/hermesctl ]]; then
  [[ ! -L /usr/local/bin/hermesctl ]] || { printf '%s\n' 'Refusing an existing hermesctl symbolic link. Review it before replacing it.' >&2; exit 1; }
  cmp -s "$project_source/deploy/hermesctl" /usr/local/bin/hermesctl || { printf '%s\n' 'Existing hermesctl differs. Review it before changing it.' >&2; exit 1; }
fi
if getent passwd hermes >/dev/null; then
  [[ "$(id -gn hermes)" == hermes ]] || { printf '%s\n' 'Existing Caminos account has an unexpected primary group.' >&2; exit 1; }
  caminos_shell="$(getent passwd hermes | cut -d: -f7)"
  [[ "$caminos_shell" == /usr/sbin/nologin || "$caminos_shell" == /sbin/nologin ]] || { printf '%s\n' 'Existing Caminos account permits login. Review before deploying.' >&2; exit 1; }
else
  getent group hermes >/dev/null || groupadd --system hermes
  useradd --system --gid hermes --home-dir /var/lib/hermes --shell /usr/sbin/nologin hermes
fi
for path in /var/lib/hermes /var/backups/hermes; do
  if [[ -e "$path" && "$(stat -c '%U' "$path")" != hermes ]]; then
    printf 'Existing private directory has an unexpected owner: %s\n' "$path" >&2; exit 1
  fi
  install -d -m 0700 -o hermes -g hermes "$path"
done
install -d -m 0750 -o root -g hermes /srv/hermes /srv/hermes/releases /opt/hermes /opt/hermes/node /opt/hermes/node/bin
if [[ -e /opt/hermes/node/bin/node ]]; then
  cmp -s "$node_source" /opt/hermes/node/bin/node || { printf '%s\n' 'Existing Caminos Node runtime differs. Review runtime changes separately.' >&2; exit 1; }
else
  install -m 0750 -o root -g hermes "$node_source" /opt/hermes/node/bin/node
fi
install -d -m 0750 -o root -g hermes "$release_path"
for entry in dist server shared node_modules package.json pnpm-lock.yaml; do
  cp -a -- "$project_source/$entry" "$release_path/$entry"
done
chown -R root:hermes "$release_path"
chmod -R u=rwX,g=rX,o= "$release_path"
for unit in hermes.service hermes-backup.service hermes-backup.timer; do
  install -m 0644 -o root -g root "$project_source/deploy/$unit" "/etc/systemd/system/$unit"
done
install -m 0755 -o root -g root "$project_source/deploy/hermesctl" /usr/local/bin/hermesctl
if [[ ! -e /srv/hermes/current && ! -L /srv/hermes/current ]]; then
  ln -s "$release_path" /srv/hermes/current
fi
systemctl daemon-reload
printf 'Installed sealed release: %s\n' "$release_path"
printf '%s\n' 'No database was opened or initialized by root. No services were started.'
printf '%s\n' 'If current already existed, it was preserved; explicitly activate the intended release.'
printf '%s\n' 'Validate/add the separate Caddy site, then start hermes.service and enable hermes-backup.timer.'
printf '%s\n' 'Generate a private setup link with: sudo -u hermes hermesctl setup-link'
