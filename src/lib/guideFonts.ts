import qbeginnersUrl from '../assets/fonts/qbeginners-f96c33d6c8.woff2?url';
import nsw_foundationUrl from '../assets/fonts/nsw-foundation-2ff9c25f3d.woff2?url';
import vic_beginnerUrl from '../assets/fonts/vic-beginner-4064d35c5d.woff2?url';
import patrick_handUrl from '../assets/fonts/patrick-hand-ac5bc9033b.woff2?url';
import caveatUrl from '../assets/fonts/caveat-d0b7b931b8.woff2?url';
import dancing_scriptUrl from '../assets/fonts/dancing-script-570e4265bb.woff2?url';

export const GUIDE_FONTS = [
  {
    id: 'qbeginners',
    label: 'Edu QLD Beginner (QBeginners)',
    family: 'Edu QLD Beginner',
    url: qbeginnersUrl
  },
  {
    id: 'nsw-foundation',
    label: 'NSW/ACT Foundation',
    family: 'Edu NSW ACT Foundation',
    url: nsw_foundationUrl
  },
  {
    id: 'vic-beginner',
    label: 'VIC/WA/NT Beginner',
    family: 'Edu VIC WA NT Beginner',
    url: vic_beginnerUrl
  },
  { id: 'patrick-hand', label: 'Patrick Hand', family: 'Patrick Hand', url: patrick_handUrl },
  { id: 'caveat', label: 'Caveat', family: 'Caveat', url: caveatUrl },
  {
    id: 'dancing-script',
    label: 'Dancing Script',
    family: 'Dancing Script',
    url: dancing_scriptUrl
  }
] as const;

export type GuideFontId = (typeof GUIDE_FONTS)[number]['id'];
export const DEFAULT_GUIDE_FONT: GuideFontId = 'qbeginners';

export function isGuideFont(value: unknown): value is GuideFontId {
  return GUIDE_FONTS.some((font) => font.id === value);
}

export function guideFontFamily(id: GuideFontId = DEFAULT_GUIDE_FONT): string {
  const font = GUIDE_FONTS.find((font) => font.id === id) ?? GUIDE_FONTS[0];
  return `"${font.family}", cursive`;
}

const pendingFonts = new Map<GuideFontId, Promise<void>>();

/** Register only the requested face. Failed requests may be retried. Works in export workers too. */
export function loadGuideFont(id: GuideFontId = DEFAULT_GUIDE_FONT): Promise<void> {
  const existing = pendingFonts.get(id);
  if (existing) return existing;
  const font = GUIDE_FONTS.find((font) => font.id === id) ?? GUIDE_FONTS[0];
  const request = (async () => {
    const face = new FontFace(font.family, `url(${font.url})`, {
      style: 'normal',
      weight: '400',
      display: 'swap'
    });
    await face.load();
    const fonts =
      typeof document !== 'undefined'
        ? document.fonts
        : (globalThis as unknown as { fonts: FontFaceSet }).fonts;
    fonts.add(face);
  })().catch((error: unknown) => {
    pendingFonts.delete(id);
    throw error;
  });
  pendingFonts.set(id, request);
  return request;
}
