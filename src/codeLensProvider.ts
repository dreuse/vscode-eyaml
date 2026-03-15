import * as vscode from "vscode";
import {
  Command,
  CONFIG_SECTION,
  ENCRYPTED_VALUE_PATTERN,
  ENCRYPTED_VALUE_PATTERN_MULTILINE,
  YAML_KEY_VALUE_LINE,
} from "./constants";

function isCodeLensEnabled(): boolean {
  return vscode.workspace.getConfiguration(CONFIG_SECTION).get<boolean>("codeLens", false);
}

function isEyamlExtension(uri: vscode.Uri): boolean {
  return uri.fsPath.endsWith(".eyaml");
}

export class EyamlCodeLensProvider implements vscode.CodeLensProvider {
  private changeEmitter = new vscode.EventEmitter<void>();
  readonly onDidChangeCodeLenses = this.changeEmitter.event;

  constructor() {
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration(`${CONFIG_SECTION}.codeLens`)) {
        this.changeEmitter.fire();
      }
    });
  }

  provideCodeLenses(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken,
  ): vscode.CodeLens[] {
    if (!isCodeLensEnabled()) return [];
    if (document.uri.scheme !== "file") return [];

    const fullText = document.getText();
    const hasEncBlocks = ENCRYPTED_VALUE_PATTERN.test(fullText);
    if (!hasEncBlocks && !isEyamlExtension(document.uri)) return [];

    const lenses: vscode.CodeLens[] = [];

    this.addDecryptLenses(document, fullText, lenses);
    this.addEncryptLenses(document, lenses);

    return lenses;
  }

  private addDecryptLenses(
    document: vscode.TextDocument,
    fullText: string,
    lenses: vscode.CodeLens[],
  ): void {
    ENCRYPTED_VALUE_PATTERN_MULTILINE.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = ENCRYPTED_VALUE_PATTERN_MULTILINE.exec(fullText)) !== null) {
      const startPos = document.positionAt(match.index);
      const endPos = document.positionAt(match.index + match[0].length);
      const range = new vscode.Range(startPos, endPos);

      lenses.push(
        new vscode.CodeLens(new vscode.Range(startPos, startPos), {
          title: "Decrypt",
          command: Command.DecryptValue,
          arguments: [range],
        }),
      );
    }
  }

  private addEncryptLenses(
    document: vscode.TextDocument,
    lenses: vscode.CodeLens[],
  ): void {
    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i);
      const match = YAML_KEY_VALUE_LINE.exec(line.text);
      if (!match) continue;

      const rawValue = match[2].trimEnd();
      if (!rawValue || !rawValue.trim()) continue;
      if (ENCRYPTED_VALUE_PATTERN.test(rawValue)) continue;

      const trimmed = rawValue.trim();
      if (trimmed === "|" || trimmed === ">" || trimmed === "|+" || trimmed === ">-") continue;
      if (trimmed.startsWith("&") || trimmed.startsWith("*")) continue;
      if (trimmed === "~" || trimmed === "null" || trimmed === "true" || trimmed === "false") continue;

      const prefix = match[1];
      const valueStart = prefix.length;
      const trimmedEnd = prefix.length + rawValue.length;
      const valueRange = new vscode.Range(i, valueStart, i, trimmedEnd);

      lenses.push(
        new vscode.CodeLens(new vscode.Range(i, 0, i, 0), {
          title: "Encrypt",
          command: Command.EncryptValue,
          arguments: [valueRange],
        }),
      );
    }
  }
}
