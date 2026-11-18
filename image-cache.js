"use strict";

// Keep downloaded bytes on disk without decoding every full-size poster.
class GuideImageCache {
  constructor({ storage = globalThis.caches, fetcher = globalThis.fetch.bind(globalThis), timeout = 20000, onProgress = () => {} } = {}) {
    this.fetcher = fetcher;
    this.timeout = timeout;
    this.onProgress = onProgress;
    this.cache = storage ? storage.open("cr-guide-posters-v1").catch(() => null) : Promise.resolve(null);
    this.ready = new Set();
    this.failed = new Set();
    this.pending = new Map();
    this.queue = [];
    this.active = 0;
    this.background = 0;
    this.total = 0;
  }

  progress() {
    this.onProgress({ ready: this.ready.size, failed: this.failed.size, total: this.total, pending: this.pending.size });
  }

  load(url, priority = false) {
    if (this.ready.has(url)) return Promise.resolve();
    const existing = this.pending.get(url);
    if (existing) {
      if (priority) existing.priority = true;
      this.drain();
      return existing.promise;
    }
    const task = { url, priority };
    task.promise = new Promise((resolve, reject) => { task.resolve = resolve; task.reject = reject; });
    this.failed.delete(url);
    this.pending.set(url, task);
    this.queue.push(task);
    this.progress();
    this.drain();
    return task.promise;
  }

  all(urls) {
    const unique = [...new Set(urls)];
    this.total = unique.length;
    this.progress();
    return Promise.allSettled(unique.map((url) => this.load(url)));
  }

  drain() {
    while (this.active < 3 && this.queue.length) {
      let index = this.queue.findIndex((task) => task.priority);
      if (index < 0) {
        // Leave one connection available for the selected slide.
        if (this.background >= 2) break;
        index = 0;
      }
      const task = this.queue.splice(index, 1)[0];
      const background = !task.priority;
      this.active += 1;
      if (background) this.background += 1;
      this.download(task.url).then(() => {
        this.ready.add(task.url);
        task.resolve();
      }, (error) => {
        this.failed.add(task.url);
        task.reject(error);
      }).finally(() => {
        this.pending.delete(task.url);
        this.active -= 1;
        if (background) this.background -= 1;
        this.progress();
        this.drain();
      });
    }
  }

  async download(url) {
    const cache = await this.cache;
    if (cache) {
      try { if (await cache.match(url)) return; } catch (_) {}
    }
    let error;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeout);
      try {
        const response = await this.fetcher(url, { signal: controller.signal, cache: "force-cache" });
        if (!response.ok) throw new Error("Image request failed: " + response.status);
        // A full body read detects interrupted downloads before reporting ready.
        const blob = await response.blob();
        if (!blob.size) throw new Error("Empty image");
        if (cache) {
          try { await cache.put(url, new Response(blob, { headers: { "Content-Type": blob.type || "image/png" } })); } catch (_) {}
        }
        return;
      } catch (cause) { error = cause; }
      finally { clearTimeout(timer); }
    }
    throw error;
  }

  async source(url) {
    await this.load(url, true);
    const cache = await this.cache;
    if (cache) {
      try {
        const response = await cache.match(url);
        if (response) return URL.createObjectURL(await response.blob());
      } catch (_) {}
    }
    // HTTP caching still works when private browsing or storage limits block Cache Storage.
    return url;
  }
}

if (typeof module !== "undefined" && module.exports) module.exports = GuideImageCache;
else globalThis.GuideImageCache = GuideImageCache;
