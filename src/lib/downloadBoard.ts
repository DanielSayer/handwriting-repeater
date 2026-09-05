import type { ExportBoardOptions } from './types';

export async function createBoardGif(options: ExportBoardOptions): Promise<Blob> {
  if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') {
    const { encodeBoardGif } = await import('./exportBoard');
    return encodeBoardGif(options);
  }

  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./exportBoard.worker.ts', import.meta.url), {
      type: 'module'
    });
    worker.onmessage = (event: MessageEvent<{ blob?: Blob; error?: string }>) => {
      worker.terminate();
      if (event.data.blob) resolve(event.data.blob);
      else reject(new Error(event.data.error || 'The GIF could not be encoded.'));
    };
    worker.onerror = () => {
      worker.terminate();
      reject(new Error('The GIF worker could not run.'));
    };
    worker.postMessage(options);
  });
}

export async function downloadBoardGif(options: ExportBoardOptions): Promise<void> {
  const blob = await createBoardGif(options);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = 'my-handwriting.gif';
  link.href = url;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
