'use client';

import { useEffect } from 'react';

/**
 * Hook ligero para hotkeys globales. Acepta combos del estilo "mod+k",
 * "shift+/", o secuencias como "g h" (ir a home).
 *
 * Reglas:
 *  - `mod` resuelve a Cmd en macOS y Ctrl en otros sistemas.
 *  - Las secuencias se separan con espacio: "g c" = G luego C.
 *  - Si el foco está en un input/textarea/contenteditable, los atajos
 *    SIN modificadores son ignorados.
 */

type Modifier = 'mod' | 'shift' | 'alt';

interface ParsedShortcut {
  keys: string[];           // tecla "secuencia" — varias entradas si es g h, etc.
  modifiers: Set<Modifier>; // solo aplica al PRIMER paso
}

const SEQUENCE_TIMEOUT_MS = 1000;

function parseShortcut(combo: string): ParsedShortcut {
  const tokens = combo.toLowerCase().trim().split(/\s+/);
  if (tokens.length > 1) {
    return { keys: tokens, modifiers: new Set() };
  }
  const parts = tokens[0].split('+');
  const key = parts.pop()!;
  const modifiers = new Set<Modifier>();
  for (const p of parts) {
    if (p === 'mod' || p === 'shift' || p === 'alt') modifiers.add(p);
  }
  return { keys: [key], modifiers };
}

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
}

export function useShortcut(combo: string, handler: (e: KeyboardEvent) => void, options?: { allowInInputs?: boolean }) {
  useEffect(() => {
    const parsed = parseShortcut(combo);
    let sequenceIndex = 0;
    let sequenceTimer: ReturnType<typeof setTimeout> | null = null;
    const isMac = typeof navigator !== 'undefined' && /Mac|iP(hone|od|ad)/.test(navigator.platform);

    const reset = () => {
      sequenceIndex = 0;
      if (sequenceTimer) {
        clearTimeout(sequenceTimer);
        sequenceTimer = null;
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (!options?.allowInInputs && isEditable(e.target)) return;
      const key = e.key.toLowerCase();
      const expected = parsed.keys[sequenceIndex];

      // Validar modificadores solo en el primer paso
      if (sequenceIndex === 0) {
        const needsMod = parsed.modifiers.has('mod');
        const needsShift = parsed.modifiers.has('shift');
        const needsAlt = parsed.modifiers.has('alt');
        const modPressed = isMac ? e.metaKey : e.ctrlKey;
        if (needsMod !== modPressed) return;
        if (needsShift !== e.shiftKey) return;
        if (needsAlt !== e.altKey) return;
      }

      if (key !== expected) {
        if (sequenceIndex > 0 && !e.metaKey && !e.ctrlKey && !e.altKey) reset();
        return;
      }

      sequenceIndex++;
      if (sequenceIndex === parsed.keys.length) {
        reset();
        handler(e);
      } else {
        if (sequenceTimer) clearTimeout(sequenceTimer);
        sequenceTimer = setTimeout(reset, SEQUENCE_TIMEOUT_MS);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (sequenceTimer) clearTimeout(sequenceTimer);
    };
  }, [combo, handler, options?.allowInInputs]);
}
