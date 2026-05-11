// HorseOwnership ya vive en ./types (legacy). Mantener este archivo solo
// para tipos auxiliares que NO colisionen.

export interface HorseRef {
  id: string;
  name: string;
  image_url: string | null;
}
