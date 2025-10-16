"use client";

import React, { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';

interface RealQrScannerProps {
  onScan: (data: string) => void;
  onError: (error: any) => void;
  isActive: boolean;
}

const RealQrScanner: React.FC<RealQrScannerProps> = ({ onScan, onError, isActive }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [qrDetected, setQrDetected] = useState<boolean>(false);
  const requestRef = useRef<number>();
  
  useEffect(() => {
    // Reset detection state when scanner becomes inactive
    if (!isActive) {
      setQrDetected(false);
    }

    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: { exact: 'environment' }, // Force rear camera
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 }
          }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setHasPermission(true);
        }
      } catch (err) {
        console.error('Error accessing camera:', err);
        onError(err);
        setHasPermission(false);
      }
    };

    const stopCamera = () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      setIsScanning(false);
    };

    if (isActive) {
      startCamera();
      setIsScanning(true);
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isActive, onError]);

  useEffect(() => {
    let animationFrameId: number;

    const scanQRCode = () => {
      if (!videoRef.current || !canvasRef.current || !isScanning || qrDetected) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (video.readyState === video.HAVE_ENOUGH_DATA && context) {
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        if (code) {
          setQrDetected(true);
          onScan(code.data);
          setIsScanning(false); // Stop scanning after detection
        } else {
          animationFrameId = requestAnimationFrame(scanQRCode);
        }
      } else {
        animationFrameId = requestAnimationFrame(scanQRCode);
      }
    };

    if (isActive && isScanning && !qrDetected) {
      // Reset qrDetected flag if scanner is restarted
      if(qrDetected) setQrDetected(false);
      scanQRCode();
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isActive, isScanning, onScan, qrDetected]);

  return (
    <div className="relative">
      <video 
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover rounded-lg"
        style={{ display: isActive ? 'block' : 'none' }}
      />
      <canvas 
        ref={canvasRef} 
        className="absolute top-0 left-0 w-full h-full"
        style={{ display: 'none' }} // Hidden canvas for processing
      />
      {isActive && !hasPermission && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <p className="text-red-500">Camera permission denied</p>
        </div>
      )}
      
      {/* Scanner overlay */}
      {isActive && hasPermission && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 border-2 border-white/50"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 border-2 border-white animate-pulse"></div>
          <div className="absolute top-1/2 left-0 w-full border-t-2 border-white/50"></div>
          <div className="absolute left-1/2 top-0 h-full border-l-2 border-white/50"></div>
        </div>
      )}
    </div>
  );
};

export default RealQrScanner;
