export const EYAML_SCHEME = "eyaml-decrypted";

export const CONFIG_SECTION = "eyaml";

export const ENCRYPTED_VALUE_PATTERN = /ENC\[[\w]+,[^\]]+\]/;
export const ENCRYPTED_VALUE_PATTERN_GLOBAL = /ENC\[[\w]+,[^\]]+\]/g;
export const ENCRYPTED_VALUE_PATTERN_MULTILINE = /ENC\[\w+,[A-Za-z0-9+/=\s]+\]/g;
export const DECRYPTED_VALUE_PATTERN = /DEC(?:\(\d+\))?::[\w]+\[[^\]]*\]!/;

export const YAML_KEY_VALUE_LINE = /^(\s*[\w.\-/]+\s*:\s*)(.+)$/;

export enum Command {
  ToggleFile = "eyaml.toggleFile",
  DecryptFile = "eyaml.decryptFile",
  EncryptValue = "eyaml.encryptValue",
  DecryptValue = "eyaml.decryptValue",
  EncryptAllValues = "eyaml.encryptAllValues",
  DecryptAllValues = "eyaml.decryptAllValues",
}
