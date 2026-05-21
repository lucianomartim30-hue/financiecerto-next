'use client';

import { useEffect, useRef } from 'react';

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

  useEffect(() => {
    if (!containerRef.current) return;
    let L: typeof import('leaflet');

    async function initMap() {
      L = (await import('leaflet')).default;

      // Fix default icon paths broken by webpack
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (mapRef.current) return; // already initialized

      const map = L.map(containerRef.current!, {
        center: [-23.55, -46.63],
        zoom: 11,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;
    }

    initMap();

    return () => {
      if (mapRef.current) {
        (mapRef.current as { remove: () => void }).remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update markers when pins change
  useEffect(() => {
    if (!mapRef.current) {
      // retry after map initializes
      const timer = setTimeout(() => {
        updateMarkers();
      }, 800);
      return () => clearTimeout(timer);
    }
    updateMarkers();

    function updateMarkers() {
      if (!mapRef.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const map = mapRef.current as any;

      // Clear old markers
      markersRef.current.forEach((m: unknown) => (m as { remove: () => void }).remove());
      markersRef.current = [];

      const validPins = pins.filter(p => p.lat && p.lng);
      if (validPins.length === 0) return;

      import('leaflet').then(({ default: L }) => {
        const customIcon = L.divIcon({
          className: '',
          html: `<div style="
            background:#1a56db;color:#fff;
            font-size:11px;font-weight:700;
            padding:3px 7px;border-radius:12px;
            white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.3);
            border:2px solid #fff;cursor:pointer;
          ">R$</div>`,
          iconAnchor: [20, 12],
        });

        const bounds: [number, number][] = [];

        validPins.forEach(pin => {
          const statusColor = pin.status?.toLowerCase().includes('pronto') ? '#16a34a'
            : pin.status?.toLowerCase().includes('obra') ? '#d97706' : '#1a56db';

          const icon = L.divIcon({
            className: '',
            html: `<div style="
              background:${statusColor};color:#fff;
              font-size:10px;font-weight:700;
              padding:3px 8px;border-radius:12px;
              white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.25);
              border:2px solid #fff;cursor:pointer;line-height:1.4;
            ">${pin.price}</div>`,
            iconAnchor: [24, 12],
          });

          const marker = L.marker([pin.lat, pin.lng], { icon })
            .addTo(map)
            .bindPopup(`
              <div style="min-width:180px;font-family:system-ui,sans-serif">
                <div style="font-weight:700;font-size:13px;margin-bottom:4px;line-height:1.3">${pin.name}</div>
                <div style="font-size:11px;color:#64748b;margin-bottom:6px">${pin.neighborhood}</div>
                <div style="font-size:13px;font-weight:700;color:#1a56db;margin-bottom:8px">${pin.price}</div>
                <a href="/imovel/${pin.id}" style="
                  display:block;text-align:center;background:#1a56db;color:#fff;
                  padding:5px 10px;border-radius:6px;font-size:12px;
                  text-decoration:none;font-weight:600
                ">Ver detalhes</a>
              </div>
            `, { maxWidth: 220 });

          if (onPinClick) {
            marker.on('click', () => onPinClick(pin.id));
          }

          markersRef.current.push(marker);
          bounds.push([pin.lat, pin.lng]);
        });

        if (bounds.length > 0) {
          try {
            map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
          } catch {}
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins]);

  return (
    <>
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%', minHeight: '400px', borderRadius: '0' }}
      />
    </>
  );
}
