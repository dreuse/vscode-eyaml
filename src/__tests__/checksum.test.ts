import { describe, it, expect } from "vitest";
import { md5 } from "../checksum";

describe("md5", () => {
  it("returns consistent hashes for the same input", () => {
    const hash = md5("hello world");
    expect(hash).toBe(md5("hello world"));
  });

  it("returns different hashes for different inputs", () => {
    expect(md5("hello")).not.toBe(md5("world"));
  });

  it("returns a 32-character hex string", () => {
    const hash = md5("test");
    expect(hash).toHaveLength(32);
    expect(hash).toMatch(/^[0-9a-f]{32}$/);
  });

  it("matches known MD5 values", () => {
    expect(md5("")).toBe("d41d8cd98f00b204e9800998ecf8427e");
    expect(md5("hello")).toBe("5d41402abc4b2a76b9719d911017c592");
  });

  it("handles unicode content", () => {
    const hash = md5("café ☕");
    expect(hash).toHaveLength(32);
    expect(hash).toMatch(/^[0-9a-f]{32}$/);
  });
});
