import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface ProvinceMapProps {
  lang: string;
  onSelectProvince?: (code: string) => void;
}

/* Fit map to both provinces */
function FitBounds() {
  const map = useMap();
  useEffect(() => {
    // Fit to Vietnam bounds covering Son La + Gia Lai
    map.fitBounds([
      [12.5, 103], // SW
      [22.5, 110], // NE
    ]);
  }, [map]);
  return null;
}

export default function ProvinceMap({ lang, onSelectProvince }: ProvinceMapProps) {
  const [slGeo, setSlGeo] = useState<any>(null);
  const [glGeo, setGlGeo] = useState<any>(null);
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);

  useEffect(() => {
    fetch('/geo/son-la.json').then(r => r.json()).then(setSlGeo);
    fetch('/geo/gia-lai.json').then(r => r.json()).then(setGlGeo);
  }, []);

  const provinceStyle = (code: string): L.PathOptions => ({
    fillColor: code === 'SL' ? '#5D4037' : '#8D6E63',
    fillOpacity: hoveredProvince === code ? 0.5 : 0.3,
    color: code === 'SL' ? '#3E2723' : '#5D4037',
    weight: hoveredProvince === code ? 3 : 2,
    dashArray: hoveredProvince === code ? undefined : '4 4',
  });

  const onEachFeature = (code: string, nameVi: string, nameEn: string) => (feature: any, layer: L.Layer) => {
    const name = lang === 'vi' ? nameVi : nameEn;
    layer.bindTooltip(name, {
      permanent: false,
      direction: 'center',
      className: 'province-tooltip',
    });
    layer.on({
      mouseover: () => setHoveredProvince(code),
      mouseout: () => setHoveredProvince(null),
      click: () => onSelectProvince?.(code),
    });
  };

  return (
    <div style={{
      borderRadius: 16, overflow: 'hidden',
      border: '1px solid #E8E0DB',
      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
      height: '100%', minHeight: 340,
    }}>
      <MapContainer
        center={[16.5, 106.5]}
        zoom={6}
        style={{ height: '100%', width: '100%', borderRadius: 16 }}
        scrollWheelZoom={true}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <FitBounds />

        {slGeo && (
          <GeoJSON
            key="sl"
            data={slGeo}
            style={() => provinceStyle('SL')}
            onEachFeature={onEachFeature('SL', 'Sơn La', 'Son La')}
          />
        )}
        {glGeo && (
          <GeoJSON
            key="gl"
            data={glGeo}
            style={() => provinceStyle('GL')}
            onEachFeature={onEachFeature('GL', 'Gia Lai', 'Gia Lai')}
          />
        )}
      </MapContainer>
    </div>
  );
}
