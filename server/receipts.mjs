// Atomic reservation BEFORE a provider call. No inquiry text or personal addresses are stored.
export function blobReceipts(getStore) {
  return {
    async claim(key) {
      const store = getStore();
      const put = await store.setJSON(
        key,
        { state: 'pending', at: new Date().toISOString() },
        { onlyIfNew: true },
      );
      if (put.modified) return 'new';
      return (await store.get(key, { type: 'json', consistency: 'strong' }))?.state || 'pending';
    },
    async accept(key, sid) {
      await getStore().setJSON(key, { state: 'accepted', sid, at: new Date().toISOString() });
    },
    async release(key) {
      await getStore().delete(key);
    },
  };
}
