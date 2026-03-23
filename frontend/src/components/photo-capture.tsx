'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface PhotoCaptureProps {
  photos: File[];
  onChange: (photos: File[]) => void;
}

export default function PhotoCapture({ photos, onChange }: PhotoCaptureProps) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [tempShots, setTempShots] = useState<{ file: File; preview: string }[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const openCamera = async () => {
    setCameraError('');
    setTempShots([]);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
      // Wait for video element to mount
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 50);
    } catch {
      setCameraError('No se pudo acceder a la cámara. Verificá los permisos.');
    }
  };

  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `foto-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const preview = URL.createObjectURL(blob);
      setTempShots((prev) => [...prev, { file, preview }]);
    }, 'image/jpeg', 0.85);
  };

  const removeTempShot = (index: number) => {
    setTempShots((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const acceptPhotos = () => {
    const newFiles = tempShots.map((s) => s.file);
    const newPreviews = tempShots.map((s) => s.preview);
    onChange([...photos, ...newFiles]);
    setPreviews((prev) => [...prev, ...newPreviews]);
    setTempShots([]);
    stopCamera();
    setCameraOpen(false);
  };

  const cancelCamera = () => {
    tempShots.forEach((s) => URL.revokeObjectURL(s.preview));
    setTempShots([]);
    stopCamera();
    setCameraOpen(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    const newFiles = Array.from(files);
    onChange([...photos, ...newFiles]);

    const newPreviews = newFiles.map((file) => URL.createObjectURL(file));
    setPreviews((prev) => [...prev, ...newPreviews]);

    e.target.value = '';
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    onChange(photos.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  return (
    <div>
      <label className="block text-sm font-medium mb-1">Fotos</label>

      {/* Fotos ya aceptadas */}
      {previews.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {previews.map((src, i) => (
            <div key={i} className="relative h-20 w-20">
              <img
                src={src}
                alt={`Foto ${i + 1}`}
                className="h-full w-full rounded-md object-cover border border-gray-200"
              />
              <button
                type="button"
                onClick={() => removePhoto(i)}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white hover:bg-red-600"
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Botones: cámara y subir archivo */}
      {!cameraOpen && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={openCamera}
            className="flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
            </svg>
            Sacar foto
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
            Subir imagen
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      )}

      {cameraError && (
        <p className="mt-1 text-sm text-red-600">{cameraError}</p>
      )}

      {/* Vista de cámara */}
      {cameraOpen && (
        <div className="mt-2 rounded-lg border border-gray-200 bg-black overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full max-h-64 object-contain"
          />

          {/* Fotos sacadas (temporales) */}
          {tempShots.length > 0 && (
            <div className="flex flex-wrap gap-2 bg-gray-900 p-2">
              {tempShots.map((shot, i) => (
                <div key={i} className="relative h-16 w-16">
                  <img
                    src={shot.preview}
                    alt={`Captura ${i + 1}`}
                    className="h-full w-full rounded object-cover border border-gray-600"
                  />
                  <button
                    type="button"
                    onClick={() => removeTempShot(i)}
                    className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white hover:bg-red-600"
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Controles */}
          <div className="flex items-center justify-center gap-3 bg-gray-900 p-3">
            <button
              type="button"
              onClick={cancelCamera}
              className="rounded-md bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={takePhoto}
              className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-white bg-white hover:bg-gray-200 transition"
            >
              <div className="h-8 w-8 rounded-full bg-red-500" />
            </button>
            {tempShots.length > 0 && (
              <button
                type="button"
                onClick={acceptPhotos}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 transition"
              >
                Aceptar ({tempShots.length})
              </button>
            )}
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />

      {photos.length > 0 && !cameraOpen && (
        <p className="mt-1 text-xs text-gray-500">
          {photos.length} foto{photos.length !== 1 ? 's' : ''} lista{photos.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
