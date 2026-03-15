import * as vscode from "vscode";
import picomatch from "picomatch";
import { ENCRYPTED_VALUE_PATTERN, EYAML_SCHEME } from "./constants";
import { EyamlConfig } from "./config";

export function isEyamlFile(uri: vscode.Uri, config: EyamlConfig): boolean {
  const relativePath = vscode.workspace.asRelativePath(uri, false);
  return config.filePatterns.some((pattern) => picomatch.isMatch(relativePath, pattern));
}

export function containsEncryptedValues(content: string): boolean {
  return ENCRYPTED_VALUE_PATTERN.test(content);
}

export function isDecryptedFile(uri: vscode.Uri): boolean {
  return uri.scheme === EYAML_SCHEME;
}

export function shouldAutoDecrypt(
  uri: vscode.Uri,
  content: string,
  config: EyamlConfig,
): boolean {
  if (!config.enabled) return false;
  if (uri.scheme !== "file") return false;

  if (isEyamlFile(uri, config)) return true;
  if (config.autoDecryptYaml && containsEncryptedValues(content)) return true;

  return false;
}
