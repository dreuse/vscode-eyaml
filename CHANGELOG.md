# Changelog

## 0.1.3

### Fixed

- Toggling to decrypted view now always re-decrypts from disk instead of showing stale cached content
- Encrypted values (`ENC[PKCS7,...]`) are now properly quoted in YAML to prevent parser warnings
- File watcher invalidates decrypted cache when the underlying file changes externally (git pull, other editors)

## 0.1.0

Initial release.

- Auto-decrypt `.eyaml` files on open using a virtual filesystem provider
- Auto-detect and decrypt `.yaml`/`.yml` files containing `ENC[]` blocks
- Toggle between encrypted and decrypted views
- Encrypt/decrypt individual values via cursor position, selection, or CodeLens
- Encrypt/decrypt all values in a file (bulk operations)
- Context menu entries for encrypt/decrypt commands
- Configurable eyaml binary path with auto-discovery
- Configurable PKCS7 key paths with workspace/home directory search
- Configurable file patterns for auto-decryption
- Status bar indicator showing encryption state
- Save-back support: edits in the decrypted view are re-encrypted and saved to the original file
