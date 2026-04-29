import { handleCompactionSignal, type CompactionContext } from "./compaction.js";

type PluginApi = {
  on: (name: "before_compaction", handler: (context: CompactionContext) => Promise<void>) => void;
};

const plugin = {
  id: "threadmark",
  name: "Threadmark",
  description: "Signals Threadmark during OpenClaw compaction",
  register(api: PluginApi) {
    api.on("before_compaction", async (context: CompactionContext) => {
      try {
        await handleCompactionSignal(context);
      } catch (error) {
        console.error(`[threadmark] compaction signal failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  }
};

export default plugin;
