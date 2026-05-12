import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { deriveAgentIdFromSessionFile, resolveWorkspaceFromConfig } from "../src/openclaw-config.js";

test("deriveAgentIdFromSessionFile extracts agent id from valid path", () => {
  const result = deriveAgentIdFromSessionFile("/home/user/.openclaw/agents/cto/sessions/abc.jsonl");
  assert.equal(result, "cto");
});

test("deriveAgentIdFromSessionFile returns null for invalid path", () => {
  const result = deriveAgentIdFromSessionFile("/tmp/random/sessions/abc.jsonl");
  assert.equal(result, null);
});

test("deriveAgentIdFromSessionFile returns null for empty string", () => {
  const result = deriveAgentIdFromSessionFile("");
  assert.equal(result, null);
});

test("resolveWorkspaceFromConfig respects per-agent workspace", () => {
  const config = {
    agents: {
      list: [
        { id: "main", default: true },
        { id: "cto", workspace: "/custom/cto-workspace" }
      ]
    }
  };
  const result = resolveWorkspaceFromConfig(config, "cto", "/home/user/.openclaw");
  assert.equal(result, "/custom/cto-workspace");
});

test("resolveWorkspaceFromConfig falls back to workspace-<id> convention", () => {
  const config = {
    agents: {
      list: [
        { id: "main", default: true },
        { id: "cto" }
      ]
    }
  };
  const result = resolveWorkspaceFromConfig(config, "cto", "/home/user/.openclaw");
  assert.equal(result, path.join("/home/user/.openclaw", "workspace-cto"));
});

test("resolveWorkspaceFromConfig uses defaults workspace for default agent", () => {
  const config = {
    agents: {
      defaults: { workspace: "/shared/workspace" },
      list: [
        { id: "main", default: true }
      ]
    }
  };
  const result = resolveWorkspaceFromConfig(config, "main", "/home/user/.openclaw");
  assert.equal(result, "/shared/workspace");
});

test("resolveWorkspaceFromConfig uses stateDir/workspace for default agent without defaults config", () => {
  const config = {
    agents: {
      list: [
        { id: "main", default: true }
      ]
    }
  };
  const result = resolveWorkspaceFromConfig(config, "main", "/home/user/.openclaw");
  assert.equal(result, path.join("/home/user/.openclaw", "workspace"));
});

test("resolveWorkspaceFromConfig handles undefined config", () => {
  const result = resolveWorkspaceFromConfig(undefined, "main", "/home/user/.openclaw");
  assert.equal(result, path.join("/home/user/.openclaw", "workspace"));
});

test("resolveWorkspaceFromConfig normalizes agent id case", () => {
  const config = {
    agents: {
      list: [
        { id: "CTO", workspace: "/custom/cto-workspace" }
      ]
    }
  };
  const result = resolveWorkspaceFromConfig(config, "cto", "/home/user/.openclaw");
  assert.equal(result, "/custom/cto-workspace");
});
