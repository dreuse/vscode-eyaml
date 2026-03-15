import * as vscode from "vscode";
import { Command, EYAML_SCHEME } from "./constants";
import { EyamlFileSystemProvider } from "./fileManager";

let statusBarItem: vscode.StatusBarItem;
let fileSystemProvider: EyamlFileSystemProvider;

export function createStatusBarItem(
  provider: EyamlFileSystemProvider,
): vscode.StatusBarItem {
  fileSystemProvider = provider;
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  );
  statusBarItem.command = Command.ToggleFile;
  return statusBarItem;
}

export function updateStatusBar(editor: vscode.TextEditor | undefined): void {
  if (!editor || !statusBarItem) {
    statusBarItem?.hide();
    return;
  }

  const uri = editor.document.uri;

  if (uri.scheme === EYAML_SCHEME) {
    statusBarItem.text = "$(lock) eyaml: view encrypted";
    statusBarItem.tooltip = "Switch to encrypted file";
    statusBarItem.show();
  } else if (fileSystemProvider.hasEntry(uri)) {
    statusBarItem.text = "$(unlock) eyaml: view decrypted";
    statusBarItem.tooltip = "Switch to decrypted file";
    statusBarItem.show();
  } else {
    statusBarItem.hide();
  }
}
