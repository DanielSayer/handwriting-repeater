import { encodeBoardGif } from './exportBoard';
import type { ExportBoardOptions } from './types';

self.onmessage = async (event: MessageEvent<ExportBoardOptions>) => {
  try {
    self.postMessage({ blob: await encodeBoardGif(event.data) });
  } catch {
    self.postMessage({ error: 'The GIF could not be encoded.' });
  }
};
