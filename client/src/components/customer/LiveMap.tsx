import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

type Point = { lat: number; lng: number };

const carIcon = L.divIcon({
  className: '',
  html: `<div style="width:40px;height:40px;border-radius:9999px;background:#D32F2F;border:3px solid #fff;box-shadow:0 6px 16px rgba(211,47,47,.45);display:flex;align-items:center;justify-content:center">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2.7-3.6A1 1 0 0 0 14.5 6h-5a1 1 0 0 0-.8.4L6 10l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
  </div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

const pinIcon = (color: string) =>
  L.divIcon({
    className: '',
    html: `<div style="width:18px;height:18px;border-radius:9999px;background:${color};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

/**
 * Live tracking map (OpenStreetMap tiles). The car marker glides to each new GPS fix
 * instead of reloading the whole map like the old Google embed did.
 */
export default function LiveMap({
  car,
  destination,
  studio,
  trail = [],
  className = '',
}: {
  car: Point | null;
  destination?: Point | null;
  studio?: Point | null;
  trail?: Point[];
  className?: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const carMarker = useRef<L.Marker | null>(null);
  const trailLine = useRef<L.Polyline | null>(null);
  const followed = useRef(false);

  useEffect(() => {
    if (!el.current || map.current) return;
    const start = car || destination || studio || { lat: 22.3072, lng: 73.1812 };
    map.current = L.map(el.current, { zoomControl: false, attributionControl: true }).setView([start.lat, start.lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    }).addTo(map.current);
    L.control.zoom({ position: 'bottomright' }).addTo(map.current);
    trailLine.current = L.polyline([], { color: '#D32F2F', weight: 4, opacity: 0.7 }).addTo(map.current);
    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current) return;
    if (destination) L.marker([destination.lat, destination.lng], { icon: pinIcon('#111') }).addTo(map.current).bindTooltip('Drop location');
    if (studio) L.marker([studio.lat, studio.lng], { icon: pinIcon('#9ca3af') }).addTo(map.current).bindTooltip('GK AutoHerb studio');
  }, [destination?.lat, destination?.lng, studio?.lat, studio?.lng]);

  useEffect(() => {
    if (!map.current || !car) return;
    if (!carMarker.current) {
      carMarker.current = L.marker([car.lat, car.lng], { icon: carIcon, zIndexOffset: 1000 }).addTo(map.current);
    } else {
      carMarker.current.setLatLng([car.lat, car.lng]);
    }
    if (!followed.current) {
      const pts: L.LatLngExpression[] = [[car.lat, car.lng]];
      if (destination) pts.push([destination.lat, destination.lng]);
      if (pts.length > 1) map.current.fitBounds(L.latLngBounds(pts), { padding: [50, 50], maxZoom: 16 });
      else map.current.setView([car.lat, car.lng], 16);
      followed.current = true;
    } else if (!map.current.getBounds().pad(-0.15).contains([car.lat, car.lng])) {
      map.current.panTo([car.lat, car.lng], { animate: true });
    }
  }, [car?.lat, car?.lng]);

  useEffect(() => {
    trailLine.current?.setLatLngs(trail.map((p) => [p.lat, p.lng]));
  }, [trail.length]);

  return <div ref={el} className={`w-full h-full ${className}`} />;
}
