import * as vscode from "vscode";
import { getConfig } from "./config";
import { Command, EYAML_SCHEME } from "./constants";
import { isDecryptedFile, shouldAutoDecrypt } from "./detection";
import { EyamlFileSystemProvider } from "./fileManager";
import { createStatusBarItem, updateStatusBar } from "./statusBar";
import { encryptValueAtCursor, decryptValueAtCursor } from "./propertyCommands";
import { encryptAllValues, decryptAllValues } from "./bulkCommands";
import { EyamlCodeLensProvider } from "./codeLensProvider";

let provider: EyamlFileSystemProvider;
let suppressAutoDecrypt = false;
const decryptingPaths = new Set<string>();

export function activate(context: vscode.ExtensionContext): void {
  provider = new EyamlFileSystemProvider();

  context.subscriptions.push(
    vscode.workspace.registerFileSystemProvider(EYAML_SCHEME, provider, {
      isCaseSensitive: true,
    }),
  );

  const statusBarItem = createStatusBarItem(provider);
  context.subscriptions.push(statusBarItem);

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(handleEditorChange),
  );

  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument(handleClose),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(Command.ToggleFile, toggleFile),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(Command.DecryptFile, decryptCurrentFile),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(Command.EncryptValue, encryptValueAtCursor),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(Command.DecryptValue, decryptValueAtCursor),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(Command.EncryptAllValues, encryptAllValues),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(Command.DecryptAllValues, decryptAllValues),
  );

  const codeLensProvider = new EyamlCodeLensProvider();
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { language: "yaml", scheme: "file" },
      codeLensProvider,
    ),
  );

  updateStatusBar(vscode.window.activeTextEditor);
}

export function deactivate(): void {}

async function handleEditorChange(
  editor: vscode.TextEditor | undefined,
): Promise<void> {
  updateStatusBar(editor);
  if (!editor || suppressAutoDecrypt) return;

  const config = getConfig();
  const uri = editor.document.uri;
  const content = editor.document.getText();

  if (!shouldAutoDecrypt(uri, content, config)) return;

  const filePath = uri.fsPath;
  if (decryptingPaths.has(filePath)) return;
  decryptingPaths.add(filePath);

  try {
    const decryptedUri = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Decrypting eyaml...",
        cancellable: false,
      },
      () => provider.openDecrypted(uri, config),
    );

    await vscode.window.showTextDocument(decryptedUri, {
      viewColumn: editor.viewColumn,
    });
  } catch (error) {
    showError("Failed to decrypt file", error);
  } finally {
    decryptingPaths.delete(filePath);
  }
}

function handleClose(document: vscode.TextDocument): void {
  if (!isDecryptedFile(document.uri)) return;
  provider.cleanup(document.uri);
}

async function toggleFile(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const uri = editor.document.uri;

  if (isDecryptedFile(uri)) {
    const originalUri = provider.getOriginalUri(uri);
    suppressAutoDecrypt = true;
    try {
      await vscode.window.showTextDocument(originalUri, {
        viewColumn: editor.viewColumn,
        preview: false,
      });
    } finally {
      suppressAutoDecrypt = false;
    }
  } else if (provider.hasEntry(uri)) {
    const decryptedUri = provider.getDecryptedUri(uri);
    await vscode.window.showTextDocument(decryptedUri, {
      viewColumn: editor.viewColumn,
    });
  } else {
    await decryptCurrentFile();
  }
}

async function decryptCurrentFile(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const config = getConfig();
  const uri = editor.document.uri;

  try {
    const decryptedUri = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Decrypting eyaml...",
        cancellable: false,
      },
      () => provider.openDecrypted(uri, config),
    );

    await vscode.window.showTextDocument(decryptedUri, {
      viewColumn: editor.viewColumn,
    });
  } catch (error) {
    showError("Failed to decrypt file", error);
  }
}

function showError(message: string, error: unknown): void {
  const detail = error instanceof Error ? error.message : String(error);

  if (detail.includes("ENOENT") || detail.includes("not found")) {
    vscode.window.showErrorMessage(
      `${message}: eyaml binary not found. Install hiera-eyaml or set eyaml.binPath.`,
    );
  } else if (detail.includes("key") || detail.includes("certificate")) {
    vscode.window.showErrorMessage(
      `${message}: Key error. Check eyaml.privateKeyPath and eyaml.publicKeyPath settings. (${detail})`,
    );
  } else {
    vscode.window.showErrorMessage(`${message}: ${detail}`);
  }
}
