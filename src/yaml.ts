const YAML_SPECIAL_CHARS = /[:#\[{}"'|>]/;

export function quoteIfNeeded(value: string): string {
  if (YAML_SPECIAL_CHARS.test(value) || value !== value.trim()) {
    const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    return `"${escaped}"`;
  }
  return value;
}

export function stripQuotes(value: string): string {
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replace(/''/g, "'");
  }
  return value;
}
