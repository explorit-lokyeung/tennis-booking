'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import Link from 'next/link';
import { useMemo, useState, useCallback } from 'react';
import type { CourtWithClub } from '@/lib/queries';
import 'leaflet/dist/leaflet.css';

const markerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const activeIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [30, 49],
  iconAnchor: [15, 49],
  popupAnchor: [1, -40],
  shadowSize: [49, 49],
});

const HK_CENTER: [number, number] = [22.3193, 114.1694];

type ClubGroup = { club: CourtWithClub['club']; latlng: [number, number]; courts: CourtWithClub[] };

function getLatLng(club: CourtWithClub['club']): [number, number] | null {
  const s = (club as unknown as { settings?: Record<string, unknown> }).settings;
  if (!s) return null;
  const lat = Number((s as Record<string, unknown>).lat);
  const lng = Number((s as Record<string, unknown>).lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return [lat, lng];
}

function FlyTo({ target }: { target: [number, number] | null }) {
  const map = useMap();
  if (target) map.flyTo(target, 14, { duration: 0.8 });
  return null;
}

interface Props {
  courts: CourtWithClub[];
  showSidebar?: boolean;
}

export default function CourtsMap({ courts, showSidebar = false }: Props) {
  const [activeClub, setActiveClub] = useState<string | null>(null);
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);

  const groups = useMemo(() => {
    const map = new Map<string, ClubGroup>();
    for (const c of courts) {
      const latlng = getLatLng(c.club);
      if (!latlng) continue;
      const existing = map.get(c.club.id);
      if (existing) { existing.courts.push(c); }
      else { map.set(c.club.id, { club: c.club, latlng, courts: [c] }); }
    }
    return Array.from(map.values());
  }, [courts]);

  const bounds: L.LatLngBoundsExpression | undefined = groups.length > 0
    ? groups.map(g => g.latlng) : undefined;

  const handleClubClick = useCallback((g: ClubGroup) => {
    setActiveClub(g.club.id);
    setFlyTarget(g.latlng);
    // Reset fly target after animation
    setTimeout(() => setFlyTarget(null), 1000);
  }, []);

  const sidebar = showSidebar && (
    <div className="w-72 flex-shrink-0 bg-white overflow-y-auto border-r border-[#1A1A1A]/10">
      <div className="p-3 border-b border-[#1A1A1A]/10">
        <p className="text-xs font-bold text-[#1A1A1A]/50 uppercase tracking-wider">{groups.length} 個球會</p>
      </div>
      <div className="divide-y divide-[#1A1A1A]/5">
        {groups.map(g => (
          <button
            key={g.club.id}
            onClick={() => handleClubClick(g)}
            className={`w-full text-left p-3 hover:bg-[#FFF8F0] transition-colors ${
              activeClub === g.club.id ? 'bg-[#C4A265]/10 border-l-2 border-[#C4A265]' : ''
            }`}
          >
            <p className="font-bold text-sm text-[#1A1A1A] leading-tight">{g.club.name}</p>
            {g.club.address && (
              <p className="text-[11px] text-[#1A1A1A]/50 mt-0.5 leading-tight">{g.club.address}</p>
            )}
            <p className="text-[11px] text-[#C4A265] font-semibold mt-1">{g.courts.length} 個球場</p>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className={`w-full rounded-2xl overflow-hidden shadow-sm flex ${showSidebar ? 'h-[70vh]' : 'h-[50vh]'}`}>
      {sidebar}
      <div className="flex-1 relative">
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
          <FlyTo target={flyTarget} />
          {groups.map(g => (
            <Marker
              key={g.club.id}
              position={g.latlng}
              icon={activeClub === g.club.id ? activeIcon : markerIcon}
              eventHandlers={{ click: () => setActiveClub(g.club.id) }}
            >
              <Popup>
                <div className="min-w-[180px]">
                  <p className="font-bold text-[#1A1A1A] text-base mb-1">{g.club.name}</p>
                  {g.club.address && <p className="text-xs text-[#1A1A1A]/60 mb-2">{g.club.address}</p>}
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
    </div>
  );
}
