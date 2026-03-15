import { describe, it, expect } from "vitest";
import { quoteIfNeeded, stripQuotes } from "../yaml";

describe("quoteIfNeeded", () => {
  it("returns plain values unchanged", () => {
    expect(quoteIfNeeded("hello")).toBe("hello");
    expect(quoteIfNeeded("simple value")).toBe("simple value");
    expect(quoteIfNeeded("123")).toBe("123");
  });

  it("quotes values containing YAML special characters", () => {
    expect(quoteIfNeeded("value: with colon")).toBe('"value: with colon"');
    expect(quoteIfNeeded("value # comment")).toBe('"value # comment"');
    expect(quoteIfNeeded("[list]")).toBe('"[list]"');
    expect(quoteIfNeeded("{map}")).toBe('"{map}"');
    expect(quoteIfNeeded("pipe | char")).toBe('"pipe | char"');
    expect(quoteIfNeeded("greater > than")).toBe('"greater > than"');
  });

  it("quotes values with leading or trailing whitespace", () => {
    expect(quoteIfNeeded(" leading")).toBe('" leading"');
    expect(quoteIfNeeded("trailing ")).toBe('"trailing "');
  });

  it("escapes backslashes and double quotes", () => {
    expect(quoteIfNeeded('has "quotes"')).toBe('"has \\"quotes\\""');
    expect(quoteIfNeeded("value: here")).toBe('"value: here"');
  });

  it("handles empty string", () => {
    expect(quoteIfNeeded("")).toBe("");
  });
});

describe("stripQuotes", () => {
  it("strips double quotes and unescapes", () => {
    expect(stripQuotes('"hello"')).toBe("hello");
    expect(stripQuotes('"has \\"nested\\" quotes"')).toBe('has "nested" quotes');
    expect(stripQuotes('"has \\\\ backslash"')).toBe("has \\ backslash");
  });

  it("strips single quotes and unescapes", () => {
    expect(stripQuotes("'hello'")).toBe("hello");
    expect(stripQuotes("'it''s escaped'")).toBe("it's escaped");
  });

  it("returns unquoted values unchanged", () => {
    expect(stripQuotes("plain")).toBe("plain");
    expect(stripQuotes("123")).toBe("123");
    expect(stripQuotes("")).toBe("");
  });

  it("does not strip mismatched quotes", () => {
    expect(stripQuotes("\"mixed'")).toBe("\"mixed'");
    expect(stripQuotes("'mixed\"")).toBe("'mixed\"");
  });
});
