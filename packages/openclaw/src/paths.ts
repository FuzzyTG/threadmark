import path from "node:path";
import os from "node:os";
import { PACKET_FILE_NAME, STATE_FILE_NAME } from "@threadmark/core/constants";

export const CONTINUITY_DIR_NAME = "continuity";

export function openClawHome(): string {
  return process.env.OPENCLAW_HOME || path.join(os.homedir(), ".openclaw");
}

export function continuityDir(baseDir = openClawHome()): string {
  return path.join(baseDir, CONTINUITY_DIR_NAME);
}

export function statePath(baseDir = openClawHome()): string {
  return path.join(continuityDir(baseDir), STATE_FILE_NAME);
}

export function packetPath(baseDir = openClawHome()): string {
  return path.join(continuityDir(baseDir), PACKET_FILE_NAME);
}
