import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

export function employeeQrUrl(id) {
  return `${window.location.origin}${window.location.pathname}?emp=${encodeURIComponent(id)}`;
}

export default function QrCode({ id, nombre }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, employeeQrUrl(id), { width: 176, margin: 1 });
  }, [id]);

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `qr-${id}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="qr-card">
      <canvas ref={canvasRef} className="qr-canvas" />
      <div className="qr-info">
        <strong>Código QR del colaborador</strong>
        <span className="result-meta">Escanéalo para abrir la matriz de {nombre}</span>
        <button className="qr-download" onClick={download}>Descargar QR</button>
      </div>
    </div>
  );
}
