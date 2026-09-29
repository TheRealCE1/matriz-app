import { useEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';
import QrScannerWorkerPath from 'qr-scanner/qr-scanner-worker.min.js?url';

export default function QrScannerModal({ onResult, onClose }) {
  const videoRef = useRef(null);
  const scannerRef = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!videoRef.current) return undefined;
    const scanner = new QrScanner(
      videoRef.current,
      (result) => onResult(result.data),
      { highlightScanRegion: true, highlightCodeOutline: true }
    );
    scannerRef.current = scanner;
    scanner.start().catch(() => setError('No se pudo acceder a la cámara.'));
    return () => scanner.destroy();
  }, [onResult]);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="scanner-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-top">
          <h2>Escanear código QR</h2>
          <button className="close" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        <video ref={videoRef} className="scanner-video" />
        {error && <p className="hint">⚠️ {error}</p>}
        <p className="hint">Apunta la cámara al QR de la credencial del colaborador.</p>
      </div>
    </div>
  );
}
