import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import { Shield, MapPin, Zap } from 'lucide-react';

// Fix Leaflet marker icon issue in React using CDN
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapPoint {
  id: string;
  type: 'NGO' | 'Mission' | 'Sector';
  name: string;
  location: [number, number];
  description?: string;
  urgency?: 'Low' | 'Medium' | 'High';
}

interface TacticalMapProps {
  ngos: any[];
  missions: any[];
}

// Tactical Sectors (Constant coordinates for consistent visualization)
const SECTORS: MapPoint[] = [
  { id: 'sec-1', type: 'Sector', name: 'Sector Bravo', location: [51.505, -0.09], description: 'Primary logistics hub' },
  { id: 'sec-2', type: 'Sector', name: 'Sector Alpha', location: [51.515, -0.1], description: 'Field communications center' },
  { id: 'sec-3', type: 'Sector', name: 'Sector Delta', location: [51.49, -0.07], description: 'Medical staging area' },
];

export const TacticalMap: React.FC<TacticalMapProps> = ({ ngos, missions }) => {
  // Utility to generate random offset coordinates for visual variety based on location strings
  const getCoords = (location: string, index: number): [number, number] => {
    // Determine base sector based on location string hash
    const hash = location.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const base = SECTORS[hash % SECTORS.length].location;
    return [
      base[0] + (Math.sin(index + hash) * 0.01),
      base[1] + (Math.cos(index + hash) * 0.01)
    ];
  };

  return (
    <div className="w-full h-[600px] rounded-[3rem] overflow-hidden border-4 border-stone-100 shadow-2xl relative">
      <div className="absolute top-6 left-6 z-[1000] flex flex-col gap-2">
        <div className="px-4 py-2 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-stone-200 flex items-center gap-3">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-mono font-bold text-stone-900 uppercase tracking-widest">Active Ops Stream</span>
        </div>
        <div className="flex gap-2">
            <div className="px-3 py-1.5 bg-stone-900 text-white rounded-xl text-[8px] font-black uppercase tracking-widest flex items-center gap-2">
                <Shield className="w-3 h-3 text-emerald-400" /> NGO
            </div>
            <div className="px-3 py-1.5 bg-stone-900 text-white rounded-xl text-[8px] font-black uppercase tracking-widest flex items-center gap-2">
                <Zap className="w-3 h-3 text-amber-400" /> Mission
            </div>
        </div>
      </div>

      <MapContainer 
        center={[51.505, -0.09]} 
        zoom={13} 
        style={{ height: '100%', width: '100%', background: '#f5f5f4' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        {/* Tactical Sectors */}
        {SECTORS.map(sec => (
          <Circle 
            key={sec.id}
            center={sec.location}
            radius={800}
            pathOptions={{ fillColor: '#10b981', fillOpacity: 0.05, color: '#10b981', weight: 1, dashArray: '5, 10' }}
          >
            <Popup>
              <div className="p-2">
                <h4 className="font-black text-stone-900 uppercase tracking-tighter mb-1">{sec.name}</h4>
                <p className="text-[10px] text-stone-500 font-medium">{sec.description}</p>
              </div>
            </Popup>
          </Circle>
        ))}

        {/* NGOs */}
        {ngos.map((ngo, idx) => {
          const pos = getCoords(ngo.location || 'Global', idx);
          return (
            <Marker key={ngo.uid} position={pos}>
               <Popup>
                 <div className="p-3 w-48">
                    <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-4 h-4 text-emerald-600" />
                        <h4 className="font-black text-stone-900 uppercase tracking-tighter text-sm">{ngo.name}</h4>
                    </div>
                    <p className="text-[10px] text-stone-500 font-medium mb-2">{ngo.location || 'Tactical Sector Unassigned'}</p>
                    <div className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[8px] font-bold rounded-lg uppercase tracking-widest inline-block">
                        Hub Verified
                    </div>
                 </div>
               </Popup>
            </Marker>
          );
        })}

        {/* Missions */}
        {missions.map((m, idx) => {
          const pos = getCoords(m.location || 'Sector Alpha', idx + 100);
          return (
            <Circle 
              key={m.id}
              center={pos}
              radius={200}
              pathOptions={{ 
                fillColor: m.urgency === 'High' ? '#f43f5e' : '#f59e0b', 
                fillOpacity: 0.4, 
                color: m.urgency === 'High' ? '#f43f5e' : '#f59e0b',
                weight: 2
              }}
            >
               <Popup>
                 <div className="p-3 w-56">
                    <div className="flex items-center gap-2 mb-2">
                        <Zap className={`w-4 h-4 ${m.urgency === 'High' ? 'text-rose-600' : 'text-amber-600'}`} />
                        <h4 className="font-black text-stone-900 uppercase tracking-tighter text-sm">{m.title}</h4>
                    </div>
                    <div className="text-[10px] text-stone-500 font-medium mb-3 line-clamp-2">
                        {m.aiSummary || m.description}
                    </div>
                    <div className="flex items-center justify-between">
                         <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-md ${
                            m.urgency === 'High' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                         }`}>
                             {m.urgency} Priority
                         </span>
                         <span className="text-[9px] font-mono text-stone-400 font-bold">
                            {m.peopleAffected}+ Affected
                         </span>
                    </div>
                 </div>
               </Popup>
            </Circle>
          );
        })}
      </MapContainer>
    </div>
  );
};
