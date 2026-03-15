import * as vscode from "vscode";
import { EYAML_SCHEME } from "./constants";
import { EyamlConfig, getConfig } from "./config";
import { decryptFile, encryptContent } from "./eyaml";
import { md5 } from "./checksum";

interface DecryptedEntry {
  content: Uint8Array;
  checksum: string;
  mtime: number;
}

export class EyamlFileSystemProvider implements vscode.FileSystemProvider {
  private entries = new Map<string, DecryptedEntry>();
  private emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
  readonly onDidChangeFile = this.emitter.event;

  watch(): vscode.Disposable {
    return new vscode.Disposable(() => {});
  }

  stat(uri: vscode.Uri): vscode.FileStat {
    const entry = this.entries.get(uri.path);
    if (!entry) throw vscode.FileSystemError.FileNotFound(uri);
    return {
      type: vscode.FileType.File,
      ctime: 0,
      mtime: entry.mtime,
      size: entry.content.byteLength,
    };
  }

  readFile(uri: vscode.Uri): Uint8Array {
    const entry = this.entries.get(uri.path);
    if (!entry) throw vscode.FileSystemError.FileNotFound(uri);
    return entry.content;
  }

  async writeFile(uri: vscode.Uri, content: Uint8Array): Promise<void> {
    const entry = this.entries.get(uri.path);
    if (!entry) throw vscode.FileSystemError.FileNotFound(uri);

    const textContent = Buffer.from(content).toString("utf-8");
    const newChecksum = md5(textContent);

    if (newChecksum === entry.checksum) return;

    const config = getConfig();
    const encrypted = await encryptContent(textContent, config);
    const originalUri = uri.with({ scheme: "file" });
    await vscode.workspace.fs.writeFile(
      originalUri,
      Buffer.from(encrypted, "utf-8"),
    );

    entry.content = content;
    entry.checksum = newChecksum;
    entry.mtime = Date.now();

    this.emitter.fire([{ type: vscode.FileChangeType.Changed, uri }]);
  }

  readDirectory(): [string, vscode.FileType][] {
    throw vscode.FileSystemError.NoPermissions();
  }

  createDirectory(): void {
    throw vscode.FileSystemError.NoPermissions();
  }

  delete(uri: vscode.Uri): void {
    this.entries.delete(uri.path);
  }

  rename(): void {
    throw vscode.FileSystemError.NoPermissions();
  }

  async openDecrypted(
    originalUri: vscode.Uri,
    config: EyamlConfig,
  ): Promise<vscode.Uri> {
    const decryptedContent = await decryptFile(originalUri.fsPath, config);
    const checksum = md5(decryptedContent);
    const contentBytes = Buffer.from(decryptedContent, "utf-8");
    const decryptedUri = originalUri.with({ scheme: EYAML_SCHEME });

    this.entries.set(decryptedUri.path, {
      content: contentBytes,
      checksum,
      mtime: Date.now(),
    });

    return decryptedUri;
  }

  hasEntry(originalUri: vscode.Uri): boolean {
    const decryptedUri = originalUri.with({ scheme: EYAML_SCHEME });
    return this.entries.has(decryptedUri.path);
  }

  getDecryptedUri(originalUri: vscode.Uri): vscode.Uri {
    return originalUri.with({ scheme: EYAML_SCHEME });
  }

  getOriginalUri(decryptedUri: vscode.Uri): vscode.Uri {
    return decryptedUri.with({ scheme: "file" });
  }

  cleanup(uri: vscode.Uri): void {
    this.entries.delete(uri.path);
  }
}
