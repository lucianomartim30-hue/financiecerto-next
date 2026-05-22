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

const MapView = forwardRef<MapViewHandle, MapViewProps>(function MapView(
  { pins, onPinClick, onBoundsChange },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [pinCount, setPinCount] = useState(0);
  const onBoundsRef = useRef(onBoundsChange);
  useEffect(() => { onBoundsRef.current = onBoundsChange; }, [onBoundsChange]);

  useImperativeHandle(ref, () => ({
    flyTo(lat: number, lng: number, zoom = 14) {
      if (mapRef.current) {
        mapRef.current.flyTo([lat, lng], zoom, { duration: 1.0 });
      }
    },
  }));

  useEffect(() => {
    let destroyed = false;

    async function init() {
      if (!document.getElementById('leaflet-css')) {
        await new Promise<void>(resolve => {
          const link = document.createElement('link');
          link.id   = 'leaflet-css';
          link.rel  = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          link.onload  = () => resolve();
          link.onerror = () => resolve();
          document.head.appendChild(link);
        });
      }
      if (destroyed || !containerRef.current || mapRef.current) return;

      // @ts-expect-error -- leaflet loaded dynamically
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const leafletMod: any = await import('leaflet');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const L: any = leafletMod.default;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(containerRef.current, { center: [-23.55, -46.63], zoom: 11 });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '(c) OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);
      mapRef.current = map;

      const reportBounds = () => {
        const b = map.getBounds();
        onBoundsRef.current?.({
          sw_lat: b.getSouth(), sw_lng: b.getWest(),
          ne_lat: b.getNorth(), ne_lng: b.getEast(),
        });
      };
      map.on('moveend', reportBounds);
      map.on('zoomend', reportBounds);

      if (!destroyed) {
        setMapReady(true);
        setTimeout(reportBounds, 200);
      }
    }

    init();
    return () => {
      destroyed = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = mapRef.current as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    markersRef.current.forEach((m: any) => m.remove());
    markersRef.current = [];

    const validPins = pins.filter(p => p.lat && p.lng);
    setPinCount(validPins.length);
    if (!validPins.length) return;

    // @ts-expect-error -- leaflet loaded dynamically
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    import('leaflet').then((leafletMod: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const L: any = leafletMod.default;
      validPins.forEach(pin => {
        const s = (pin.status || '').toLowerCase();
        const color = s.includes('pronto') || s.includes('entreg') ? '#16a34a'
          : s.includes('obra') || s.includes('constru') || s.includes('andamento') ? '#d97706'
          : '#2563eb';

        const icon = L.divIcon({
          className: '',
          html: '<div style="background:' + color + ';color:#fff;font-size:10px;font-weight:700;padding:3px 8px;border-radius:12px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.3);border:2px solid #fff;cursor:pointer">' + pin.price + '</div>',
          iconAnchor: [24, 12],
        });

        const popup = '<div style="min-width:180px;font-family:system-ui,sans-serif">'
          + '<div style="font-weight:700;font-size:13px;margin-bottom:4px">' + pin.name + '</div>'
          + '<div style="font-size:11px;color:#64748b;margin-bottom:6px">' + pin.neighborhood + '</div>'
          + '<div style="font-size:14px;font-weight:700;color:#2563eb;margin-bottom:8px">' + pin.price + '</div>'
          + '<a href="/imoveis/' + pin.id + '" style="display:block;text-align:center;background:#2563eb;color:#fff;padding:5px 10px;border-radius:6px;font-size:12px;text-decoration:none;font-weight:600">Ver detalhes</a>'
          + '</div>';

        const marker = L.marker([pin.lat, pin.lng], { icon })
          .addTo(map)
          .bindPopup(popup, { maxWidth: 220 });

        if (onPinClick) marker.on('click', () => onPinClick(pin.id));
        markersRef.current.push(marker);
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins, mapReady]);

  const loadingStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f1f5f9',
    zIndex: 10,
  };

  const badgeStyle: React.CSSProperties = {
    position: 'absolute',
    top: 10,
    right: 10,
    background: 'rgba(37,99,235,.9)',
    color: '#fff',
    borderRadius: 20,
    padding: '4px 12px',
    fontSize: 12,
    fontWeight: 700,
    zIndex: 500,
    pointerEvents: 'none',
    boxShadow: '0 2px 8px rgba(0,0,0,.2)',
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {!mapReady && (
        <div style={loadingStyle}>
          <p style={{ color: '#64748b', fontSize: 14 }}>Carregando mapa...</p>
        </div>
      )}
      {mapReady && pinCount > 0 && (
        <div style={badgeStyle}>
          {pinCount} no mapa
        </div>
      )}
    </div>
  );
});

export default MapView;
