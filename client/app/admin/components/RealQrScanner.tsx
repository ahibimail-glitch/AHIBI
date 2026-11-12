"use client";

import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

interface RealQrScannerProps {
  onScan: (data: string) => void;
  onError: (error: Error) => void;
  isActive: boolean;
}

const RealQrScanner: React.FC<RealQrScannerProps> = ({ onScan, onError, isActive }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onScanRef = useRef(onScan);
  const onErrorRef = useRef(onError);
  const [cameraReady, setCameraReady] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [qrDetected, setQrDetected] = useState(false);

  useEffect(() => { onScanRef.current = onScan; }, [onScan]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  useEffect(() => {
    if (!isActive) {
      setCameraReady(false);
      setIsScanning(false);
      setQrDetected(false);
      return;
    }

    let cancelled = false;
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Camera access is not available in this browser. Open this page in a current browser over HTTPS.');
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        const video = videoRef.current;
        if (!video) throw new Error('Could not start the camera preview. Please try again.');
        video.srcObject = stream;
        await video.play();
        if (cancelled) return;

        setCameraReady(true);
        setIsScanning(true);
      } catch (error) {
        if (cancelled) return;
        const cameraError = error instanceof Error ? error : new Error('Unable to open the camera.');
        const errorName = (error as { name?: string } | null)?.name;
        const message = !window.isSecureContext
          ? 'Camera access requires a secure HTTPS connection. Open the scanner using its https:// address.'
          : errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError'
            ? 'Camera permission is blocked. Allow camera access for this site in your browser settings, then try again.'
            : errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError'
              ? 'No camera was found on this device.'
              : errorName === 'NotReadableError' || errorName === 'TrackStartError'
                ? 'The camera is busy in another app. Close that app and try again.'
                : cameraError.message;
        onErrorRef.current(new Error(message));
      }
    };

    setCameraReady(false);
    setQrDetected(false);
    void startCamera();

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
      const video = videoRef.current;
      if (video) video.srcObject = null;
      if (scanTimerRef.current) {
        clearTimeout(scanTimerRef.current);
        scanTimerRef.current = null;
      }
    };
  }, [isActive]);

  useEffect(() => {
    if (!isActive || !cameraReady || !isScanning || qrDetected) return;
    let cancelled = false;

    const scanFrame = () => {
      if (cancelled) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas?.getContext('2d', { willReadFrequently: true });

      if (video && canvas && context && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0) {
        const scale = Math.min(1, 960 / video.videoWidth);
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
        if (code) {
          setQrDetected(true);
          setIsScanning(false);
          onScanRef.current(code.data);
          return;
        }
      }

      scanTimerRef.current = setTimeout(scanFrame, 110);
    };

    scanFrame();
    return () => {
      cancelled = true;
      if (scanTimerRef.current) {
        clearTimeout(scanTimerRef.current);
        scanTimerRef.current = null;
      }
    };
  }, [cameraReady, isActive, isScanning, qrDetected]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        aria-label="Live rear camera preview for scanning a ticket QR code"
        className="absolute inset-0 h-full w-full object-cover"
        style={{ display: isActive ? 'block' : 'none' }}
      />
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
    </div>
  );
};

export default RealQrScanner;
