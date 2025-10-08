import React, { useState } from "react";
import { QrReader } from "react-qr-reader";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Camera, CameraOff, AlertCircle } from "lucide-react";

interface QRScannerProps {
  onScan: (data: string) => void;
  onError?: (error: string) => void;
  isScanning: boolean;
  onStartScan: () => void;
  onStopScan: () => void;
}

export default function QRScanner({ onScan, onError, isScanning, onStartScan, onStopScan }: QRScannerProps) {
  const [error, setError] = useState<string>("");
  const [hasScanned, setHasScanned] = useState(false);

  const handleScan = (result: any, err: any) => {
    if (result && !hasScanned) {
      setHasScanned(true);
      onScan(result.text);
    }
    
    if (err && err.name !== 'NotFoundException') {
      const errorMessage = "Error scanning QR code. Please try again.";
      setError(errorMessage);
      if (onError) onError(errorMessage);
    }
  };

  const handleStartScan = () => {
    setHasScanned(false);
    setError("");
    onStartScan();
  };

  if (!isScanning) {
    return (
      <div className="text-center py-8">
        <Camera className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <p className="text-gray-500 mb-4">Ready to scan QR codes</p>
        <Button onClick={handleStartScan} size="lg">
          <Camera className="w-5 h-5 mr-2" />
          Start Camera
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="relative w-full bg-black rounded-lg overflow-hidden">
        <QrReader
          onResult={handleScan}
          constraints={{
            facingMode: "environment",
            aspectRatio: 1
          }}
          containerStyle={{
            width: "100%",
            paddingTop: "100%",
            position: "relative"
          }}
          videoStyle={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover"
          }}
        />
        
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-64 h-64 border-2 border-white rounded-lg">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-lg"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-lg"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-lg"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-lg"></div>
          </div>
        </div>

        <div className="absolute bottom-4 left-0 right-0 flex justify-center">
          <Button variant="destructive" size="sm" onClick={onStopScan}>
            <CameraOff className="w-4 h-4 mr-2" />
            Stop Camera
          </Button>
        </div>
      </div>

      <div className="text-center text-sm text-gray-600">
        <p>Position the QR code within the frame to scan</p>
      </div>
    </div>
  );
}
