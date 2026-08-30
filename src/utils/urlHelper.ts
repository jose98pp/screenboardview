/**
 * URL Utilities for OBS Studio Browser Sources and Overlays
 */

export interface ParsedRoute {
  isOverlay: boolean;
  boardId: string | null;
  compressedData: string | null;
}

/**
 * Returns the canonical, unique URL for an OBS Browser Source overlay
 * e.g. https://.../?mode=overlay&id=sb_soccer_123
 */
export function getOverlayUrl(boardId: string): string {
  if (typeof window === 'undefined') return '';
  const origin = window.location.origin;
  return `${origin}/?mode=overlay&id=${encodeURIComponent(boardId)}`;
}

/**
 * Returns an alternative direct overlay URL
 * e.g. https://.../?overlay=sb_soccer_123
 */
export function getDirectOverlayUrl(boardId: string): string {
  if (typeof window === 'undefined') return '';
  const origin = window.location.origin;
  return `${origin}/?overlay=${encodeURIComponent(boardId)}`;
}

/**
 * Returns a hash-based overlay URL (useful for strict static hosts or subpaths)
 * e.g. https://.../#/overlay/sb_soccer_123
 */
export function getHashOverlayUrl(boardId: string): string {
  if (typeof window === 'undefined') return '';
  const origin = window.location.origin;
  return `${origin}/#/overlay/${encodeURIComponent(boardId)}`;
}

/**
 * Parses the current window location to detect whether we are in OBS Overlay mode
 * and extract the target board ID from any supported URL format.
 */
export function parseCurrentRoute(): ParsedRoute {
  if (typeof window === 'undefined') {
    return { isOverlay: false, boardId: null, compressedData: null };
  }

  const searchParams = new URLSearchParams(window.location.search);
  const modeParam = searchParams.get('mode');
  const overlayParam = searchParams.get('overlay');
  const idParam = searchParams.get('id');
  const dataParam = searchParams.get('data');

  // Format 1: ?mode=overlay&id=XYZ
  if (modeParam === 'overlay') {
    return {
      isOverlay: true,
      boardId: idParam || (overlayParam && overlayParam !== 'true' ? overlayParam : null),
      compressedData: dataParam,
    };
  }

  // Format 2: ?overlay=XYZ (where XYZ is the boardId)
  if (overlayParam && overlayParam !== 'true') {
    return {
      isOverlay: true,
      boardId: overlayParam,
      compressedData: dataParam,
    };
  }

  // Format 3: ?overlay=true&id=XYZ
  if (overlayParam === 'true') {
    return {
      isOverlay: true,
      boardId: idParam,
      compressedData: dataParam,
    };
  }

  // Format 4: Hash-based #/overlay/XYZ or #overlay/XYZ
  if (window.location.hash) {
    const cleanHash = window.location.hash.replace(/^#\/?/, '');
    if (cleanHash.startsWith('overlay/')) {
      const extractedId = cleanHash.replace('overlay/', '').split('?')[0];
      return {
        isOverlay: true,
        boardId: decodeURIComponent(extractedId),
        compressedData: dataParam,
      };
    }
  }

  // Format 5: Path-based /overlay/XYZ
  if (window.location.pathname.startsWith('/overlay/')) {
    const extractedId = window.location.pathname.replace('/overlay/', '').split('/')[0];
    return {
      isOverlay: true,
      boardId: decodeURIComponent(extractedId),
      compressedData: dataParam,
    };
  }

  return {
    isOverlay: false,
    boardId: idParam,
    compressedData: dataParam,
  };
}
