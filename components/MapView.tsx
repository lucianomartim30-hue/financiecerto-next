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

function statusLabel(status: string) {
  const s = (status || '').toLowerCase();
  if (s.includes('planta') || s.includes('lanca')) return 'Na Planta';
  if (s.includes('obra')   || s.includes('constru') || s.includes('andamento')) return 'Em Obras';
  if (s.includes('pronto') || s.includes('entreg') || s.includes('conclui')) return 'Pronto';
  return status || 'Outros';
}

const MapView = forwardRef<MapViewHandle, MapViewProps>(function MapView(
  { pins, onPinClick, onBoundsChange },
  ref,
) {
  const containerRef   = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef         = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef     = useRef<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activePopupRef = useRef<any>(null);
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
      const { Map, NavigationControl } = await import('maplibre-gl') as any;

      if (destroyed || !containerRef.current) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const map: any = new Map({
        container: containerRef.current,
        style:  'https://tiles.openfreemap.org/styles/liberty',
        center: [-46.63, -23.55],
        zoom:   11,
        attributionControl: { compact: true },
      });

      // Controles de zoom + bússola (botões + e −)
      map.addControl(new NavigationControl({ showCompass: false }), 'bottom-left');

      mapRef.current = map;

      // Clique no mapa (fora de um pin) fecha o popup aberto
      map.on('click', () => {
        if (activePopupRef.current) {
          activePopupRef.current.remove();
          activePopupRef.current = null;
        }
      });

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

    // Remove pins antigos e fecha popup aberto
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    if (activePopupRef.current) { activePopupRef.current.remove(); activePopupRef.current = null; }

    const validPins = pins.filter(p => p.lat && p.lng);
    setPinCount(validPins.length);
    if (!validPins.length) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    import('maplibre-gl').then((mod: any) => {
      const { Marker, Popup } = mod;

      validPins.forEach(pin => {
        const color = pinColor(pin.status);
        const label = statusLabel(pin.status);

        // ── Bolinha simples colorida por status ────────────────────────────
        const el = document.createElement('div');
        el.style.cssText = 'cursor:pointer;transition:transform .12s;filter:drop-shadow(0 1px 4px rgba(0,0,0,.45))';
        el.innerHTML = `<svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
          <circle cx="9" cy="9" r="7" fill="${color}" stroke="white" stroke-width="2.5"/>
        </svg>`;

        el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.4)'; });
        el.addEventListener('mouseleave', () => { el.style.transform = ''; });

        // Clique → fecha popup anterior e abre o deste imóvel
        el.addEventListener('click', (e) => {
          e.stopPropagation(); // não propaga pro mapa (evita fechar o popup recém-aberto)

          if (activePopupRef.current) {
            activePopupRef.current.remove();
            activePopupRef.current = null;
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const popup: any = new Popup({
            closeButton: true,
            closeOnClick: false,
            maxWidth: '240px',
            offset: 14,
          })
            .setLngLat([pin.lng, pin.lat])
            .setHTML(`
              <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:2px 0 4px;">
                <span style="display:inline-block;background:${color};color:#fff;font-size:9px;font-weight:800;padding:2px 8px;border-radius:5px;text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px;">${label}</span>
                <p style="font-weight:800;font-size:13px;margin:0 0 3px;color:#111827;line-height:1.35;">${pin.name}</p>
                <p style="font-size:11px;color:#6b7280;margin:0 0 7px;">📍 ${pin.neighborhood}</p>
                <p style="font-size:16px;font-weight:900;color:#2563eb;margin:0 0 11px;">${pin.price}</p>
                <a href="/imoveis/${pin.id}"
                  style="display:block;background:#2563eb;color:#fff;text-align:center;padding:9px 12px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:.2px;">
                  Ver imóvel →
                </a>
              </div>
            `)
            .addTo(mapRef.current);

          activePopupRef.current = popup;
        });

        const marker = new Marker({ element: el, anchor: 'center' })
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
          {/* Legenda de cores apenas — contagem já está no painel de cards */}
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

      {/* Estilo do popup MapLibre */}
      <style>{`
        .maplibregl-popup-content {
          border-radius: 12px !important;
          box-shadow: 0 8px 28px rgba(0,0,0,.18) !important;
          padding: 14px 16px !important;
          border: 1px solid #e5e7eb !important;
        }
        .maplibregl-popup-close-button {
          font-size: 18px !important;
          color: #9ca3af !important;
          padding: 4px 8px !important;
          line-height: 1 !important;
        }
        .maplibregl-popup-close-button:hover { color: #374151 !important; }
        .maplibregl-popup-tip { border-top-color: #fff !important; }
      `}</style>
    </div>
  );
});

export default MapView;
