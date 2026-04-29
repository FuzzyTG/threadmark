import test from "node:test";
import assert from "node:assert/strict";
import { redactSecrets } from "../src/redaction.js";

test("redactSecrets redacts common credential assignments", () => {
  const input = "password=secret123 token: abcdefghijklmnop api_key=sk-test-123456 cookie=sessionid=abc";
  const output = redactSecrets(input);

  assert.equal(output.includes("secret123"), false);
  assert.equal(output.includes("abcdefghijklmnop"), false);
  assert.equal(output.includes("sk-test-123456"), false);
  assert.equal(output.includes("sessionid=abc"), false);
  assert.match(output, /password=\[REDACTED\]/);
  assert.match(output, /token: \[REDACTED\]/);
  assert.match(output, /api_key=\[REDACTED\]/);
  assert.match(output, /cookie=\[REDACTED\]/);
});

test("redactSecrets redacts bearer tokens", () => {
  const output = redactSecrets("Authorization: Bearer abc.def.ghi");

  assert.equal(output.includes("abc.def.ghi"), false);
  assert.equal(output, "Authorization: Bearer [REDACTED]");
});

test("redactSecrets redacts quoted credential assignments", () => {
  const output = redactSecrets("token = \"abc123\" secret: 'hidden-value'");

  assert.equal(output.includes("abc123"), false);
  assert.equal(output.includes("hidden-value"), false);
  assert.match(output, /token = \[REDACTED\]/);
  assert.match(output, /secret: \[REDACTED\]/);
});

test("redactSecrets redacts URL credentials", () => {
  const output = redactSecrets("postgres://alex:secretpass@localhost/db");

  assert.equal(output.includes("secretpass"), false);
  assert.equal(output, "postgres://alex:[REDACTED]@localhost/db");
});

test("redactSecrets redacts connection string password fields", () => {
  const output = redactSecrets("Server=db;User Id=alex;Password=secretpass;Database=main");

  assert.equal(output.includes("secretpass"), false);
  assert.match(output, /Password=\[REDACTED\]/);
});

test("redactSecrets redacts private key blocks", () => {
  const input = "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----";
  assert.equal(redactSecrets(input), "[REDACTED_PRIVATE_KEY]");
});
