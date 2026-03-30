'use client';

import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';

interface ImageCropModalProps {
  imageSrc: string;
  aspect?: number;
  onCancel: () => void;
  onSave: (file: File) => void;
}

async function getCroppedFile(imageSrc: string, pixelCrop: Area): Promise<File> {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.src = imageSrc;
  await new Promise<void>((res) => { image.onload = () => res(); });

  const canvas = document.createElement('canvas');
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext('2d')!;

  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y,
    pixelCrop.width, pixelCrop.height,
    0, 0,
    pixelCrop.width, pixelCrop.height,
  );

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        resolve(new File([blob], `imagen-${Date.now()}.jpg`, { type: 'image/jpeg' }));
      },
      'image/jpeg',
      0.92,
    );
  });
}

// Renderiza inline — sin portal, sin segundo modal.
// El componente padre decide dónde mostrarlo.
export default function ImageCropModal({
  imageSrc,
  aspect = 4 / 3,
  onCancel,
  onSave,
}: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedArea(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedArea) return;
    setSaving(true);
    const file = await getCroppedFile(imageSrc, croppedArea);
    onSave(file);
    setSaving(false);
  };

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200">

      {/* Cropper */}
      <div className="relative bg-black" style={{ height: 240 }}>
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>

      {/* Controles */}
      <div className="px-3 py-3 space-y-2 bg-gray-50 border-t border-gray-200">
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-full cursor-pointer"
          style={{ accentColor: '#0f1f3d' }}
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 cursor-pointer transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-lg py-2 text-xs font-semibold text-white disabled:opacity-60 cursor-pointer transition"
            style={{ backgroundColor: '#16a34a' }}
          >
            {saving ? 'Procesando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
