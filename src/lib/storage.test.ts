import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_BOARD_STATE, STORAGE_KEY } from './constants';
import { createBoardSaver, loadBoard, parseBoardState } from './storage';

const validStroke = {
  id: 'one',
  colour: '#18243d',
  width: 6,
  opacity: 1,
  points: [
    { x: 0, y: 0, elapsedMs: 0 },
    { x: 1, y: 1, elapsedMs: 100 }
  ]
};

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('saved board validation', () => {
  it('round trips the existing storage format, including recorded timing', () => {
    const board = { ...DEFAULT_BOARD_STATE, strokes: [validStroke], guideText: 'private guide' };
    vi.stubGlobal('localStorage', { getItem: vi.fn().mockReturnValue(JSON.stringify(board)) });
    expect(loadBoard()).toEqual(board);
    expect(localStorage.getItem).toHaveBeenCalledWith(STORAGE_KEY);
  });

  it('recovers valid settings while rejecting invalid shapes and values', () => {
    expect(
      parseBoardState({
        strokes: [null, validStroke, { ...validStroke, points: [{ x: NaN, y: 0 }] }],
        speed: 'fast',
        zoom: Infinity,
        repeatCount: -10,
        penType: 'bad',
        loopMode: 'false',
        guideText: 'keep this',
        pageColour: '#edf7ff',
        backgroundImage: { src: 'https://example.com/image', name: 'remote' }
      })
    ).toEqual({
      ...DEFAULT_BOARD_STATE,
      strokes: [validStroke],
      guideText: 'keep this',
      pageColour: '#edf7ff'
    });
  });

  it('keeps strokes with duplicate IDs without crashing keyed rendering', () => {
    const board = parseBoardState({
      strokes: [validStroke, validStroke, { ...validStroke, id: 'one-duplicate' }]
    });
    expect(board.strokes).toHaveLength(3);
    expect(new Set(board.strokes.map((stroke) => stroke.id)).size).toBe(3);
  });

  it.each([null, [], 'invalid', 42])('falls back safely for %s', (value) => {
    expect(parseBoardState(value)).toEqual(DEFAULT_BOARD_STATE);
  });

  it('does not share the default strokes array between boards', () => {
    const board = parseBoardState(null);
    board.strokes.push(validStroke);
    expect(parseBoardState(null).strokes).toEqual([]);
  });
});

describe('deferred persistence', () => {
  it('writes only the latest value after a burst of edits', () => {
    vi.useFakeTimers();
    const write = vi.fn();
    const saver = createBoardSaver(write);
    saver.schedule(DEFAULT_BOARD_STATE);
    vi.advanceTimersByTime(200);
    const latest = { ...DEFAULT_BOARD_STATE, speed: 5 };
    saver.schedule(latest);
    vi.advanceTimersByTime(299);
    expect(write).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(write).toHaveBeenCalledExactlyOnceWith(latest);
  });

  it('saves during sustained edits instead of postponing forever', () => {
    vi.useFakeTimers();
    const write = vi.fn();
    const saver = createBoardSaver(write);
    for (let i = 0; i < 10; i++) {
      saver.schedule({ ...DEFAULT_BOARD_STATE, guideText: String(i) });
      vi.advanceTimersByTime(200);
    }
    expect(write).toHaveBeenCalledExactlyOnceWith({ ...DEFAULT_BOARD_STATE, guideText: '9' });
  });

  it('flushes immediately on lifecycle cleanup without writing twice', () => {
    vi.useFakeTimers();
    const write = vi.fn();
    const saver = createBoardSaver(write);
    saver.schedule(DEFAULT_BOARD_STATE);
    saver.flush();
    vi.runAllTimers();
    saver.flush();
    expect(write).toHaveBeenCalledTimes(1);
  });

  it('reports quota errors and retries the retained board on a later flush', () => {
    vi.useFakeTimers();
    const write = vi.fn().mockImplementationOnce(() => {
      throw new Error('quota');
    });
    const report = vi.fn();
    const saver = createBoardSaver(write, report);
    saver.schedule(DEFAULT_BOARD_STATE);
    saver.flush();
    expect(report).toHaveBeenLastCalledWith(true);
    saver.flush();
    expect(report).toHaveBeenLastCalledWith(false);
    expect(write).toHaveBeenCalledTimes(2);
  });
});
