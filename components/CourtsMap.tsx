'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import Link from 'next/link';
import { useMemo } from 'react';
import type { CourtWithClub } from '@/lib/queries';
import 'leaflet/dist/leaflet.css';

// Default Leaflet marker icons break under bundlers because they ship as relative URLs.
// Rebuild the icon using CDN-hosted PNGs so markers render in production.
const markerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Hong Kong centroid — used when we have no courts to fit around.
const HK_CENTER: [number, number] = [22.3193, 114.1694];

function getLatLng(club: CourtWithClub['club']): [number, number] | null {
  const s = (club as unknown as { settings?: Record<string, unknown> }).settings;
  if (!s) return null;
  const lat = Number((s as Record<string, unknown>).lat);
  const lng = Number((s as Record<string, unknown>).lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return [lat, lng];
}

interface Props {
  courts: CourtWithClub[];
}

export default function CourtsMap({ courts }: Props) {
  // Group courts by club so each pin shows all its courts in one popup
  const groups = useMemo(() => {
    const map = new Map<string, { club: CourtWithClub['club']; latlng: [number, number]; courts: CourtWithClub[] }>();
    for (const c of courts) {
      const latlng = getLatLng(c.club);
      if (!latlng) continue;
      const existing = map.get(c.club.id);
      if (existing) {
        existing.courts.push(c);
      } else {
        map.set(c.club.id, { club: c.club, latlng, courts: [c] });
      }
    }
    return Array.from(map.values());
  }, [courts]);

  const bounds: L.LatLngBoundsExpression | undefined = groups.length > 0
    ? groups.map(g => g.latlng)
    : undefined;

  return (
    <div className="w-full h-[70vh] rounded-2xl overflow-hidden shadow-sm">
      <MapContainer
        center={bounds ? undefined : HK_CENTER}
        zoom={bounds ? undefined : 11}
        bounds={bounds}
        boundsOptions={{ padding: [40, 40] }}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {groups.map(g => (
          <Marker key={g.club.id} position={g.latlng} icon={markerIcon}>
            <Popup>
              <div className="min-w-[180px]">
                <p className="font-bold text-[#1A1A1A] text-base mb-1">{g.club.name}</p>
                {g.club.address && <p className="text-xs text-[#1A1A1A]/60 mb-2">📍 {g.club.address}</p>}
                <ul className="text-xs text-[#1A1A1A]/80 mb-2 space-y-0.5">
                  {g.courts.slice(0, 5).map(c => (
                    <li key={c.id}>
                      • {c.name} <span className="text-[#1A1A1A]/50">({c.surface}{c.indoor ? ' · 室內' : ' · 室外'})</span>
                    </li>
                  ))}
                  {g.courts.length > 5 && <li className="text-[#1A1A1A]/50">⋯ 還有 {g.courts.length - 5} 個場</li>}
                </ul>
                <Link href={`/clubs/${g.club.slug}`} className="text-[#C4A265] font-bold text-xs uppercase tracking-wide hover:underline">
                  查看球會 →
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
