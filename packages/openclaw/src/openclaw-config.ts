import path from "node:path";

type AgentEntry = {
  id: string;
  default?: boolean;
  workspace?: string;
};

type AgentsConfig = {
  defaults?: { workspace?: string };
  list?: AgentEntry[];
};

export type OpenClawConfig = {
  agents?: AgentsConfig;
};

const DEFAULT_AGENT_ID = "main";

export function resolveWorkspaceFromConfig(
  config: OpenClawConfig | undefined,
  agentId: string,
  stateDir: string,
): string {
  const normalizedId = agentId.toLowerCase().trim();
  const agent = config?.agents?.list?.find(
    (a) => a.id?.toLowerCase().trim() === normalizedId
  );
  if (agent?.workspace?.trim()) return agent.workspace.trim();

  const agents = config?.agents?.list ?? [];
  const defaultEntry = agents.find((a) => a.default) ?? agents[0];
  const defaultId = (defaultEntry?.id?.toLowerCase().trim()) || DEFAULT_AGENT_ID;

  if (normalizedId === defaultId) {
    const fallback = config?.agents?.defaults?.workspace?.trim();
    if (fallback) return fallback;
    return path.join(stateDir, "workspace");
  }
  return path.join(stateDir, `workspace-${normalizedId}`);
}

export function deriveAgentIdFromSessionFile(sessionFile: string): string | null {
  const match = sessionFile.match(/\/agents\/([^/]+)\/sessions\//);
  return match?.[1] ?? null;
}
