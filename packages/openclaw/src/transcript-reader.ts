import fs from "node:fs";
import readline from "node:readline";
import type { TranscriptMessage } from "@threadmark/core/types";

function extractText(content: unknown): string | null {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return null;

  const parts = content
    .map((part) => {
      if (part && typeof part === "object" && "type" in part && "text" in part) {
        const typed = part as { type?: unknown; text?: unknown };
        if (typed.type === "text" && typeof typed.text === "string") return typed.text;
      }
      return null;
    })
    .filter((value): value is string => Boolean(value));

  return parts.length > 0 ? parts.join("\n") : null;
}

function extractExternalUserText(text: string): string | null {
  const metaStart = text.indexOf("Conversation info (untrusted metadata):");
  if (metaStart === -1 || !text.includes("\nSender (untrusted metadata):")) return null;

  const metadataEnd = text.lastIndexOf("```\n\n");
  if (metadataEnd === -1) return null;

  const userText = text.slice(metadataEnd + "```\n\n".length).trim();
  return userText.length > 0 ? userText : null;
}

export async function readTranscriptMessages(filePath: string, maxMessages: number): Promise<TranscriptMessage[]> {
  if (maxMessages <= 0) return [];

  const messages: TranscriptMessage[] = [];
  const lines = readline.createInterface({
    input: fs.createReadStream(filePath, { encoding: "utf-8" }),
    crlfDelay: Infinity
  });

  for await (const line of lines) {
    if (!line.trim()) continue;

    try {
      const entry = JSON.parse(line) as { type?: unknown; message?: { role?: unknown; content?: unknown } };
      if (entry.type !== "message" || !entry.message) continue;
      if (entry.message.role !== "user") continue;

      const text = extractText(entry.message.content);
      if (!text) continue;
      const userText = extractExternalUserText(text);
      if (!userText) continue;
      if (userText.startsWith("/")) continue;

      messages.push({ role: "user", text: userText });
      if (messages.length > maxMessages) messages.shift();
    } catch {
      continue;
    }
  }

  return messages;
}
