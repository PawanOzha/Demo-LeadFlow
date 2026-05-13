import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizeExecSqlRow,
  peelExecSqlRpcEnvelope,
  safeParseJson,
} from "./normalize-exec-sql-row";

describe("safeParseJson", () => {
  it("returns non-strings unchanged", () => {
    assert.equal(safeParseJson(42), 42);
    assert.deepEqual(safeParseJson({ a: 1 }), { a: 1 });
  });

  it("parses JSON object strings", () => {
    assert.deepEqual(safeParseJson('{"x":1}'), { x: 1 });
  });

  it("returns original string on malformed JSON (no throw)", () => {
    const bad = "{not json";
    assert.equal(safeParseJson(bad), bad);
  });
});

describe("normalizeExecSqlRow", () => {
  it("unwraps row_to_json object", () => {
    const inner = { stats: { total: 1 } };
    const row = { row_to_json: inner };
    assert.deepEqual(normalizeExecSqlRow(row), inner);
  });

  it("unwraps row_to_json JSON string", () => {
    const inner = { total: 0 };
    const row = { row_to_json: JSON.stringify(inner) };
    assert.deepEqual(normalizeExecSqlRow(row), inner);
  });

  it("returns null for array input", () => {
    assert.equal(normalizeExecSqlRow([1, 2]), null);
  });

  it("handles already-normalized row", () => {
    const row = { c: "5" };
    assert.deepEqual(normalizeExecSqlRow(row), row);
  });

  it("unwraps json_build_object single-key envelope", () => {
    const inner = { stats: { total: 1 } };
    const row = { json_build_object: inner };
    assert.deepEqual(normalizeExecSqlRow(row), inner);
  });

  it("does not unwrap arbitrary single-key COUNT rows", () => {
    const row = { c: "56240" };
    assert.deepEqual(normalizeExecSqlRow(row), row);
  });
});

describe("peelExecSqlRpcEnvelope", () => {
  it("peels single-key exec_sql wrapper", () => {
    const inner = { stats: { total: 3 } };
    const row = { exec_sql: inner };
    assert.deepEqual(
      peelExecSqlRpcEnvelope("exec_sql", row),
      inner,
    );
  });

  it("peels custom rpc name key", () => {
    const inner = { id: "x" };
    const row = { my_rpc: JSON.stringify(inner) };
    assert.deepEqual(peelExecSqlRpcEnvelope("my_rpc", row), inner);
  });

  it("returns null when row_to_json inner is invalid", () => {
    assert.equal(
      peelExecSqlRpcEnvelope("exec_sql", {
        row_to_json: "{broken",
      }),
      null,
    );
  });
});
