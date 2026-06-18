import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Layers, Eye, EyeOff } from 'lucide-react';

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
  const [communeData, setCommuneData] = useState<any>(null);
  const [showCommunes, setShowCommunes] = useState(true);

  useEffect(() => {
    const provFile = province === 'SL' ? '/geo/son-la.json' : '/geo/gia-lai.json';
    const communeFile = province === 'SL' ? '/geo/sl-communes.json' : '/geo/gl-communes.json';
    fetch(provFile).then(r => r.json()).then(setGeoData).catch(console.error);
    fetch(communeFile).then(r => r.json()).then(setCommuneData).catch(console.error);
  }, [province]);

  /* Province boundary style — GREEN for contrast with satellite */
  const provinceStyle: L.PathOptions = {
    fillColor: '#4CAF50',
    fillOpacity: 0.08,
    color: '#00E676',
    weight: 3,
    opacity: 0.9,
  };

  /* Commune style — bright borders */
  const communeStyle = (feature: any): L.PathOptions => ({
    fillColor: '#FFEB3B',
    fillOpacity: 0.15,
    color: '#FFEB3B',
    weight: 2,
    opacity: 0.8,
  });

  const onEachCommune = (feature: any, layer: L.Layer) => {
    const name = feature.properties?.name || '';
    layer.bindTooltip(name, {
      permanent: false,
      direction: 'center',
      className: 'province-tooltip',
    });
  };

  const communeCount = communeData?.features?.length || 0;

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
          fontSize: 80,
          fontWeight: 900,
          color: 'rgba(255, 255, 255, 0.1)',
          letterSpacing: 8,
          textTransform: 'uppercase',
          lineHeight: 1,
          userSelect: 'none',
        }}>
          {provinceName}
        </div>
        <div style={{
          fontSize: 16,
          fontWeight: 600,
          color: 'rgba(255, 255, 255, 0.15)',
          marginTop: 8,
          letterSpacing: 3,
          textTransform: 'uppercase',
        }}>
          SAFE — GIZ VIETNAM
        </div>
      </div>

      {/* Info badge */}
      <div style={{
        position: 'absolute', top: 14, left: 14, zIndex: 1000,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
        color: 'white',
        borderRadius: 10, padding: '10px 18px',
        fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8,
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      }}>
        🗺️ {provinceName}
        <span style={{ opacity: 0.6, fontWeight: 400, fontSize: 12 }}>
          | {lang === 'vi' ? 'Zoom để xem chi tiết' : 'Zoom for details'}
        </span>
      </div>

      {/* Layer toggle panel */}
      <div style={{
        position: 'absolute', top: 14, right: 14, zIndex: 1000,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
        borderRadius: 12, padding: '14px 16px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        color: 'white', minWidth: 200,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Layers size={15} />
          {lang === 'vi' ? 'Lớp bản đồ' : 'Layers'}
        </div>

        {/* Province boundary — always on */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 13 }}>
          <div style={{ width: 18, height: 12, border: '2px solid #00E676', borderRadius: 2, background: 'rgba(76,175,80,0.15)' }} />
          <span>{lang === 'vi' ? 'Ranh giới tỉnh' : 'Province'}</span>
          <Eye size={14} style={{ marginLeft: 'auto', opacity: 0.5 }} />
        </div>

        {/* Communes toggle */}
        <div
          onClick={() => setShowCommunes(!showCommunes)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
            cursor: 'pointer', padding: '4px 0', opacity: showCommunes ? 1 : 0.5,
            transition: 'opacity 0.2s',
          }}
        >
          <div style={{ width: 18, height: 12, border: '2px solid #FFEB3B', borderRadius: 2, background: showCommunes ? 'rgba(255,235,59,0.2)' : 'transparent' }} />
          <span>
            {lang === 'vi' ? `Xã tham gia (${communeCount})` : `Communes (${communeCount})`}
          </span>
          {showCommunes ? <Eye size={14} style={{ marginLeft: 'auto' }} /> : <EyeOff size={14} style={{ marginLeft: 'auto' }} />}
        </div>

        {/* Future polygon layer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginTop: 8, opacity: 0.35, fontStyle: 'italic' }}>
          <div style={{ width: 18, height: 12, border: '2px dashed #FF9800', borderRadius: 2 }} />
          <span>{lang === 'vi' ? 'Polygon nông trại (sắp có)' : 'Farm polygons (soon)'}</span>
        </div>
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
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
          maxZoom={19}
        />

        <FitProvince province={province} />

        {/* Province boundary — GREEN */}
        {geoData && (
          <GeoJSON
            key={`prov-${province}`}
            data={geoData}
            style={() => provinceStyle}
          />
        )}

        {/* Commune boundaries — toggleable */}
        {showCommunes && communeData && (
          <GeoJSON
            key={`commune-${province}-${showCommunes}`}
            data={communeData}
            style={communeStyle}
            onEachFeature={onEachCommune}
          />
        )}
      </MapContainer>
    </div>
  );
}
