/**
 * pi-status (Linux) — mirrors pi agent lifecycle to ~/.config/pi/pi_state.json
 * Payload: { mode, emoji, label, color, ts }  (ts = unix ms, used by the plasmoid)
 * Install: ~/.pi/agent/extensions/pi-status/index.ts
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const STATE_PATH = join(homedir(), ".config", "pi", "pi_state.json");

const COLORS = {
  write: "#7cffba", read: "#ff9e64", task: "#7cc4ff", thinking: "#9d5cff",
  writing: "#f472b6", asking: "#ffd75f", error: "#f7768e", compacting: "#c99bff",
} as const;

interface AgentState { mode: string; emoji: string; label: string; color?: string }

const IDLE: AgentState = { mode: "idle" };
const WRITING: AgentState = { mode: "writing", emoji: "✍️", label: "writing", color: COLORS.writing };
const THINKING: AgentState = { mode: "thinking", emoji: "💭", label: "thinking", color: COLORS.thinking };
const ASKING: AgentState = { mode: "asking", emoji: "🤔", label: "asking", color: COLORS.asking };
const ERROR_STATE: AgentState = { mode: "error", emoji: "⚠️", label: "error", color: COLORS.error };
const COMPACTING: AgentState = { mode: "compacting", emoji: "🧹", label: "compacting", color: COLORS.compacting };
const READ_STATE: AgentState = { mode: "read", emoji: "📖", label: "reading", color: COLORS.read };
const WRITE_STATE: AgentState = { mode: "write", emoji: "✏️", label: "write", color: COLORS.write };
const TASK_STATE: AgentState = { mode: "task", emoji: "🔧", label: "working", color: COLORS.task };

function toolState(name: string): AgentState {
  if (["read", "grep", "find", "ls"].includes(name)) return READ_STATE;
  if (name === "write" || name === "edit") return WRITE_STATE;
  return TASK_STATE;
}

let lastKey = "";
let lastAt = 0;
let pendingTimer: ReturnType<typeof setTimeout> | null = null;
const HEARTBEAT_MS = 1000; // re-write same state at most once/s so ts stays fresh while streaming

async function writeAtomic(state: AgentState): Promise<void> {
  const data = `${JSON.stringify({ ...state, ts: Date.now() })}\n`;
  const tmp = `${STATE_PATH}.${process.pid}.tmp`;
  try {
    await mkdir(dirname(STATE_PATH), { recursive: true });
    await writeFile(tmp, data, "utf8");
    await rename(tmp, STATE_PATH);
  } catch {
    try { await writeFile(STATE_PATH, data, "utf8"); } catch { /* best effort */ }
  }
}

function emit(state: AgentState, debounceMs = 0): void {
  const key = JSON.stringify(state);
  const now = Date.now();
  if (key === lastKey && now - lastAt < HEARTBEAT_MS) return;
  if (pendingTimer !== null) { clearTimeout(pendingTimer); pendingTimer = null; }
  const run = () => { lastKey = key; lastAt = Date.now(); void writeAtomic(state); };
  if (debounceMs > 0) pendingTimer = setTimeout(() => { pendingTimer = null; run(); }, debounceMs);
  else run();
}

export default function (pi: ExtensionAPI) {
  pi.on("session_start", () => emit(IDLE));
  pi.on("session_shutdown", () => emit(IDLE));

  pi.on("agent_start", () => emit(WRITING));
  pi.on("agent_end", () => emit(IDLE));
  pi.on("agent_settled", () => emit(IDLE));

  pi.on("ui_prompt_start", () => emit(ASKING));
  pi.on("ui_prompt_end", () => emit(WRITING));

  pi.on("session_compact", () => emit(COMPACTING));
  pi.on("session_compact_failed", () => emit(ERROR_STATE));

  pi.on("message_update", () => emit(THINKING, 200));

  pi.on("tool_call", (event: any) => emit(toolState(String(event?.toolName ?? ""))));
  pi.on("tool_result", (event: any) => { if (event?.isError) emit(ERROR_STATE); });

  pi.on("input", () => emit(WRITING));
}
