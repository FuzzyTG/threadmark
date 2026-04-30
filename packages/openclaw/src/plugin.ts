import { handleCompactionSignal, type CompactionEvent, type CompactionAgentContext } from "./compaction.js";

type PluginApi = {
  on: (name: "before_compaction", handler: (event: CompactionEvent, ctx: CompactionAgentContext) => Promise<void>) => void;
};

const plugin = {
  id: "threadmark",
  name: "Threadmark",
  description: "Signals Threadmark during OpenClaw compaction",
  register(api: PluginApi) {
    api.on("before_compaction", async (event: CompactionEvent, ctx: CompactionAgentContext) => {
      try {
        await handleCompactionSignal(event, ctx);
      } catch (error) {
        console.error(`[threadmark] compaction signal failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  }
};

export default plugin;
