'use client';

import { useEffect, useRef, useState } from 'react';

export type MapPin = {
  id: string;
  lat: number;
  lng: number;
  name: string;
  price: string;
  neighborhood: string;
  status: string;
};

interface MapViewProps {
  pins: MapPin[];
  onPinClick?: (id: string) => void;
}

export default function MapView({ pins, onPinClick }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const markersRef = useRef<unknown[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [pinCount, setPinCount] = useState(0);

  // Init: load CSS + create map
  useEffect(() => {
    let destroyed = false;

    async function init() {
      // 1. Load Leaflet CSS
      if (!document.getElementById('leaflet-css')) {
        await new Promise<void>(resolve => {
          const link = document.createElement('link');
          link.id = 'leaflet-css';
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          link.onload = () => resolve();
          link.onerror = () => resolve(); // continue even if CDN fails
          document.head.appendChild(link);
        });
      }

      if (destroyed || !containerRef.current || mapRef.current) return;

      // 2. Init map
      const { default: L } = await import('leaflet');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(containerRef.current, { center: [-23.55, -46.63], zoom: 11 });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '\u00a9 <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;
      if (!destroyed) setMapReady(true);
    }

    init();

    return () => {
      destroyed = true;
      if (mapRef.current) {
        (mapRef.current as { remove: () => void }).remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update markers whenever pins or map readiness changes
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = mapRef.current as any;

    // Clear old markers
    markersRef.current.forEach((m: unknown) => (m as { remove: () => void }).remove());
    markersRef.current = [];

    const validPins = pins.filter(p => p.lat && p.lng);
    setPinCount(validPins.length);
    if (validPins.length === 0) return;

    import('leaflet').then(({ default: L }) => {
      const bounds: [number, number][] = [];

      validPins.forEach(pin => {
        const color = pin.status?.toLowerCase().includes('pronto') ? '#16a34a'
          : pin.status?.toLowerCase().includes('obra') ? '#d97706' : '#2563eb';

        const icon = L.divIcon({
          className: '',
          html: `<div style="background:${color};color:#fff;font-size:10px;font-weight:700;padding:3px 8px;border-radius:12px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.3);border:2px solid #fff;cursor:pointer">${pin.price}</div>`,
          iconAnchor: [24, 12],
        });

        const marker = L.marker([pin.lat, pin.lng], { icon })
          .addTo(map)
          .bindPopup(
            `<div style="min-width:180px;font-family:system-ui,sans-serif">
              <div style="font-weight:700;font-size:13px;margin-bottom:4px">${pin.name}</div>
              <div style="font-size:11px;color:#64748b;margin-bottom:6px">${pin.neighborhood}</div>
              <div style="font-size:14px;font-weight:700;color:#2563eb;margin-bottom:8px">${pin.price}</div>
              <a href="/imovel/${pin.id}" style="display:block;text-align:center;background:#2563eb;color:#fff;padding:5px 10px;border-radius:6px;font-size:12px;text-decoration:none;font-weight:600">Ver detalhes</a>
            </div>`,
            { maxWidth: 220 }
          );

        if (onPinClick) marker.on('click', () => onPinClick(pin.id));
        markersRef.current.push(marker);
        bounds.push([pin.lat, pin.lng]);
      });

      if (bounds.length > 0) {
        try { map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 }); } catch {}
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins, mapReady]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {!mapReady && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
          justifyContent: 'center', background: '#f1f5f9', zIndex: 10,
        }}>
          <p style={{ color: '#64748b', fontSize: 14 }}>Carregando mapa...</p>
        </div>
      )}
      {mapReady && pinCount === 0 && (
        <div style={{
          position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,.65)', color: '#fff', borderRadius: 8,
          padding: '6px 14px', fontSize: 12, zIndex: 500, pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}>
          Coordenadas indisponíveis — carregando localização dos imóveis...
        </div>
      )}
      {pinCount > 0 && (
        <div style={{
          position: 'absolute', top: 10, right: 10,
          background: '#2563eb', color: '#fff', borderRadius: 20,
          padding: '4px 12px', fontSize: 12, fontWeight: 700,
          zIndex: 500, pointerEvents: 'none', boxShadow: '0 2px 8px rgba(0,0,0,.2)',
        }}>
          {pinCount} no mapa
        </div>
      )}
    </div>
  );
}
