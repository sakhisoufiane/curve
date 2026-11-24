const v8 = require('v8');

function mb(bytes) {
  return `${(bytes / 1_048_576).toFixed(1)}MB`;
}

function createSampler(intervalMs = 5_000) {
  const START_TIME = Date.now();
  let handle = null;

  function elapsed() {
    const ms = Date.now() - START_TIME;
    const h = Math.floor(ms / 3_600_000).toString().padStart(2, '0');
    const m = Math.floor((ms % 3_600_000) / 60_000).toString().padStart(2, '0');
    const s = Math.floor((ms % 60_000) / 1_000).toString().padStart(2, '0');
    const msStr = (ms % 1_000).toString().padStart(3, '0');
    return `${h}:${m}:${s}.${msStr}`;
  }

  function logMem(label) {
    const mem = process.memoryUsage();
    const heap = v8.getHeapStatistics();
    console.log(
      `[${elapsed()}] [MEM] ${label}` +
      ` | heapUsed=${mb(mem.heapUsed)}` +
      ` | heapTotal=${mb(mem.heapTotal)}` +
      ` | rss=${mb(mem.rss)}` +
      ` | external=${mb(mem.external)}` +
      ` | heapLimit=${mb(heap.heap_size_limit)}` +
      ` | heapPeak=${mb(heap.peak_malloced_memory)}`,
    );
  }

  return {
    elapsed,
    logMem,
    start: () => { handle = setInterval(() => logMem('periodic'), intervalMs); },
    stop: () => { clearInterval(handle); handle = null; },
  };
}

module.exports = { mb, createSampler };
