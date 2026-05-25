'use client';

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';

export type MapPin = {
  id: string;
  lat: number;
  lng: number;
  name: string;
  price: string;
  neighborhood: string;
  status: string;
};

export type Bounds = {
  sw_lat: number;
  sw_lng: number;
  ne_lat: number;
  ne_lng: number;
};

export interface MapViewHandle {
  flyTo: (lat: number, lng: number, zoom?: number) => void;
}

interface MapViewProps {
  pins: MapPin[];
  onPinClick?: (id: string) => void;
  onBoundsChange?: (bounds: Bounds) => void;
}

// Cor por status
function pinColor(status: string) {
  const s = (status || '').toLowerCase();
  if (s.includes('pronto') || s.includes('entreg') || s.includes('conclui')) return '#16a34a';
  if (s.includes('obra')   || s.includes('constru') || s.includes('andamento')) return '#d97706';
  return '#2563eb';
}

const MapView = forwardRef<MapViewHandle, MapViewProps>(function MapView(
  { pins, onPinClick, onBoundsChange },
  ref,
) {
  const containerRef  = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef        = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef    = useRef<any[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [pinCount,  setPinCount]  = useState(0);
  const onBoundsRef = useRef(onBoundsChange);
  useEffect(() => { onBoundsRef.current = onBoundsChange; }, [onBoundsChange]);

  // Expõe flyTo para o componente pai
  useImperativeHandle(ref, () => ({
    flyTo(lat: number, lng: number, zoom = 14) {
      mapRef.current?.flyTo({ center: [lng, lat], zoom, duration: 1000 });
    },
  }));

  // ── Inicializa o mapa uma única vez ─────────────────────────────────────────
  useEffect(() => {
    let destroyed = false;

    async function init() {
      if (destroyed || !containerRef.current || mapRef.current) return;

      // CSS do MapLibre GL
      if (!document.getElementById('maplibre-css')) {
        await new Promise<void>(resolve => {
          const link   = document.createElement('link');
          link.id      = 'maplibre-css';
          link.rel     = 'stylesheet';
          link.href    = 'https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl.css';
          link.onload  = () => resolve();
          link.onerror = () => resolve();
          document.head.appendChild(link);
        });
      }

      if (destroyed || !containerRef.current) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { Map } = await import('maplibre-gl') as any;

      if (destroyed || !containerRef.current) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const map: any = new Map({
        container: containerRef.current,
        // OpenFreeMap — vector tiles gratuitos, sem API key
        style:  'https://tiles.openfreemap.org/styles/liberty',
        center: [-46.63, -23.55],
        zoom:   11,
        attributionControl: { compact: true },
      });

      mapRef.current = map;

      const reportBounds = () => {
        const b = map.getBounds();
        onBoundsRef.current?.({
          sw_lat: b.getSouth(), sw_lng: b.getWest(),
          ne_lat: b.getNorth(), ne_lng: b.getEast(),
        });
      };

      map.on('moveend', reportBounds);

      map.on('load', () => {
        if (!destroyed) {
          setMapReady(true);
          reportBounds();
        }
      });
    }

    init();

    return () => {
      destroyed = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  // ── Atualiza pins quando mudam ───────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    // Remove pins antigos
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const validPins = pins.filter(p => p.lat && p.lng);
    setPinCount(validPins.length);
    if (!validPins.length) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    import('maplibre-gl').then((mod: any) => {
      const { Marker, Popup } = mod;

      validPins.forEach(pin => {
        const color = pinColor(pin.status);

        // Elemento visual do pin (bolha de preço)
        const el = document.createElement('div');
        el.style.cssText = [
          `background:${color}`,
          'color:#fff',
          'font-size:10px',
          'font-weight:700',
          'padding:3px 8px',
          'border-radius:12px',
          'white-space:nowrap',
          'box-shadow:0 2px 8px rgba(0,0,0,.28)',
          'border:2px solid #fff',
          'cursor:pointer',
          'user-select:none',
          'transition:transform .1s',
        ].join(';');
        el.textContent = pin.price;
        el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.12)'; });
        el.addEventListener('mouseleave', () => { el.style.transform = ''; });

        // Popup ao clicar no pin
        const popup = new Popup({ offset: 14, closeButton: false, maxWidth: '220px' })
          .setHTML(
            `<div style="font-family:system-ui,sans-serif;padding:2px 0">
              <div style="font-weight:700;font-size:13px;margin-bottom:3px;color:#111">${pin.name}</div>
              <div style="font-size:11px;color:#64748b;margin-bottom:6px">${pin.neighborhood}</div>
              <div style="font-size:15px;font-weight:800;color:${color};margin-bottom:10px">${pin.price}</div>
              <a href="/imoveis/${pin.id}" style="display:block;text-align:center;background:${color};color:#fff;padding:7px 10px;border-radius:8px;font-size:12px;text-decoration:none;font-weight:700">
                Ver detalhes →
              </a>
            </div>`,
          );

        const marker = new Marker({ element: el })
          .setLngLat([pin.lng, pin.lat])
          .setPopup(popup)
          .addTo(mapRef.current);

        // Click direto leva à página do imóvel (sem precisar abrir popup)
        el.addEventListener('click', () => {
          if (onPinClick) onPinClick(pin.id);
        });

        markersRef.current.push(marker);
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins, mapReady]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Loading state enquanto o mapa GL inicializa */}
      {!mapReady && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: '#f1f5f9', gap: '10px',
        }}>
          <div style={{
            width: '32px', height: '32px',
            border: '3px solid #e2e8f0',
            borderTopColor: '#2563eb',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
          }} />
          <p style={{ color: '#64748b', fontSize: 13 }}>Carregando mapa...</p>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {/* Badge com contagem de pins */}
      {mapReady && pinCount > 0 && (
        <div style={{
          position: 'absolute', top: 10, right: 10,
          background: 'rgba(37,99,235,.9)', color: '#fff',
          borderRadius: 20, padding: '4px 12px',
          fontSize: 12, fontWeight: 700,
          zIndex: 500, pointerEvents: 'none',
          boxShadow: '0 2px 8px rgba(0,0,0,.2)',
        }}>
          {pinCount} no mapa
        </div>
      )}
    </div>
  );
});

export default MapView;
