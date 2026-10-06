// Adapter for the pinned Tesseract.js 7 worker protocol. Owning the native worker
// lets Cancel terminate model loading as well as CPU-bound recognition.
export async function createOcrEngine(language, signal, onProgress) {
  const native = new Worker('/js/vendor/ocr/worker.min.js');
  const pending = new Map(); let sequence = 0, stopped = false;
  function terminate(reason = new DOMException('Cancelled', 'AbortError')) {
    if (stopped) return Promise.resolve();
    stopped = true; native.terminate(); signal.removeEventListener('abort', abort);
    for (const job of pending.values()) job.reject(reason);
    pending.clear(); return Promise.resolve();
  }
  const abort = () => {void terminate();};
  signal.addEventListener('abort', abort, {once: true});
  native.onerror = event => {event.preventDefault(); void terminate(Error('The local OCR engine could not start. Check your connection and browser WebAssembly support.'));};
  native.onmessageerror = () => {void terminate(Error('The OCR worker returned an unreadable result. Try a smaller page.'));};
  native.onmessage = ({data: message}) => {
    if (stopped) return;
    if (message.status === 'progress') {onProgress(message.data); return;}
    const job = pending.get(message.jobId); if (!job) return;
    pending.delete(message.jobId);
    if (message.status === 'resolve') job.resolve({data: message.data});
    else job.reject(Error(String(message.data || 'OCR failed.').slice(0, 300)));
  };
  function send(action, payload) {
    if (stopped || signal.aborted) return Promise.reject(new DOMException('Cancelled', 'AbortError'));
    const jobId = 'kalika-ocr-' + (++sequence);
    return new Promise((resolve, reject) => {
      pending.set(jobId, {resolve, reject});
      native.postMessage({workerId: 'kalika-ocr', jobId, action, payload});
    });
  }
  try {
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
    await send('load', {options: {lstmOnly: true, corePath: new URL('/js/vendor/ocr/core', location.origin).href, logging: false}});
    await send('loadLanguage', {langs: language, options: {langPath: new URL('/js/vendor/ocr/languages', location.origin).href, cacheMethod: 'none', gzip: true, lstmOnly: true}});
    await send('initialize', {langs: language, oem: 1, config: {}});
    return {recognize: (image, options, output) => send('recognize', {image, options, output}), terminate};
  } catch (error) {await terminate(error); throw error;}
}
