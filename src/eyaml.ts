import { promisify } from "node:util";
import { execFile as execFileCb } from "node:child_process";
import { writeFile, unlink } from "node:fs/promises";
import { tmpdir, platform } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { EyamlConfig, buildKeyArgs } from "./config";

const execFile = promisify(execFileCb);
const IS_WINDOWS = platform() === "win32";

function tempPath(): string {
  const id = randomBytes(8).toString("hex");
  return join(tmpdir(), `eyaml-${id}.yaml`);
}

function execEyaml(binPath: string, args: string[]) {
  return execFile(binPath, args, { shell: IS_WINDOWS });
}

export async function decryptFile(
  filePath: string,
  config: EyamlConfig,
): Promise<string> {
  const args = ["decrypt", "-e", filePath, ...buildKeyArgs(config)];
  const { stdout } = await execEyaml(config.binPath, args);
  return stdout;
}

export async function encryptContent(
  content: string,
  config: EyamlConfig,
): Promise<string> {
  const tmp = tempPath();
  try {
    await writeFile(tmp, content, "utf-8");
    const args = ["encrypt", "-e", tmp, ...buildKeyArgs(config)];
    const { stdout } = await execEyaml(config.binPath, args);
    return stdout;
  } finally {
    await unlink(tmp).catch(() => {});
  }
}

export async function encryptString(
  plaintext: string,
  config: EyamlConfig,
): Promise<string> {
  const args = ["encrypt", "-s", plaintext, "-o", "string", ...buildKeyArgs(config)];
  const { stdout } = await execEyaml(config.binPath, args);
  return stdout.trim();
}

export async function decryptString(
  encrypted: string,
  config: EyamlConfig,
): Promise<string> {
  const args = ["decrypt", "-s", encrypted, ...buildKeyArgs(config)];
  const { stdout } = await execEyaml(config.binPath, args);
  return stdout.trim();
}
