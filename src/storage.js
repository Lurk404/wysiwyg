// The editor was first built as a Claude artifact, where `window.storage` is a
// built-in async key/value store. Outside that sandbox it doesn't exist, so the
// editor would silently stop saving between visits. This shim provides the same
// async get/set/delete interface on top of localStorage, so StyledEditor.jsx
// runs unchanged in both places.
//
// It only installs itself when no `window.storage` is already present.

export function installStorageShim() {
  if (typeof window === "undefined" || window.storage) return;

  const PREFIX = "styled-editor:";

  window.storage = {
    async get(key) {
      const value = localStorage.getItem(PREFIX + key);
      return value === null ? null : { key, value };
    },
    async set(key, value) {
      localStorage.setItem(PREFIX + key, value);
      return { key, value };
    },
    async delete(key) {
      localStorage.removeItem(PREFIX + key);
      return { key, deleted: true };
    },
  };
}
