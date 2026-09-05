import { afterEach, expect, it, vi } from 'vitest';
import { DEFAULT_BOARD_STATE, BOARD_WIDTH, BOARD_HEIGHT } from './constants';
import { createBoardGif } from './downloadBoard';

const fallback = vi.hoisted(() => vi.fn());
vi.mock('./exportBoard', () => ({ encodeBoardGif: fallback }));
const options = {
  ...DEFAULT_BOARD_STATE,
  boardWidth: BOARD_WIDTH,
  boardHeight: BOARD_HEIGHT,
  playbackRate: 1
};
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it('uses the main thread fallback when workers are unavailable', async () => {
  vi.stubGlobal('Worker', undefined);
  const blob = new Blob(['GIF89a'], { type: 'image/gif' });
  fallback.mockResolvedValueOnce(blob);
  expect(await createBoardGif(options)).toBe(blob);
  expect(fallback).toHaveBeenCalledWith(options);
});

it('terminates the worker after a successful export', async () => {
  const blob = new Blob(['GIF89a'], { type: 'image/gif' });
  const terminate = vi.fn();
  const postMessage = vi.fn(function (this: {
    onmessage: (event: { data: { blob: Blob } }) => void;
  }) {
    queueMicrotask(() => this.onmessage({ data: { blob } }));
  });
  vi.stubGlobal('OffscreenCanvas', class {});
  vi.stubGlobal(
    'Worker',
    class {
      terminate = terminate;
      postMessage = postMessage;
    }
  );
  expect(await createBoardGif(options)).toBe(blob);
  expect(postMessage).toHaveBeenCalledWith(options);
  expect(terminate).toHaveBeenCalledTimes(1);
  expect(fallback).not.toHaveBeenCalled();
});

it('terminates and reports worker startup failure', async () => {
  const terminate = vi.fn();
  vi.stubGlobal('OffscreenCanvas', class {});
  vi.stubGlobal(
    'Worker',
    class {
      terminate = terminate;
      onerror = () => {};
      postMessage() {
        queueMicrotask(() => this.onerror());
      }
    }
  );
  await expect(createBoardGif(options)).rejects.toThrow('The GIF worker could not run.');
  expect(terminate).toHaveBeenCalledTimes(1);
});
