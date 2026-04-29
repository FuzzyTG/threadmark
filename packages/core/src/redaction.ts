const ASSIGNMENT_SECRET = /\b(password|passwd|token|api[_-]?key|secret|cookie)\b(\s*)(:|=)(\s*)(["']?)([^\s,;"']+)\5/gi;
const BEARER_TOKEN = /\bBearer\s+[^\s,;]+/gi;
const PRIVATE_KEY = /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g;
const URL_CREDENTIALS = /\b([a-z][a-z0-9+.-]*:\/\/[^\s:/@]+:)([^\s/@]+)(@[^\s]*)/gi;

export function redactSecrets(input: string): string {
  return input
    .replace(PRIVATE_KEY, "[REDACTED_PRIVATE_KEY]")
    .replace(BEARER_TOKEN, "Bearer [REDACTED]")
    .replace(URL_CREDENTIALS, "$1[REDACTED]$3")
    .replace(ASSIGNMENT_SECRET, (_match, key: string, beforeSeparator: string, separator: string, afterSeparator: string) => `${key}${beforeSeparator}${separator}${afterSeparator}[REDACTED]`);
}
