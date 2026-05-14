import { handleCompactionSignal, type CompactionEvent, type CompactionAgentContext } from "./compaction.js";
import { handleSessionEnd, type SessionEndEvent, type SessionEndContext } from "./session-end.js";
import type { OpenClawConfig } from "./openclaw-config.js";

type PluginApi = {
  config?: OpenClawConfig;
  on(name: "before_compaction", handler: (event: CompactionEvent, ctx: CompactionAgentContext) => Promise<void>): void;
  on(name: "session_end", handler: (event: SessionEndEvent, ctx: SessionEndContext) => Promise<void>): void;
};

const plugin = {
  id: "threadmark",
  name: "Threadmark",
  description: "Signals Threadmark during OpenClaw compaction and session end",
  register(api: PluginApi) {
    const config = api.config;
    api.on("before_compaction", async (event: CompactionEvent, ctx: CompactionAgentContext) => {
      try {
        await handleCompactionSignal(event, ctx, config);
      } catch (error) {
        console.error(`[threadmark] compaction signal failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
    api.on("session_end", async (event: SessionEndEvent, ctx: SessionEndContext) => {
      try {
        await handleSessionEnd(event, ctx, config);
      } catch (error) {
        console.error(`[threadmark] session_end capture failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  }
};

export default plugin;
