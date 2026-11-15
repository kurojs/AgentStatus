#!/usr/bin/env bash
# Installs the plasmoid (Plasma 6). Pass --hooks to also install the opencode
# plugin and the pi extension (never overwrites existing files).
set -euo pipefail
cd "$(dirname "$0")"
ID=com.github.kurojs.agent-status

stage=$(mktemp -d)
trap 'rm -rf "$stage"' EXIT
cp -r metadata.json contents "$stage"/

if kpackagetool6 -t Plasma/Applet -l 2>/dev/null | grep -q "$ID"; then
  kpackagetool6 -t Plasma/Applet -u "$stage"
else
  kpackagetool6 -t Plasma/Applet -i "$stage"
fi

if [[ "${1:-}" == "--hooks" ]]; then
  oc="$HOME/.config/opencode/plugins"
  mkdir -p "$oc" "$HOME/.pi/agent/extensions/pi-status"
  if [[ -e "$oc/yasb-status.js" || -e "$oc/agent-status.js" ]]; then
    echo "opencode: a status plugin already exists, skipping"
  else
    cp hooks/opencode-status.js "$oc/agent-status.js" && echo "opencode: plugin installed"
  fi
  if [[ -e "$HOME/.pi/agent/extensions/pi-status/index.ts" ]]; then
    echo "pi: extension already exists, skipping"
  else
    cp hooks/pi-status.ts "$HOME/.pi/agent/extensions/pi-status/index.ts" && echo "pi: extension installed"
  fi
fi

echo "Done. Reload the shell to pick up changes: systemctl --user restart plasma-plasmashell"
