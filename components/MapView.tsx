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
      const { Marker } = mod;

      validPins.forEach(pin => {
        const color = pinColor(pin.status);

        // ── Pin estilo balão (sem texto, leve) ─────────────────────────────
        const el = document.createElement('div');
        el.style.cssText = 'cursor:pointer;transition:transform .12s;filter:drop-shadow(0 2px 4px rgba(0,0,0,.35))';
        // SVG balão: círculo com ponta para baixo, cor por status, ícone branco no centro
        el.innerHTML = `<svg width="28" height="36" viewBox="0 0 28 36" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 2C7.925 2 3 6.925 3 13c0 7.5 11 21 11 21s11-13.5 11-21c0-6.075-4.925-11-11-11z"
            fill="${color}" stroke="white" stroke-width="2"/>
          <circle cx="14" cy="13" r="4.5" fill="rgba(255,255,255,0.85)"/>
        </svg>`;

        el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.2) translateY(-2px)'; });
        el.addEventListener('mouseleave', () => { el.style.transform = ''; });

        // Clique direto → abre perfil do imóvel
        el.addEventListener('click', () => {
          if (onPinClick) onPinClick(pin.id);
          window.location.href = `/imoveis/${pin.id}`;
        });

        const marker = new Marker({ element: el, anchor: 'bottom' })
          .setLngLat([pin.lng, pin.lat])
          .addTo(mapRef.current);

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

      {/* Badge contagem + legenda de cores */}
      {mapReady && pinCount > 0 && (
        <div style={{
          position: 'absolute', top: 10, right: 10,
          display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px',
          zIndex: 500, pointerEvents: 'none',
        }}>
          {/* Contagem */}
          <div style={{
            background: 'rgba(15,23,42,.82)', color: '#fff',
            borderRadius: 20, padding: '4px 12px',
            fontSize: 12, fontWeight: 700,
            boxShadow: '0 2px 8px rgba(0,0,0,.25)',
          }}>
            {pinCount} imóveis
          </div>
          {/* Legenda */}
          <div style={{
            background: 'rgba(255,255,255,.92)', borderRadius: 10, padding: '6px 10px',
            display: 'flex', flexDirection: 'column', gap: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,.15)', fontSize: 11, fontWeight: 600, color: '#374151',
          }}>
            {[
              { color: '#2563eb', label: 'Na Planta' },
              { color: '#d97706', label: 'Em Obras'  },
              { color: '#16a34a', label: 'Pronto'    },
            ].map(({ color, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, border: '2px solid #fff', boxShadow: '0 1px 3px rgba(0,0,0,.3)', flexShrink: 0 }} />
                {label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

export default MapView;
