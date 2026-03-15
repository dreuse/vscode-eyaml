import * as vscode from "vscode";
import { getConfig } from "./config";
import {
  ENCRYPTED_VALUE_PATTERN,
  ENCRYPTED_VALUE_PATTERN_MULTILINE,
  YAML_KEY_VALUE_LINE,
} from "./constants";
import { encryptString, decryptString } from "./eyaml";
import { quoteIfNeeded, stripQuotes } from "./yaml";

function extractValueRange(
  document: vscode.TextDocument,
  line: vscode.TextLine,
): vscode.Range | undefined {
  const match = YAML_KEY_VALUE_LINE.exec(line.text);
  if (!match) return undefined;

  const prefix = match[1];
  const rawValue = match[2];
  if (!rawValue.trim()) return undefined;

  const valueStart = prefix.length;
  const trimmedEnd = line.text.trimEnd().length;

  return new vscode.Range(line.lineNumber, valueStart, line.lineNumber, trimmedEnd);
}

function findEncBlockRange(
  document: vscode.TextDocument,
  position: vscode.Position,
): vscode.Range | undefined {
  const fullText = document.getText();
  ENCRYPTED_VALUE_PATTERN_MULTILINE.lastIndex = 0;

  let closest: vscode.Range | undefined;
  let closestDistance = Infinity;

  let match: RegExpExecArray | null;
  while ((match = ENCRYPTED_VALUE_PATTERN_MULTILINE.exec(fullText)) !== null) {
    const startPos = document.positionAt(match.index);
    const endPos = document.positionAt(match.index + match[0].length);
    const range = new vscode.Range(startPos, endPos);

    if (range.contains(position)) return range;

    const distance = Math.min(
      Math.abs(position.line - startPos.line),
      Math.abs(position.line - endPos.line),
    );
    if (distance < closestDistance) {
      closestDistance = distance;
      closest = range;
    }
  }

  return closestDistance <= 2 ? closest : undefined;
}

export async function encryptValueAtCursor(
  ...args: unknown[]
): Promise<void> {
  const range = args.find((a) => a instanceof vscode.Range) as vscode.Range | undefined;
  const activeEditor = vscode.window.activeTextEditor;
  if (!activeEditor || activeEditor.document.uri.scheme !== "file") return;

  const document = activeEditor.document;
  const config = getConfig();

  let targetRange: vscode.Range;
  let plaintext: string;

  if (range) {
    targetRange = range;
    plaintext = document.getText(range);
  } else if (!activeEditor.selection.isEmpty) {
    const selectedText = document.getText(activeEditor.selection);
    const keyValueMatch = YAML_KEY_VALUE_LINE.exec(selectedText);
    if (keyValueMatch) {
      const valueOffset = keyValueMatch[1].length;
      const absoluteStart = document.offsetAt(activeEditor.selection.start) + valueOffset;
      const rawValue = keyValueMatch[2].trimEnd();
      targetRange = new vscode.Range(
        document.positionAt(absoluteStart),
        document.positionAt(absoluteStart + rawValue.length),
      );
      plaintext = rawValue;
    } else {
      targetRange = activeEditor.selection;
      plaintext = selectedText;
    }
  } else {
    const line = document.lineAt(activeEditor.selection.active.line);
    const valueRange = extractValueRange(document, line);
    if (!valueRange) return;

    plaintext = document.getText(valueRange);
    if (ENCRYPTED_VALUE_PATTERN.test(plaintext)) return;

    targetRange = valueRange;
  }

  plaintext = plaintext.trim();
  if (!plaintext) return;

  plaintext = stripQuotes(plaintext);

  try {
    const encrypted = await encryptString(plaintext, config);
    await activeEditor.edit((editBuilder) => {
      editBuilder.replace(targetRange, encrypted);
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Failed to encrypt value: ${detail}`);
  }
}

export async function decryptValueAtCursor(
  ...args: unknown[]
): Promise<void> {
  const range = args.find((a) => a instanceof vscode.Range) as vscode.Range | undefined;
  const activeEditor = vscode.window.activeTextEditor;
  if (!activeEditor || activeEditor.document.uri.scheme !== "file") return;

  const document = activeEditor.document;
  const config = getConfig();

  let targetRange: vscode.Range;
  let encrypted: string;

  if (range) {
    targetRange = range;
    encrypted = document.getText(range);
  } else if (!activeEditor.selection.isEmpty) {
    const selectedText = document.getText(activeEditor.selection);
    const encMatch = selectedText.match(ENCRYPTED_VALUE_PATTERN);
    if (encMatch) {
      const offsetInSelection = selectedText.indexOf(encMatch[0]);
      const absoluteStart = document.offsetAt(activeEditor.selection.start) + offsetInSelection;
      targetRange = new vscode.Range(
        document.positionAt(absoluteStart),
        document.positionAt(absoluteStart + encMatch[0].length),
      );
      encrypted = encMatch[0];
    } else {
      targetRange = activeEditor.selection;
      encrypted = selectedText;
    }
  } else {
    const encRange = findEncBlockRange(document, activeEditor.selection.active);
    if (!encRange) {
      vscode.window.showInformationMessage("No ENC[...] block found at cursor.");
      return;
    }
    targetRange = encRange;
    encrypted = document.getText(encRange);
  }

  encrypted = encrypted.trim();
  if (!ENCRYPTED_VALUE_PATTERN.test(encrypted)) {
    vscode.window.showInformationMessage("Selection is not an ENC[...] block.");
    return;
  }

  try {
    const plaintext = await decryptString(encrypted, config);
    const safeValue = quoteIfNeeded(plaintext);
    await activeEditor.edit((editBuilder) => {
      editBuilder.replace(targetRange, safeValue);
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Failed to decrypt value: ${detail}`);
  }
}
