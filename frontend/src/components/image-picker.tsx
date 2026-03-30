'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import ImageCropModal from './image-crop-modal';

interface ImagePickerProps {
  /** Already-selected files (controlled) */
  files: File[];
  onChange: (files: File[]) => void;
  /** Single image or multiple (default: false = multiple) */
  single?: boolean;
  /** Label text */
  label?: string;
  /** Existing remote image URL to display (for edit mode) */
  existingUrl?: string | null;
  /** Called when user removes the existing remote image */
  onRemoveExisting?: () => void;
}

export default function ImagePicker({
  files,
  onChange,
  single = false,
  label = 'Fotos',
  existingUrl,
  onRemoveExisting,
}: ImagePickerProps) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [tempShots, setTempShots] = useState<{ file: File; preview: string }[]>([]);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [cameraIndex, setCameraIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Camera ---

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const startStreamByDeviceId = useCallback(async (deviceId?: string) => {
    stopCamera();
    const constraints: MediaStreamConstraints = {
      video: deviceId
        ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 960 } }
        : { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 960 } },
      audio: false,
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    streamRef.current = stream;
    if (videoRef.current) videoRef.current.srcObject = stream;
    return stream;
  }, [stopCamera]);

  const openCamera = async () => {
    setCameraError('');
    setTempShots([]);
    try {
      // Get initial stream (back camera by default)
      const stream = await startStreamByDeviceId();
      setCameraOpen(true);
      requestAnimationFrame(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      });
      // Enumerate all video cameras (needs permission first)
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');
      setCameras(videoDevices);
      // Find which camera is currently active
      const activeTrack = stream.getVideoTracks()[0];
      const activeDeviceId = activeTrack?.getSettings().deviceId;
      const idx = videoDevices.findIndex((d) => d.deviceId === activeDeviceId);
      setCameraIndex(idx >= 0 ? idx : 0);
    } catch {
      setCameraError('No se pudo acceder a la cámara. Verificá los permisos.');
    }
  };

  const switchCamera = async () => {
    if (cameras.length < 2) return;
    const nextIndex = (cameraIndex + 1) % cameras.length;
    try {
      await startStreamByDeviceId(cameras[nextIndex].deviceId);
      setCameraIndex(nextIndex);
    } catch {
      setCameraError('No se pudo cambiar de cámara.');
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
      const src = URL.createObjectURL(blob);
      stopCamera();
      setCameraOpen(false);
      setCropSrc(src);
    }, 'image/jpeg', 0.92);
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

    if (single) {
      // Replace everything
      previews.forEach((p) => URL.revokeObjectURL(p));
      onChange(newFiles);
      setPreviews(newPreviews);
    } else {
      onChange([...files, ...newFiles]);
      setPreviews((prev) => [...prev, ...newPreviews]);
    }

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

  // --- File upload ---

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected?.length) return;
    const src = URL.createObjectURL(selected[0]);
    setCropSrc(src);
    e.target.value = '';
  };

  const handleCropSave = (croppedFile: File) => {
    const preview = URL.createObjectURL(croppedFile);
    if (single) {
      previews.forEach((p) => URL.revokeObjectURL(p));
      onChange([croppedFile]);
      setPreviews([preview]);
    } else {
      onChange([...files, croppedFile]);
      setPreviews((prev) => [...prev, preview]);
    }
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  };

  const handleCropCancel = () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  };

  // --- Remove ---

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    onChange(files.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // --- Derived state ---

  const hasExisting = !!existingUrl && files.length === 0;
  const showButtons = !cameraOpen && (!single || (files.length === 0 && !hasExisting));

  // Mientras hay crop activo, mostrar solo el editor inline
  if (cropSrc) {
    return (
      <div>
        <label className="block text-sm font-medium mb-1">{label}</label>
        <ImageCropModal
          imageSrc={cropSrc}
          aspect={single ? 4 / 3 : undefined}
          onCancel={handleCropCancel}
          onSave={handleCropSave}
        />
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>

      {/* Existing remote image (edit mode) */}
      {hasExisting && (
        <div className="relative mb-2 inline-block">
          <img
            src={existingUrl!}
            alt="Imagen actual"
            className="h-20 w-20 rounded-md object-cover border border-gray-200"
          />
          {onRemoveExisting && (
            <button
              type="button"
              onClick={onRemoveExisting}
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white hover:bg-red-600"
            >
              x
            </button>
          )}
        </div>
      )}

      {/* Selected file previews */}
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
                onClick={() => removeFile(i)}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white hover:bg-red-600"
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Single mode: change button when file already selected */}
      {single && files.length > 0 && !cameraOpen && (
        <div className="flex gap-2 mb-2">
          <button
            type="button"
            onClick={openCamera}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Cambiar (cámara)
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Cambiar (archivo)
          </button>
        </div>
      )}

      {/* Action buttons */}
      {showButtons && (
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
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple={!single}
        onChange={handleFileUpload}
        className="hidden"
      />

      {cameraError && (
        <p className="mt-1 text-sm text-red-600">{cameraError}</p>
      )}

      {/* Camera viewfinder — fullscreen overlay */}
      {cameraOpen && (
        <div className="fixed inset-0 z-50 bg-black">
          {/* Video covers the entire screen */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 h-full w-full object-cover"
          />

          {/* Switch camera button — top right (hidden if only 1 camera) */}
          {cameras.length > 1 && (
            <button
              type="button"
              onClick={switchCamera}
              className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white active:bg-black/70 transition"
              aria-label="Cambiar cámara"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182M2.985 14.652" />
              </svg>
            </button>
          )}

          {/* Temp shots strip — above controls */}
          {tempShots.length > 0 && (
            <div className="absolute bottom-28 left-0 right-0 z-10 flex gap-2 px-3 py-2">
              {tempShots.map((shot, i) => (
                <div key={i} className="relative h-14 w-14 shrink-0">
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

          {/* Controls bar — bottom, overlaid on video */}
          <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-between bg-black/40 px-6 py-5 safe-bottom">
            <button
              type="button"
              onClick={cancelCamera}
              className="rounded-full bg-black/50 px-5 py-2.5 text-sm font-medium text-white active:bg-black/70 transition"
            >
              Cancelar
            </button>

            {/* Shutter button */}
            <button
              type="button"
              onClick={takePhoto}
              className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-white active:bg-gray-200 transition"
            >
              <div className="h-11 w-11 rounded-full bg-red-500" />
            </button>

            {/* Accept button */}
            {tempShots.length > 0 ? (
              <button
                type="button"
                onClick={acceptPhotos}
                className="rounded-full bg-green-600 px-5 py-2.5 text-sm font-medium text-white active:bg-green-500 transition"
              >
                Aceptar{!single && ` (${tempShots.length})`}
              </button>
            ) : (
              <div className="w-[88px]" />
            )}
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />

      {files.length > 0 && !cameraOpen && !single && (
        <p className="mt-1 text-xs text-gray-500">
          {files.length} foto{files.length !== 1 ? 's' : ''} lista{files.length !== 1 ? 's' : ''}
        </p>
      )}

    </div>
  );
}
