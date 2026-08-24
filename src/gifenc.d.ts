declare module 'gifenc' {
  export type GifPalette = number[][];

  export interface GifFrameOptions {
    palette?: GifPalette;
    delay?: number;
    repeat?: number;
  }

  export interface GifEncoder {
    writeFrame(pixels: Uint8Array, width: number, height: number, options?: GifFrameOptions): void;
    finish(): void;
    bytes(): Uint8Array<ArrayBuffer>;
  }

  export function GIFEncoder(): GifEncoder;
  export function quantize(rgba: Uint8Array | Uint8ClampedArray, maxColours: number): GifPalette;
  export function applyPalette(
    rgba: Uint8Array | Uint8ClampedArray,
    palette: GifPalette
  ): Uint8Array;
}
