# Hiera eyaml for VS Code

Transparent editing of [hiera-eyaml](https://github.com/voxpupuli/hiera-eyaml) encrypted YAML files. Auto-decrypts on open, auto-encrypts on save.

## Features

- **Auto-decrypt on open** — `.eyaml` files and `.yaml`/`.yml` files containing `ENC[]` blocks are automatically decrypted into a virtual editor
- **Save-back encryption** — edits in the decrypted view are re-encrypted and written back to the original file
- **Toggle view** — switch between encrypted and decrypted views of any file
- **Per-value encrypt/decrypt** — encrypt or decrypt individual YAML values via cursor, selection, context menu, or CodeLens
- **Bulk operations** — encrypt or decrypt all values in a file at once
- **Auto-discovery** — finds the `eyaml` binary and PKCS7 keys automatically from common locations

## Prerequisites

- [hiera-eyaml](https://github.com/voxpupuli/hiera-eyaml) installed and available on your PATH (or configure `eyaml.binPath`)
- PKCS7 keypair for encryption/decryption

## Installation

Install from the VS Code Marketplace or search for "Hiera eyaml" in the Extensions view.

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `eyaml.enabled` | `true` | Enable/disable the extension |
| `eyaml.binPath` | `"eyaml"` | Path to the eyaml binary |
| `eyaml.privateKeyPath` | `""` | Path to the PKCS7 private key (empty = auto-discover) |
| `eyaml.publicKeyPath` | `""` | Path to the PKCS7 public key (empty = auto-discover) |
| `eyaml.encryptionMethod` | `"pkcs7"` | Encryption method |
| `eyaml.filePatterns` | `["**/*.eyaml"]` | Glob patterns for files to auto-decrypt on open |
| `eyaml.autoDecryptYaml` | `true` | Auto-decrypt `.yaml`/`.yml` files containing `ENC[]` blocks |
| `eyaml.codeLens` | `false` | Show Encrypt/Decrypt CodeLens above YAML values |

### Key auto-discovery

If key paths are not configured, the extension searches these locations:

- `{workspace}/keys/`
- `~/.eyaml/`
- `/etc/puppetlabs/puppet/eyaml/` (Linux/macOS)

### Binary auto-discovery

If `eyaml.binPath` is left as `"eyaml"`, the extension checks:

- `/opt/puppetlabs/bolt/bin/eyaml`
- `/opt/puppetlabs/puppet/bin/eyaml`
- `~/.gem/ruby/bin/eyaml`
- `/usr/local/bin/eyaml`
- `/usr/bin/eyaml`

On Windows, equivalent paths with `.bat` extensions are checked.

## Commands

| Command | Description |
|---------|-------------|
| `eyaml: Toggle Encrypted/Decrypted View` | Switch between encrypted and decrypted views |
| `eyaml: Decrypt Current File` | Open a decrypted view of the current file |
| `eyaml: Encrypt Value` | Encrypt the YAML value at cursor or selection |
| `eyaml: Decrypt Value` | Decrypt the `ENC[]` block at cursor or selection |
| `eyaml: Encrypt All Values` | Encrypt all plaintext values in the file |
| `eyaml: Decrypt All Values` | Decrypt all `ENC[]` blocks in the file |

## How it works

The extension uses a virtual filesystem provider (`eyaml-decrypted://`) to display decrypted content. When you open an eyaml file:

1. The original encrypted file is read
2. All `ENC[...]` blocks are decrypted via the `eyaml` CLI
3. A virtual document is created with the decrypted content
4. Edits to the virtual document are detected, re-encrypted, and saved back to the original file

This approach keeps the original encrypted file untouched on disk while providing a seamless editing experience.

## License

[MIT](LICENSE)
