import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/* Fit map to province bounds */
function FitProvince({ province }: { province: string }) {
  const map = useMap();
  useEffect(() => {
    if (province === 'SL') {
      map.fitBounds([[20.5, 103.1], [22.1, 105.1]], { padding: [30, 30] });
    } else {
      map.fitBounds([[12.9, 107.3], [14.8, 109.5]], { padding: [30, 30] });
    }
  }, [map, province]);
  return null;
}

export default function MapPage() {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const province = localStorage.getItem('selectedProvince') || 'SL';
  const provinceName = province === 'SL' ? 'Sơn La' : 'Gia Lai';
  const [geoData, setGeoData] = useState<any>(null);

  useEffect(() => {
    const file = province === 'SL' ? '/geo/son-la.json' : '/geo/gia-lai.json';
    fetch(file).then(r => r.json()).then(setGeoData).catch(console.error);
  }, [province]);

  const provinceStyle: L.PathOptions = {
    fillColor: '#5D4037',
    fillOpacity: 0.15,
    color: '#3E2723',
    weight: 2.5,
    dashArray: '6 4',
  };

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: 'calc(100vh - 60px)',
      borderRadius: 12,
      overflow: 'hidden',
      boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    }}>
      {/* Province name overlay — large centered text */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1000,
        pointerEvents: 'none',
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: 72,
          fontWeight: 900,
          color: 'rgba(62, 39, 35, 0.12)',
          letterSpacing: 6,
          textTransform: 'uppercase',
          lineHeight: 1,
          userSelect: 'none',
          textShadow: '0 2px 8px rgba(255,255,255,0.3)',
        }}>
          {provinceName}
        </div>
        <div style={{
          fontSize: 16,
          fontWeight: 600,
          color: 'rgba(62, 39, 35, 0.25)',
          marginTop: 8,
          letterSpacing: 3,
          textTransform: 'uppercase',
        }}>
          {lang === 'vi' ? 'SAFE — Bản đồ dự án' : 'SAFE — Project Map'}
        </div>
      </div>

      {/* Legend */}
      <div style={{
        position: 'absolute', bottom: 20, left: 20, zIndex: 1000,
        background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
        borderRadius: 10, padding: '12px 16px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
        fontSize: 13, color: '#3E2723',
      }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>
          {lang === 'vi' ? 'Chú giải' : 'Legend'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 20, height: 14, background: 'rgba(93,64,55,0.15)', border: '2px dashed #3E2723', borderRadius: 3 }} />
          <span>{lang === 'vi' ? 'Ranh giới tỉnh' : 'Province boundary'} — {provinceName}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, opacity: 0.5 }}>
          <div style={{ width: 20, height: 14, background: 'rgba(76,175,80,0.2)', border: '2px solid #4CAF50', borderRadius: 3 }} />
          <span>{lang === 'vi' ? 'Polygon nông trại (sắp có)' : 'Farm polygons (coming soon)'}</span>
        </div>
      </div>

      {/* Info badge */}
      <div style={{
        position: 'absolute', top: 14, left: 14, zIndex: 1000,
        background: 'rgba(62,39,35,0.9)', color: 'white',
        borderRadius: 10, padding: '10px 18px',
        fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8,
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      }}>
        🗺️ {provinceName}
        <span style={{ opacity: 0.6, fontWeight: 400, fontSize: 12 }}>
          | {lang === 'vi' ? 'Zoom để xem chi tiết' : 'Zoom for details'}
        </span>
      </div>

      {/* Leaflet Map */}
      <MapContainer
        center={province === 'SL' ? [21.3, 104.1] : [13.8, 108.4]}
        zoom={9}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; Esri'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          maxZoom={19}
        />
        {/* Labels overlay on satellite */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
          maxZoom={19}
        />

        <FitProvince province={province} />

        {geoData && (
          <GeoJSON
            key={province}
            data={geoData}
            style={() => provinceStyle}
          />
        )}
      </MapContainer>
    </div>
  );
}
