import * as vscode from "vscode";
import { getConfig } from "./config";
import {
  ENCRYPTED_VALUE_PATTERN,
  ENCRYPTED_VALUE_PATTERN_MULTILINE,
  YAML_KEY_VALUE_LINE,
} from "./constants";
import { encryptString, decryptString } from "./eyaml";
import { quoteIfNeeded, stripQuotes } from "./yaml";

interface ValueLocation {
  range: vscode.Range;
  plaintext: string;
}

function findPlaintextValues(document: vscode.TextDocument): ValueLocation[] {
  const locations: ValueLocation[] = [];

  for (let i = 0; i < document.lineCount; i++) {
    const line = document.lineAt(i);
    const match = YAML_KEY_VALUE_LINE.exec(line.text);
    if (!match) continue;

    const prefix = match[1];
    const rawValue = match[2].trimEnd();
    if (!rawValue || !rawValue.trim()) continue;
    if (ENCRYPTED_VALUE_PATTERN.test(rawValue)) continue;

    const trimmed = rawValue.trim();
    if (trimmed === "|" || trimmed === ">" || trimmed === "|+" || trimmed === ">-") continue;
    if (trimmed.startsWith("&") || trimmed.startsWith("*")) continue;
    if (trimmed === "~" || trimmed === "null" || trimmed === "true" || trimmed === "false") continue;

    const valueStart = prefix.length;
    const trimmedEnd = prefix.length + rawValue.length;
    const range = new vscode.Range(i, valueStart, i, trimmedEnd);
    const plaintext = stripQuotes(rawValue.trim());

    if (plaintext) {
      locations.push({ range, plaintext });
    }
  }

  return locations;
}

export async function encryptAllValues(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.uri.scheme !== "file") return;

  const document = editor.document;
  const config = getConfig();
  const values = findPlaintextValues(document);

  if (values.length === 0) {
    vscode.window.showInformationMessage("No unencrypted values found.");
    return;
  }

  const confirmation = await vscode.window.showInformationMessage(
    `Encrypt ${values.length} value${values.length === 1 ? "" : "s"}?`,
    { modal: true },
    "Encrypt",
  );
  if (confirmation !== "Encrypt") return;

  try {
    const encrypted = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Encrypting ${values.length} values...`,
        cancellable: false,
      },
      () => Promise.all(values.map((v) => encryptString(v.plaintext, config))),
    );

    await editor.edit((editBuilder) => {
      for (let i = 0; i < values.length; i++) {
        editBuilder.replace(values[i].range, encrypted[i]);
      }
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Failed to encrypt values: ${detail}`);
  }
}

export async function decryptAllValues(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.uri.scheme !== "file") return;

  const document = editor.document;
  const config = getConfig();
  const fullText = document.getText();

  ENCRYPTED_VALUE_PATTERN_MULTILINE.lastIndex = 0;

  const blocks: { range: vscode.Range; encrypted: string }[] = [];
  let match: RegExpExecArray | null;
  while ((match = ENCRYPTED_VALUE_PATTERN_MULTILINE.exec(fullText)) !== null) {
    const startPos = document.positionAt(match.index);
    const endPos = document.positionAt(match.index + match[0].length);
    blocks.push({
      range: new vscode.Range(startPos, endPos),
      encrypted: match[0],
    });
  }

  if (blocks.length === 0) {
    vscode.window.showInformationMessage("No ENC[...] blocks found.");
    return;
  }

  try {
    const decrypted = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Decrypting ${blocks.length} values...`,
        cancellable: false,
      },
      () => Promise.all(blocks.map((b) => decryptString(b.encrypted, config))),
    );

    await editor.edit((editBuilder) => {
      for (let i = 0; i < blocks.length; i++) {
        editBuilder.replace(blocks[i].range, quoteIfNeeded(decrypted[i]));
      }
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Failed to decrypt values: ${detail}`);
  }
}
