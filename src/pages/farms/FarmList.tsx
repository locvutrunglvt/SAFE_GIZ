import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Search, ChevronLeft, ChevronRight, X, MapPin, Filter } from 'lucide-react';
import pb from '../../lib/pocketbase';

interface Farm {
  id: string;
  code: string;
  farmer_id: string;
  coffee_area: number;
  total_area: number;
  tree_count: number;
  crop_type: string;
  polygon_status: string;
  latitude: number;
  longitude: number;
  status: string;
  notes: string;
  expand?: { farmer_id?: { full_name: string; code: string } };
}

const EMPTY: Partial<Farm> = {
  code: '', farmer_id: '', coffee_area: undefined, total_area: undefined,
  tree_count: undefined, crop_type: 'coffee_robusta',
  polygon_status: 'not_collected', latitude: undefined, longitude: undefined,
  status: 'active', notes: '',
};

export default function FarmList() {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const province = localStorage.getItem('selectedProvince') || 'SL';
  const navigate = useNavigate();

  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editFarm, setEditFarm] = useState<Partial<Farm> | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterCrop, setFilterCrop] = useState('');
  const [filterPolygon, setFilterPolygon] = useState('');
  const [sortField, setSortField] = useState('code');
  const [filterPartner, setFilterPartner] = useState('');

  const fetchFarms = useCallback(async () => {
    setLoading(true);
    try {
      const filters: string[] = [];
      // Province filter
      filters.push(`code~"SAFEGIZ-${province}"`);
      if (search) filters.push(`(code~"${search}" || farmer_id.full_name~"${search}" || farmer_id.code~"${search}")`);
      if (filterCrop) filters.push(`crop_type="${filterCrop}"`);
      if (filterPolygon) filters.push(`polygon_status="${filterPolygon}"`);
      if (filterPartner === 'detech') {
        filters.push(`(farmer_id.group_id.name~"Detech" || farmer_id.group_id.name~"CẦN BỔ SUNG")`);
      } else if (filterPartner === 'phucsinh') {
        filters.push(`(farmer_id.group_id.name~"Phúc Sinh" || farmer_id.group_id.name="ĐẦY ĐỦ")`);
      }
      const result = await pb.collection('farms').getList(page, 20, {
        sort: sortField,
        expand: 'farmer_id',
        filter: filters.join(' && '),
      });
      setFarms(result.items as unknown as Farm[]);
      setTotalPages(result.totalPages);
      setTotalItems(result.totalItems);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [page, search, filterCrop, filterPolygon, sortField, province, filterPartner]);

  useEffect(() => { fetchFarms(); }, [fetchFarms]);

  const generateNextCode = async (farmerId?: string) => {
    if (farmerId) {
      try {
        // Get farmer code
        const farmer = await pb.collection('farmers').getOne(farmerId);
        const farmerCode = farmer.code as string;
        // Count existing farms for this farmer
        const existing = await pb.collection('farms').getList(1, 1, { filter: `farmer_id="${farmerId}"` });
        const suffix = (existing.totalItems + 1).toString().padStart(2, '0');
        return `${farmerCode}-${suffix}`;
      } catch { /* fallback */ }
    }
    return `SAFEGIZ-${province}FARM-${Date.now()}`;
  };

  const handleAdd = async () => {
    const code = await generateNextCode();
    setEditFarm({ ...EMPTY, code });
    setShowModal(true);
  };

  const handleEdit = (farm: Farm) => { setEditFarm({ ...farm }); setShowModal(true); };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await pb.collection('farms').delete(deleteId); setDeleteId(null); fetchFarms(); }
    catch (e) { alert('Error deleting'); }
  };

  const handleSave = async () => {
    if (!editFarm) return;
    setSaving(true);
    try {
      const data: any = {
        code: editFarm.code, farmer_id: editFarm.farmer_id || '',
        coffee_area: editFarm.coffee_area || 0, total_area: editFarm.total_area || 0,
        tree_count: editFarm.tree_count || 0, crop_type: editFarm.crop_type || '',
        polygon_status: editFarm.polygon_status || 'not_collected',
        latitude: editFarm.latitude || null, longitude: editFarm.longitude || null,
        status: editFarm.status || 'active', notes: editFarm.notes || '',
      };
      if (editFarm.id) await pb.collection('farms').update(editFarm.id, data);
      else await pb.collection('farms').create(data);
      setShowModal(false); setEditFarm(null); fetchFarms();
    } catch (e: any) { alert(e?.message || 'Error saving'); }
    setSaving(false);
  };

  const setField = (key: string, value: any) => setEditFarm(prev => prev ? { ...prev, [key]: value } : null);

  // @ts-ignore - kept for future use
  const _cropLabel = (c: string) => {
    const m: Record<string, string> = {
      coffee_robusta: lang === 'vi' ? 'Cà phê Robusta' : 'Robusta',
      coffee_arabica: lang === 'vi' ? 'Cà phê Arabica' : 'Arabica',
      mixed: lang === 'vi' ? 'Hỗn hợp' : 'Mixed',
    };
    return m[c] || c;
  };

  const polygonLabel = (p: string) => {
    const m: Record<string, string> = {
      not_collected: lang === 'vi' ? 'Chưa thu thập' : 'Not collected',
      collected: lang === 'vi' ? 'Đã thu thập' : 'Collected',
      verified: lang === 'vi' ? 'Đã xác minh' : 'Verified',
    };
    return m[p] || p;
  };

  const polygonColor = (p: string) => {
    const m: Record<string, { bg: string; color: string }> = {
      not_collected: { bg: '#FFF3E0', color: '#E65100' },
      collected: { bg: '#E8F5E9', color: '#2E7D32' },
      verified: { bg: '#E3F2FD', color: '#1565C0' },
    };
    return m[p] || { bg: '#F5F5F5', color: '#999' };
  };

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{lang === 'vi' ? 'Nông trại' : 'Farms'}</h1>
          <p className="page-subtitle">{lang === 'vi' ? `Tổng cộng ${totalItems.toLocaleString()} nông trại` : `Total ${totalItems.toLocaleString()} farms`}</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={handleAdd}><Plus size={16} /> {lang === 'vi' ? 'Thêm mới' : 'Add New'}</button>
        </div>
      </div>

      {/* Search + Filters */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#8D6E63' }} />
          <input type="text" placeholder={lang === 'vi' ? 'Tìm kiếm...' : 'Search...'} value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1.5px solid #D7CCC8', borderRadius: 8, fontSize: 14 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Filter size={14} style={{ color: '#8D6E63' }} />
          <select value={filterPartner} onChange={e => { setFilterPartner(e.target.value); setPage(1); }}
            style={{ padding: '9px 12px', border: '1.5px solid #D7CCC8', borderRadius: 8, fontSize: 13,
              background: filterPartner ? '#5D4037' : 'white', color: filterPartner ? 'white' : '#5D4037', fontWeight: 600, cursor: 'pointer' }}>
            <option value="">{lang === 'vi' ? '— Đối tác —' : '— Partner —'}</option>
            <option value="detech">Detech Coffee</option>
            <option value="phucsinh">Phúc Sinh</option>
          </select>
          <select value={filterCrop} onChange={e => { setFilterCrop(e.target.value); setPage(1); }}
            style={{ padding: '9px 12px', border: '1.5px solid #D7CCC8', borderRadius: 8, fontSize: 13 }}>
            <option value="">{lang === 'vi' ? 'Tất cả cây trồng' : 'All crops'}</option>
            <option value="coffee_robusta">Robusta</option>
            <option value="coffee_arabica">Arabica</option>
            <option value="mixed">{lang === 'vi' ? 'Hỗn hợp' : 'Mixed'}</option>
          </select>
          <select value={filterPolygon} onChange={e => { setFilterPolygon(e.target.value); setPage(1); }}
            style={{ padding: '9px 12px', border: '1.5px solid #D7CCC8', borderRadius: 8, fontSize: 13 }}>
            <option value="">Polygon Status</option>
            <option value="not_collected">{lang === 'vi' ? 'Chưa thu thập' : 'Not collected'}</option>
            <option value="collected">{lang === 'vi' ? 'Đã thu thập' : 'Collected'}</option>
            <option value="verified">{lang === 'vi' ? 'Đã xác minh' : 'Verified'}</option>
          </select>
          <select value={sortField} onChange={e => setSortField(e.target.value)}
            style={{ padding: '9px 12px', border: '1.5px solid #D7CCC8', borderRadius: 8, fontSize: 13 }}>
            <option value="code">{lang === 'vi' ? 'Sắp xếp: Mã' : 'Sort: Code'}</option>
            <option value="-coffee_area">{lang === 'vi' ? 'Sắp xếp: Diện tích ↓' : 'Sort: Area ↓'}</option>
            <option value="coffee_area">{lang === 'vi' ? 'Sắp xếp: Diện tích ↑' : 'Sort: Area ↑'}</option>
            <option value="-created">{lang === 'vi' ? 'Sắp xếp: Mới nhất' : 'Sort: Newest'}</option>
          </select>
          {(filterPartner || filterCrop || filterPolygon) && (
            <button onClick={() => { setFilterPartner(''); setFilterCrop(''); setFilterPolygon(''); setPage(1); }}
              style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid #FFCDD2', background: '#FFEBEE', color: '#C62828', fontSize: 11, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              <X size={12} /> {lang === 'vi' ? 'Xóa lọc' : 'Clear'}
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F5F0EB', borderBottom: '2px solid #D7CCC8' }}>
                {['#', lang === 'vi' ? 'Tên nông dân' : 'Farmer Name',
                  lang === 'vi' ? 'DT Cà phê (ha)' : 'Coffee Area (ha)',
                  lang === 'vi' ? 'Số vườn' : 'Plots', 'Polygon', ''
                ].map((h, i) => (
                  <th key={i} style={{ padding: '12px 10px', textAlign: 'left', fontWeight: 600, color: '#5D4037', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#8D6E63' }}>{lang === 'vi' ? 'Đang tải...' : 'Loading...'}</td></tr>
              ) : farms.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#8D6E63' }}>
                  <MapPin size={32} style={{ opacity: 0.3, marginBottom: 8 }} /><br/>
                  {lang === 'vi' ? 'Chưa có nông trại nào' : 'No farms yet'}
                </td></tr>
              ) : farms.map((f, idx) => (
                <tr key={f.id} style={{
                  borderBottom: '1px solid #EFEBE9', background: idx % 2 === 0 ? 'white' : '#FAFAF8', transition: 'background 0.15s',
                }} onMouseEnter={e => (e.currentTarget.style.background = '#F5F0EB')}
                   onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? 'white' : '#FAFAF8')}>
                  <td style={{ padding: '10px', color: '#A1887F' }}>{(page - 1) * 20 + idx + 1}</td>
                  <td style={{ padding: '10px', fontWeight: 500, cursor: 'pointer', color: '#5D4037', textDecoration: 'underline' }}
                    onClick={() => f.farmer_id && navigate(`/farmers/${f.farmer_id}`)}>{f.expand?.farmer_id?.full_name || '-'}</td>
                  <td style={{ padding: '10px', fontWeight: 600 }}>{f.coffee_area ? f.coffee_area.toFixed(2) : '-'}</td>
                  <td style={{ padding: '10px' }}>{f.tree_count || '-'}</td>
                  <td style={{ padding: '10px' }}>
                    <span style={{ ...polygonColor(f.polygon_status), padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
                      {polygonLabel(f.polygon_status)}
                    </span>
                  </td>
                  <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>
                    <button onClick={() => handleEdit(f)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5D4037', padding: 4 }}><Pencil size={15} /></button>
                    <button onClick={() => setDeleteId(f.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C62828', padding: 4 }}><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid #EFEBE9', fontSize: 13, color: '#8D6E63' }}>
          <span>{lang === 'vi' ? `Trang ${page}/${totalPages} (${totalItems} bản ghi)` : `Page ${page}/${totalPages} (${totalItems} records)`}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} style={{ padding: '6px 12px', border: '1px solid #D7CCC8', borderRadius: 6, background: 'white', cursor: page > 1 ? 'pointer' : 'default', opacity: page > 1 ? 1 : 0.4 }}><ChevronLeft size={16} /></button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} style={{ padding: '6px 12px', border: '1px solid #D7CCC8', borderRadius: 6, background: 'white', cursor: page < totalPages ? 'pointer' : 'default', opacity: page < totalPages ? 1 : 0.4 }}><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && editFarm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'white', borderRadius: 16, width: 580, maxHeight: '85vh', overflow: 'auto', padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#3E2723' }}>{editFarm.id ? (lang === 'vi' ? 'Sửa nông trại' : 'Edit Farm') : (lang === 'vi' ? 'Thêm nông trại' : 'Add Farm')}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}><X size={20} /></button>
            </div>
            <div className="form-grid">
              <div className="form-group"><label>{lang === 'vi' ? 'Mã nông trại' : 'Farm Code'}</label><input value={editFarm.code || ''} readOnly /></div>
              <div className="form-group"><label>{lang === 'vi' ? 'Cây trồng' : 'Crop Type'}</label>
                <select value={editFarm.crop_type || ''} onChange={e => setField('crop_type', e.target.value)}>
                  <option value="coffee_robusta">Robusta</option><option value="coffee_arabica">Arabica</option><option value="mixed">{lang === 'vi' ? 'Hỗn hợp' : 'Mixed'}</option>
                </select></div>
              <div className="form-group"><label>{lang === 'vi' ? 'DT Cà phê (ha)' : 'Coffee Area (ha)'}</label><input type="number" step="0.01" value={editFarm.coffee_area || ''} onChange={e => setField('coffee_area', parseFloat(e.target.value) || null)} /></div>
              <div className="form-group"><label>{lang === 'vi' ? 'Số vườn' : 'Plots'}</label><input type="number" value={editFarm.tree_count || ''} onChange={e => setField('tree_count', parseInt(e.target.value) || null)} /></div>
              <div className="form-group"><label>Polygon Status</label>
                <select value={editFarm.polygon_status || ''} onChange={e => setField('polygon_status', e.target.value)}>
                  <option value="not_collected">{lang === 'vi' ? 'Chưa thu thập' : 'Not collected'}</option><option value="collected">{lang === 'vi' ? 'Đã thu thập' : 'Collected'}</option><option value="verified">{lang === 'vi' ? 'Đã xác minh' : 'Verified'}</option>
                </select></div>
              <div className="form-group"><label>Latitude</label><input type="number" step="0.0001" value={editFarm.latitude || ''} onChange={e => setField('latitude', parseFloat(e.target.value) || null)} /></div>
              <div className="form-group"><label>Longitude</label><input type="number" step="0.0001" value={editFarm.longitude || ''} onChange={e => setField('longitude', parseFloat(e.target.value) || null)} /></div>
              <div className="form-group full-width"><label>{lang === 'vi' ? 'Ghi chú' : 'Notes'}</label><input value={editFarm.notes || ''} onChange={e => setField('notes', e.target.value)} /></div>
            </div>
            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>{lang === 'vi' ? 'Hủy' : 'Cancel'}</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? '...' : editFarm.id ? (lang === 'vi' ? 'Cập nhật' : 'Update') : (lang === 'vi' ? 'Tạo mới' : 'Create')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 28, width: 400, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{lang === 'vi' ? 'Xác nhận xóa?' : 'Confirm Delete?'}</h3>
            <p style={{ color: '#8D6E63', fontSize: 14, marginBottom: 20 }}>{lang === 'vi' ? 'Hành động này không thể hoàn tác.' : 'This action cannot be undone.'}</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>{lang === 'vi' ? 'Hủy' : 'Cancel'}</button>
              <button className="btn-delete" onClick={handleDelete}>{lang === 'vi' ? 'Xóa' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
