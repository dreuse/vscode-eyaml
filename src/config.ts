import * as vscode from "vscode";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir, platform } from "node:os";
import { CONFIG_SECTION } from "./constants";

export interface EyamlConfig {
  enabled: boolean;
  binPath: string;
  privateKeyPath: string;
  publicKeyPath: string;
  encryptionMethod: string;
  filePatterns: string[];
  autoDecryptYaml: boolean;
}

const IS_WINDOWS = platform() === "win32";

function getBinSearchPaths(): string[] {
  if (IS_WINDOWS) {
    const appData = process.env["LOCALAPPDATA"] ?? join(homedir(), "AppData", "Local");
    return [
      join(appData, "puppetlabs", "bolt", "bin", "eyaml.bat"),
      join("C:", "Program Files", "Puppet Labs", "Bolt", "bin", "eyaml.bat"),
      join(homedir(), ".gem", "bin", "eyaml.bat"),
    ];
  }

  return [
    "/opt/puppetlabs/bolt/bin/eyaml",
    "/opt/puppetlabs/puppet/bin/eyaml",
    join(homedir(), ".gem", "ruby", "bin", "eyaml"),
    "/usr/local/bin/eyaml",
    "/usr/bin/eyaml",
  ];
}

function resolveBinPath(explicit: string): string {
  if (explicit !== "eyaml") return explicit;

  for (const candidate of getBinSearchPaths()) {
    if (existsSync(candidate)) return candidate;
  }

  return explicit;
}

function getKeySearchDirs(): string[] {
  const dirs: string[] = [];

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders) {
    for (const folder of workspaceFolders) {
      dirs.push(join(folder.uri.fsPath, "keys"));
    }
  }

  dirs.push(join(homedir(), ".eyaml"));

  if (!IS_WINDOWS) {
    dirs.push("/etc/puppetlabs/puppet/eyaml");
  }

  return dirs;
}

function resolveKeyPath(
  explicit: string,
  filename: string,
): string {
  if (explicit) return explicit;

  for (const dir of getKeySearchDirs()) {
    const candidate = join(dir, filename);
    if (existsSync(candidate)) return candidate;
  }

  return "";
}

export function getConfig(): EyamlConfig {
  const section = vscode.workspace.getConfiguration(CONFIG_SECTION);

  const privateKeyExplicit = section.get<string>("privateKeyPath", "");
  const publicKeyExplicit = section.get<string>("publicKeyPath", "");

  return {
    enabled: section.get<boolean>("enabled", true),
    binPath: resolveBinPath(section.get<string>("binPath", "eyaml")),
    privateKeyPath: resolveKeyPath(privateKeyExplicit, "private_key.pkcs7.pem"),
    publicKeyPath: resolveKeyPath(publicKeyExplicit, "public_key.pkcs7.pem"),
    encryptionMethod: section.get<string>("encryptionMethod", "pkcs7"),
    filePatterns: section.get<string[]>("filePatterns", ["**/*.eyaml"]),
    autoDecryptYaml: section.get<boolean>("autoDecryptYaml", true),
  };
}

export function buildKeyArgs(config: EyamlConfig): string[] {
  const args: string[] = [];

  if (config.privateKeyPath) {
    args.push("--pkcs7-private-key", config.privateKeyPath);
  }
  if (config.publicKeyPath) {
    args.push("--pkcs7-public-key", config.publicKeyPath);
  }

  return args;
}
