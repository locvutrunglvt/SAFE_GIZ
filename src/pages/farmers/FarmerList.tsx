import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Search, ChevronLeft, ChevronRight, X, Filter } from 'lucide-react';
import pb from '../../lib/pocketbase';

interface Farmer {
  id: string;
  code: string;
  full_name: string;
  gender: string;
  birth_year: number;
  national_id: string;
  phone: string;
  village_id: string;
  group_id: string;
  status: string;
  notes: string;
  expand?: { village_id?: { name: string }; group_id?: { name: string } };
}

const EMPTY: Partial<Farmer> = {
  code: '', full_name: '', gender: 'male', birth_year: undefined,
  national_id: '', phone: '', village_id: '', group_id: '', status: 'active', notes: '',
};

export default function FarmerList() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = i18n.language;
  const province = localStorage.getItem('selectedProvince') || 'SL';
  const [searchParams, setSearchParams] = useSearchParams();
  const groupFilter = searchParams.get('group') || ''; // 'detech' or 'phucsinh'
  const communeParam = searchParams.get('commune') || '';
  const villageParam = searchParams.get('village') || '';

  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editFarmer, setEditFarmer] = useState<Partial<Farmer> | null>(null);
  const [saving, setSaving] = useState(false);
  const [villages, setVillages] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Quick filter states
  const [filterPartner, setFilterPartner] = useState(groupFilter);
  const [filterCommune, setFilterCommune] = useState(communeParam);
  const [filterGroup, setFilterGroup] = useState('');
  const [filterVillage, setFilterVillage] = useState(villageParam);
  const [communes, setCommunes] = useState<any[]>([]);

  const fetchFarmers = useCallback(async () => {
    setLoading(true);
    try {
      const filters: string[] = [];
      // Province filter
      filters.push(`code~"SAFEGIZ-${province}"`);
      // Partner filter
      if (filterPartner === 'detech') {
        filters.push(`(group_id.name~"Detech" || group_id.name~"CẦN BỔ SUNG")`);
      } else if (filterPartner === 'phucsinh') {
        filters.push(`(group_id.name~"Phúc Sinh" || group_id.name="ĐẦY ĐỦ")`);
      }
      // Commune filter
      if (filterCommune) {
        filters.push(`village_id.commune_id="${filterCommune}"`);
      }
      // Village filter
      if (filterVillage) {
        filters.push(`village_id="${filterVillage}"`);
      }
      // Group filter
      if (filterGroup) {
        filters.push(`group_id="${filterGroup}"`);
      }
      if (search) {
        filters.push(`(full_name~"${search}" || code~"${search}" || phone~"${search}" || national_id~"${search}")`);
      }
      const result = await pb.collection('farmers').getList(page, 20, {
        sort: 'code',
        expand: 'village_id,group_id',
        filter: filters.join(' && '),
      });
      setFarmers(result.items as unknown as Farmer[]);
      setTotalPages(result.totalPages);
      setTotalItems(result.totalItems);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [page, search, province, filterPartner, filterCommune, filterVillage, filterGroup]);

  useEffect(() => { fetchFarmers(); }, [fetchFarmers]);

  useEffect(() => {
    (async () => {
      try {
        const [v, g, c] = await Promise.all([
          pb.collection('villages').getFullList({ sort: 'name', filter: `province_code="${province}"` }),
          pb.collection('farmer_groups').getFullList({ sort: 'name' }),
          pb.collection('communes').getFullList({ sort: 'name', filter: `province_code="${province}"` }),
        ]);
        setVillages(v);
        setGroups(g);
        setCommunes(c);
      } catch (e) { console.error(e); }
    })();
  }, [province]);

  const generateNextCode = async () => {
    try {
      const latest = await pb.collection('farmers').getList(1, 1, { sort: '-code' });
      if (latest.items.length > 0) {
        const lastCode = latest.items[0].code as string;
        const match = lastCode.match(/(\d+)$/);
        if (match) {
          const num = parseInt(match[1]) + 1;
          return `SAFEGIZ-${province}${num.toString().padStart(4, '0')}`;
        }
      }
    } catch (e) { /* ignore */ }
    return `SAFEGIZ-${province}0001`;
  };

  const handleAdd = async () => {
    const code = await generateNextCode();
    setEditFarmer({ ...EMPTY, code });
    setShowModal(true);
  };

  const handleEdit = (farmer: Farmer) => {
    setEditFarmer({ ...farmer });
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await pb.collection('farmers').delete(deleteId);
      setDeleteId(null);
      fetchFarmers();
    } catch (e) { console.error(e); alert('Error deleting'); }
  };

  const handleSave = async () => {
    if (!editFarmer || !editFarmer.full_name) return;
    setSaving(true);
    try {
      const data: any = {
        code: editFarmer.code,
        full_name: editFarmer.full_name,
        gender: editFarmer.gender || '',
        birth_year: editFarmer.birth_year || null,
        national_id: editFarmer.national_id || '',
        phone: editFarmer.phone || '',
        village_id: editFarmer.village_id || '',
        group_id: editFarmer.group_id || '',
        status: editFarmer.status || 'active',
        notes: editFarmer.notes || '',
      };
      if (editFarmer.id) {
        await pb.collection('farmers').update(editFarmer.id, data);
      } else {
        await pb.collection('farmers').create(data);
      }
      setShowModal(false);
      setEditFarmer(null);
      fetchFarmers();
    } catch (e: any) {
      alert(e?.message || 'Error saving');
    }
    setSaving(false);
  };

  const setField = (key: string, value: any) => {
    setEditFarmer(prev => prev ? { ...prev, [key]: value } : null);
  };

  return (
    <div className="animate-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{lang === 'vi' ? 'Nông dân' : 'Farmers'}</h1>
          <p className="page-subtitle">
            {lang === 'vi' ? `Tổng cộng ${totalItems.toLocaleString()} nông dân` : `Total ${totalItems.toLocaleString()} farmers`}
            {groupFilter && (
              <span style={{
                marginLeft: 10, display: 'inline-flex', alignItems: 'center', gap: 6,
                background: groupFilter === 'detech' ? '#5D4037' : '#BF360C',
                color: 'white', padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
              }}>
                <Filter size={12} />
                {groupFilter === 'detech' ? 'Detech Coffee' : 'Phúc Sinh (K Coffee)'}
                <button
                  onClick={() => setSearchParams({})}
                  style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 0, display: 'flex' }}
                >
                  <X size={14} />
                </button>
              </span>
            )}
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={handleAdd}>
            <Plus size={16} /> {lang === 'vi' ? 'Thêm mới' : 'Add New'}
          </button>
        </div>
      </div>

      {/* Search + Quick Filters */}
      <div style={{ marginBottom: 16 }}>
        {/* Search row */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#8D6E63' }} />
            <input
              type="text"
              placeholder={lang === 'vi' ? 'Tìm theo tên, mã, SĐT, CCCD...' : 'Search by name, code, phone, ID...'}
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{
                width: '100%', padding: '10px 12px 10px 36px', border: '1.5px solid #D7CCC8',
                borderRadius: 8, fontSize: 14, background: 'white',
              }}
            />
          </div>
        </div>

        {/* Quick Filter Dropdowns */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Filter size={14} style={{ color: '#8D6E63' }} />
          <span style={{ fontSize: 12, color: '#8D6E63', fontWeight: 600 }}>{lang === 'vi' ? 'Lọc:' : 'Filter:'}</span>

          {/* Partner filter */}
          <select value={filterPartner}
            onChange={e => { setFilterPartner(e.target.value); setPage(1); }}
            style={{
              padding: '6px 10px', borderRadius: 8, border: '1.5px solid #D7CCC8',
              fontSize: 12, background: filterPartner ? '#5D4037' : 'white',
              color: filterPartner ? 'white' : '#5D4037', cursor: 'pointer', fontWeight: 600,
            }}>
            <option value="">{lang === 'vi' ? '— Đối tác —' : '— Partner —'}</option>
            <option value="detech">Detech Coffee</option>
            <option value="phucsinh">Phúc Sinh</option>
          </select>

          {/* Commune filter */}
          <select value={filterCommune}
            onChange={e => { setFilterCommune(e.target.value); setFilterVillage(''); setPage(1); }}
            style={{
              padding: '6px 10px', borderRadius: 8, border: '1.5px solid #D7CCC8',
              fontSize: 12, background: filterCommune ? '#2E7D32' : 'white',
              color: filterCommune ? 'white' : '#5D4037', cursor: 'pointer', fontWeight: 600,
            }}>
            <option value="">{lang === 'vi' ? '— Xã —' : '— Commune —'}</option>
            {communes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          {/* Village filter */}
          <select value={filterVillage}
            onChange={e => { setFilterVillage(e.target.value); setPage(1); }}
            style={{
              padding: '6px 10px', borderRadius: 8, border: '1.5px solid #D7CCC8',
              fontSize: 12, background: filterVillage ? '#E64A19' : 'white',
              color: filterVillage ? 'white' : '#5D4037', cursor: 'pointer', fontWeight: 600,
            }}>
            <option value="">{lang === 'vi' ? '— Thôn —' : '— Village —'}</option>
            {(filterCommune ? villages.filter((v: any) => v.commune_id === filterCommune) : villages).map((v: any) =>
              <option key={v.id} value={v.id}>{v.name}</option>
            )}
          </select>

          {/* Group filter */}
          <select value={filterGroup}
            onChange={e => { setFilterGroup(e.target.value); setPage(1); }}
            style={{
              padding: '6px 10px', borderRadius: 8, border: '1.5px solid #D7CCC8',
              fontSize: 12, background: filterGroup ? '#8D6E63' : 'white',
              color: filterGroup ? 'white' : '#5D4037', cursor: 'pointer', fontWeight: 600,
            }}>
            <option value="">{lang === 'vi' ? '— Nhóm —' : '— Group —'}</option>
            {groups.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>

          {/* Clear all */}
          {(filterPartner || filterCommune || filterVillage || filterGroup) && (
            <button onClick={() => { setFilterPartner(''); setFilterCommune(''); setFilterVillage(''); setFilterGroup(''); setPage(1); }}
              style={{
                padding: '5px 10px', borderRadius: 8, border: '1px solid #FFCDD2',
                background: '#FFEBEE', color: '#C62828', fontSize: 11, cursor: 'pointer', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
              <X size={12} /> {lang === 'vi' ? 'Xóa lọc' : 'Clear'}
            </button>
          )}
        </div>

        {/* Active filter chips */}
        {(filterPartner || filterCommune || filterVillage || filterGroup) && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            {filterPartner && (
              <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#5D4037', color: 'white', display: 'flex', alignItems: 'center', gap: 4 }}>
                {filterPartner === 'detech' ? 'Detech' : 'Phúc Sinh'}
                <X size={12} style={{ cursor: 'pointer' }} onClick={() => setFilterPartner('')} />
              </span>
            )}
            {filterCommune && (
              <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#2E7D32', color: 'white', display: 'flex', alignItems: 'center', gap: 4 }}>
                {communes.find((c: any) => c.id === filterCommune)?.name || filterCommune}
                <X size={12} style={{ cursor: 'pointer' }} onClick={() => { setFilterCommune(''); setFilterVillage(''); }} />
              </span>
            )}
            {filterVillage && (
              <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#E64A19', color: 'white', display: 'flex', alignItems: 'center', gap: 4 }}>
                {villages.find((v: any) => v.id === filterVillage)?.name || filterVillage}
                <X size={12} style={{ cursor: 'pointer' }} onClick={() => setFilterVillage('')} />
              </span>
            )}
            {filterGroup && (
              <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#8D6E63', color: 'white', display: 'flex', alignItems: 'center', gap: 4 }}>
                {groups.find((g: any) => g.id === filterGroup)?.name || filterGroup}
                <X size={12} style={{ cursor: 'pointer' }} onClick={() => setFilterGroup('')} />
              </span>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F5F0EB', borderBottom: '2px solid #D7CCC8' }}>
                {['#', lang === 'vi' ? 'Họ và tên' : 'Full Name',
                  lang === 'vi' ? 'Giới tính' : 'Gender', lang === 'vi' ? 'Năm sinh' : 'Birth Year',
                  'CCCD', lang === 'vi' ? 'Điện thoại' : 'Phone',
                  lang === 'vi' ? 'Thôn/Bản' : 'Village', lang === 'vi' ? 'Nhóm' : 'Group',
                  ''
                ].map((h, i) => (
                  <th key={i} style={{ padding: '12px 10px', textAlign: 'left', fontWeight: 600, color: '#5D4037', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#8D6E63' }}>
                  {lang === 'vi' ? 'Đang tải...' : 'Loading...'}
                </td></tr>
              ) : farmers.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#8D6E63' }}>
                  {lang === 'vi' ? 'Không có dữ liệu' : 'No data'}
                </td></tr>
              ) : farmers.map((f, idx) => (
                <tr key={f.id} style={{
                  borderBottom: '1px solid #EFEBE9',
                  background: idx % 2 === 0 ? 'white' : '#FAFAF8',
                  transition: 'background 0.15s',
                  cursor: 'pointer',
                }} onMouseEnter={e => (e.currentTarget.style.background = '#F5F0EB')}
                   onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? 'white' : '#FAFAF8')}
                   onClick={() => navigate(`/farmers/${f.id}`)}>
                  <td style={{ padding: '10px', color: '#A1887F' }}>{(page - 1) * 20 + idx + 1}</td>
                  <td style={{ padding: '10px', fontWeight: 600, color: '#2C2C2C' }}>{f.full_name}</td>
                  <td style={{ padding: '10px' }}>
                    <span style={{
                      background: f.gender === 'male' ? '#E3F2FD' : f.gender === 'female' ? '#FCE4EC' : '#F5F5F5',
                      color: f.gender === 'male' ? '#1565C0' : f.gender === 'female' ? '#C62828' : '#999',
                      padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                    }}>
                      {f.gender === 'male' ? (lang === 'vi' ? 'Nam' : 'Male') : f.gender === 'female' ? (lang === 'vi' ? 'Nữ' : 'Female') : '-'}
                    </span>
                  </td>
                  <td style={{ padding: '10px' }}>{f.birth_year || '-'}</td>
                  <td style={{ padding: '10px', fontFamily: 'monospace', fontSize: 12 }}>{f.national_id || '-'}</td>
                  <td style={{ padding: '10px' }}>{f.phone || '-'}</td>
                  <td style={{ padding: '10px' }}>{f.expand?.village_id?.name || '-'}</td>
                  <td style={{ padding: '10px' }}>{f.expand?.group_id?.name || '-'}</td>
                  <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>
                    <button onClick={() => handleEdit(f)} style={{
                      background: 'none', border: 'none', cursor: 'pointer', color: '#5D4037', padding: 4, borderRadius: 6,
                    }} title="Edit"><Pencil size={15} /></button>
                    <button onClick={() => setDeleteId(f.id)} style={{
                      background: 'none', border: 'none', cursor: 'pointer', color: '#C62828', padding: 4, borderRadius: 6,
                    }} title="Delete"><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', borderTop: '1px solid #EFEBE9', fontSize: 13, color: '#8D6E63',
        }}>
          <span>
            {lang === 'vi'
              ? `Trang ${page}/${totalPages} (${totalItems.toLocaleString()} bản ghi)`
              : `Page ${page}/${totalPages} (${totalItems.toLocaleString()} records)`}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
              style={{ padding: '6px 12px', border: '1px solid #D7CCC8', borderRadius: 6, background: 'white', cursor: page > 1 ? 'pointer' : 'default', opacity: page > 1 ? 1 : 0.4 }}>
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              style={{ padding: '6px 12px', border: '1px solid #D7CCC8', borderRadius: 6, background: 'white', cursor: page < totalPages ? 'pointer' : 'default', opacity: page < totalPages ? 1 : 0.4 }}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && editFarmer && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowModal(false)}>
          <div style={{
            background: 'white', borderRadius: 16, width: 640, maxHeight: '85vh', overflow: 'auto',
            padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#3E2723' }}>
                {editFarmer.id ? (lang === 'vi' ? 'Sửa nông dân' : 'Edit Farmer') : (lang === 'vi' ? 'Thêm nông dân' : 'Add Farmer')}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}><X size={20} /></button>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>{lang === 'vi' ? 'Mã nông dân' : 'Farmer Code'}</label>
                <input value={editFarmer.code || ''} readOnly />
              </div>
              <div className="form-group">
                <label>{lang === 'vi' ? 'Trạng thái' : 'Status'}</label>
                <select value={editFarmer.status || 'active'} onChange={e => setField('status', e.target.value)}>
                  <option value="active">{lang === 'vi' ? 'Hoạt động' : 'Active'}</option>
                  <option value="inactive">{lang === 'vi' ? 'Ngừng' : 'Inactive'}</option>
                </select>
              </div>
              <div className="form-group full-width">
                <label>{lang === 'vi' ? 'Họ và tên' : 'Full Name'} *</label>
                <input value={editFarmer.full_name || ''} onChange={e => setField('full_name', e.target.value)} autoFocus />
              </div>
              <div className="form-group">
                <label>{lang === 'vi' ? 'Giới tính' : 'Gender'}</label>
                <select value={editFarmer.gender || ''} onChange={e => setField('gender', e.target.value)}>
                  <option value="">{lang === 'vi' ? '-- Chọn --' : '-- Select --'}</option>
                  <option value="male">{lang === 'vi' ? 'Nam' : 'Male'}</option>
                  <option value="female">{lang === 'vi' ? 'Nữ' : 'Female'}</option>
                </select>
              </div>
              <div className="form-group">
                <label>{lang === 'vi' ? 'Năm sinh' : 'Birth Year'}</label>
                <input type="number" value={editFarmer.birth_year || ''} onChange={e => setField('birth_year', parseInt(e.target.value) || null)} />
              </div>
              <div className="form-group">
                <label>CMND/CCCD</label>
                <input value={editFarmer.national_id || ''} onChange={e => setField('national_id', e.target.value)} />
              </div>
              <div className="form-group">
                <label>{lang === 'vi' ? 'Số điện thoại' : 'Phone'}</label>
                <input value={editFarmer.phone || ''} onChange={e => setField('phone', e.target.value)} />
              </div>
              <div className="form-group">
                <label>{lang === 'vi' ? 'Thôn/Bản' : 'Village'}</label>
                <select value={editFarmer.village_id || ''} onChange={e => setField('village_id', e.target.value)}>
                  <option value="">{lang === 'vi' ? '-- Chọn --' : '-- Select --'}</option>
                  {villages.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>{lang === 'vi' ? 'Nhóm' : 'Group'}</label>
                <select value={editFarmer.group_id || ''} onChange={e => setField('group_id', e.target.value)}>
                  <option value="">{lang === 'vi' ? '-- Chọn --' : '-- Select --'}</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div className="form-group full-width">
                <label>{lang === 'vi' ? 'Ghi chú' : 'Notes'}</label>
                <input value={editFarmer.notes || ''} onChange={e => setField('notes', e.target.value)} />
              </div>
            </div>

            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                {lang === 'vi' ? 'Hủy' : 'Cancel'}
              </button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? '...' : editFarmer.id ? (lang === 'vi' ? 'Cập nhật' : 'Update') : (lang === 'vi' ? 'Tạo mới' : 'Create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 28, width: 400, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
              {lang === 'vi' ? 'Xác nhận xóa?' : 'Confirm Delete?'}
            </h3>
            <p style={{ color: '#8D6E63', fontSize: 14, marginBottom: 20 }}>
              {lang === 'vi' ? 'Hành động này không thể hoàn tác.' : 'This action cannot be undone.'}
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>
                {lang === 'vi' ? 'Hủy' : 'Cancel'}
              </button>
              <button className="btn-delete" onClick={handleDelete}>
                {lang === 'vi' ? 'Xóa' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
