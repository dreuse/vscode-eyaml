import { describe, it, expect } from "vitest";
import {
  ENCRYPTED_VALUE_PATTERN,
  ENCRYPTED_VALUE_PATTERN_GLOBAL,
  ENCRYPTED_VALUE_PATTERN_MULTILINE,
  DECRYPTED_VALUE_PATTERN,
  YAML_KEY_VALUE_LINE,
} from "../constants";

describe("ENCRYPTED_VALUE_PATTERN", () => {
  it("matches standard ENC blocks", () => {
    expect(ENCRYPTED_VALUE_PATTERN.test("ENC[PKCS7,MIIBiQY+base64==]")).toBe(true);
    expect(ENCRYPTED_VALUE_PATTERN.test("ENC[GPG,encrypted+data/here=]")).toBe(true);
  });

  it("rejects non-ENC strings", () => {
    expect(ENCRYPTED_VALUE_PATTERN.test("plain text")).toBe(false);
    expect(ENCRYPTED_VALUE_PATTERN.test("ENC[]")).toBe(false);
    expect(ENCRYPTED_VALUE_PATTERN.test("ENC[nocomma]")).toBe(false);
  });

  it("matches ENC blocks embedded in larger strings", () => {
    expect(ENCRYPTED_VALUE_PATTERN.test("key: ENC[PKCS7,abc123]")).toBe(true);
  });
});

describe("ENCRYPTED_VALUE_PATTERN_GLOBAL", () => {
  it("finds multiple ENC blocks", () => {
    const text = "a: ENC[PKCS7,aaa] b: ENC[PKCS7,bbb]";
    const matches = text.match(ENCRYPTED_VALUE_PATTERN_GLOBAL);
    expect(matches).toHaveLength(2);
  });
});

describe("ENCRYPTED_VALUE_PATTERN_MULTILINE", () => {
  it("matches ENC blocks with whitespace in the encoded content", () => {
    const block = "ENC[PKCS7,MIIBiQY\n  JKoZIhvcN\n  AQcDoII=]";
    ENCRYPTED_VALUE_PATTERN_MULTILINE.lastIndex = 0;
    expect(ENCRYPTED_VALUE_PATTERN_MULTILINE.test(block)).toBe(true);
  });
});

describe("DECRYPTED_VALUE_PATTERN", () => {
  it("matches DEC blocks", () => {
    expect(DECRYPTED_VALUE_PATTERN.test("DEC::PKCS7[secret]!")).toBe(true);
    expect(DECRYPTED_VALUE_PATTERN.test("DEC(1)::PKCS7[secret]!")).toBe(true);
  });

  it("rejects non-DEC strings", () => {
    expect(DECRYPTED_VALUE_PATTERN.test("plain text")).toBe(false);
    expect(DECRYPTED_VALUE_PATTERN.test("DEC[wrong]")).toBe(false);
  });
});

describe("YAML_KEY_VALUE_LINE", () => {
  it("matches simple key-value pairs", () => {
    const match = YAML_KEY_VALUE_LINE.exec("key: value");
    expect(match).not.toBeNull();
    expect(match![1]).toBe("key: ");
    expect(match![2]).toBe("value");
  });

  it("matches indented keys", () => {
    const match = YAML_KEY_VALUE_LINE.exec("  nested_key: some value");
    expect(match).not.toBeNull();
    expect(match![1]).toBe("  nested_key: ");
    expect(match![2]).toBe("some value");
  });

  it("matches keys with dots, hyphens, and slashes", () => {
    expect(YAML_KEY_VALUE_LINE.test("my.dotted-key/path: val")).toBe(true);
  });

  it("rejects lines without key-value structure", () => {
    expect(YAML_KEY_VALUE_LINE.test("---")).toBe(false);
    expect(YAML_KEY_VALUE_LINE.test("# comment")).toBe(false);
    expect(YAML_KEY_VALUE_LINE.test("- list item")).toBe(false);
  });

  it("matches keys with trailing space", () => {
    const match = YAML_KEY_VALUE_LINE.exec("key: ");
    expect(match).not.toBeNull();
    expect(match![2].trim()).toBe("");
  });
});
