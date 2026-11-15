# AgentStatus

KDE Plasma 6 plasmoid that shows the live state of your **opencode** and **pi** agents as text, with the same bouncing-sweep animation as the YASB widget from [EnderDots](https://github.com/kurojs/EnderDots).

```
💭 thinking · pi  ▮▮▮▯▯▯▯▯▯▯▯▯▯▯▯▯▯
```

## How it works

Each agent writes a small JSON state file; the plasmoid polls both every 250 ms.

| Agent    | File                                       | Writer                  |
|----------|--------------------------------------------|-------------------------|
| opencode | `~/.config/opencode/opencode_state.json`   | `hooks/opencode-status.js` (opencode v2 plugin) |
| pi       | `~/.config/pi/pi_state.json`               | `hooks/pi-status.ts` (pi extension)             |

Payload: `{ "mode": "idle" | "active"…, "emoji": "💭", "label": "thinking", "color": "#9d5cff", "ts": <unix ms> }`

- If both agents are active, the most recently updated one wins.
- An active state not refreshed within 8 s is treated as idle (`staleMs` in `contents/ui/main.qml`).
- Idle shows `🟣 York`.
- The sweep (`contents/ui/SweepBar.qml`) is a port of YASB's `SweepBar`; its parameters are properties of that component.

## Install

```bash
./install.sh            # plasmoid only
./install.sh --hooks    # + opencode plugin and pi extension (no overwrite)
systemctl --user restart plasma-plasmashell
```

Then right-click the panel → *Add Widgets* → **Agent Status**.

Requires Plasma 6 and an emoji font (e.g. `noto-fonts-emoji`).

To build a `.plasmoid` file: `zip -r AgentStatus.plasmoid metadata.json contents`

## License

MIT
