import { useState, useEffect } from 'react';
import { } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Plus, Search, Eye, Edit3, Trash2, ChevronRight, ChevronDown,
  X, Save, ArrowLeft, ArrowRight
} from 'lucide-react';
import pb from '../../lib/pocketbase';

/* ───────── QUESTION DEFINITIONS ───────── */
interface QDef {
  code: string; labelVi: string; labelEn: string;
  type: 'text' | 'number' | 'bool' | 'select' | 'json';
  options?: string[]; required?: boolean; depends?: string; unit?: string;
}

const SECTIONS: { key: string; labelVi: string; labelEn: string; icon: string; questions: QDef[] }[] = [
  { key: 'A', labelVi: 'A. Thông tin farm', labelEn: 'A. Farm Info', icon: '🏡', questions: [
    { code: 'FdQ_A01', labelVi: 'Mã farm', labelEn: 'Farm ID', type: 'text', required: true },
    { code: 'FdQ_A02', labelVi: 'Thuộc nông hộ', labelEn: 'Farmer', type: 'text', required: true },
    { code: 'FdQ_A03', labelVi: 'Tên lô/vườn', labelEn: 'Plot name', type: 'text' },
    { code: 'FdQ_A04', labelVi: 'Vĩ độ (GPS)', labelEn: 'Latitude', type: 'number', required: true },
    { code: 'FdQ_A05', labelVi: 'Kinh độ (GPS)', labelEn: 'Longitude', type: 'number', required: true },
    { code: 'FdQ_A06', labelVi: 'Polygon (GeoJSON)', labelEn: 'Polygon', type: 'text' },
    { code: 'FdQ_A07', labelVi: 'Nguồn polygon', labelEn: 'Polygon source', type: 'select', options: ['phone_gps', 'kml_import', 'manual'] },
  ]},
  { key: 'B', labelVi: 'B. Diện tích & QSDĐ', labelEn: 'B. Area & Land', icon: '📐', questions: [
    { code: 'FdQ_B01', labelVi: 'Tổng diện tích (ha)', labelEn: 'Total area (ha)', type: 'number', required: true, unit: 'ha' },
    { code: 'FdQ_B02', labelVi: 'DT cà phê (ha)', labelEn: 'Coffee area (ha)', type: 'number', required: true, unit: 'ha' },
    { code: 'FdQ_B03', labelVi: 'DT chứng nhận (ha)', labelEn: 'Certified area', type: 'number', unit: 'ha' },
    { code: 'FdQ_B04', labelVi: 'Quyền sở hữu đất', labelEn: 'Land ownership', type: 'select', options: ['owner', 'joint', 'rented'], required: true },
    { code: 'FdQ_B05', labelVi: 'Đất trước 31/12/2014 là gì?', labelEn: 'Land before 2014', type: 'select', options: ['forest', 'crops', 'old_coffee', 'unknown'], required: true },
    { code: 'FdQ_B06', labelVi: 'Giáp rừng tự nhiên?', labelEn: 'Borders natural forest?', type: 'bool', required: true },
  ]},
  { key: 'C', labelVi: 'C. Cây trồng', labelEn: 'C. Crops', icon: '🌱', questions: [
    { code: 'FdQ_C01', labelVi: 'Giống cà phê', labelEn: 'Coffee variety', type: 'select', options: ['robusta', 'arabica', 'mixed'], required: true },
    { code: 'FdQ_C02', labelVi: 'Số cây cà phê', labelEn: 'Tree count', type: 'number' },
    { code: 'FdQ_C03', labelVi: 'Mật độ (cây/ha)', labelEn: 'Density (trees/ha)', type: 'number' },
    { code: 'FdQ_C04', labelVi: 'Năm trồng', labelEn: 'Planted year', type: 'number' },
    { code: 'FdQ_C05', labelVi: 'Phân bổ tuổi cây (%)', labelEn: 'Tree age distribution (%)', type: 'text' },
    { code: 'FdQ_C06', labelVi: 'Kiểu canh tác', labelEn: 'Land use type', type: 'select', options: ['monoculture', 'intercrop', 'diverse'] },
    { code: 'FdQ_C07', labelVi: 'Cây xen canh (loại, SL)', labelEn: 'Intercrop details', type: 'text' },
    { code: 'FdQ_C08', labelVi: 'Sản lượng năm trước (tấn)', labelEn: 'Last year yield (ton)', type: 'number', unit: 'tấn' },
    { code: 'FdQ_C09', labelVi: 'Sản lượng dự kiến (tấn)', labelEn: 'Yield estimate (ton)', type: 'number', unit: 'tấn' },
  ]},
  { key: 'D', labelVi: 'D. Cây che bóng', labelEn: 'D. Shade Trees', icon: '🌳', questions: [
    { code: 'FdQ_D01', labelVi: 'Mức che bóng', labelEn: 'Shade level', type: 'select', options: ['none_0_5', 'low_6_20', 'med_21_40', 'high_41+'] },
    { code: 'FdQ_D02', labelVi: 'Loài cây che bóng', labelEn: 'Shade tree species', type: 'text' },
    { code: 'FdQ_D03', labelVi: 'Số cây che bóng', labelEn: 'Shade tree count', type: 'number' },
    { code: 'FdQ_D04', labelVi: '% thảm phủ tự nhiên', labelEn: 'Natural vegetation %', type: 'number', unit: '%' },
  ]},
  { key: 'E', labelVi: 'E. Phân bón', labelEn: 'E. Fertilizer', icon: '🧪', questions: [
    { code: 'FdQ_E01', labelVi: 'Phân hữu cơ mua (kg/năm)', labelEn: 'Organic bought (kg/yr)', type: 'number', unit: 'kg' },
    { code: 'FdQ_E02', labelVi: 'Phân hữu cơ tự SX (kg/năm)', labelEn: 'Organic homemade (kg/yr)', type: 'number', unit: 'kg' },
    { code: 'FdQ_E03', labelVi: 'Phân vô cơ (kg/năm)', labelEn: 'Inorganic (kg/yr)', type: 'number', unit: 'kg' },
    { code: 'FdQ_E04', labelVi: 'Loại phân vô cơ', labelEn: 'Inorganic type', type: 'text' },
  ]},
  { key: 'F', labelVi: 'F. Thuốc BVTV', labelEn: 'F. Pesticides', icon: '🔬', questions: [
    { code: 'FdQ_F01', labelVi: 'Có sử dụng thuốc trừ sâu?', labelEn: 'Use insecticide?', type: 'bool' },
    { code: 'FdQ_F02', labelVi: 'Tên thuốc trừ sâu', labelEn: 'Insecticide name', type: 'text', depends: 'FdQ_F01' },
    { code: 'FdQ_F03', labelVi: 'Liều lượng (lít hoặc kg)', labelEn: 'Dosage', type: 'number', depends: 'FdQ_F01' },
    { code: 'FdQ_F04', labelVi: 'Có sử dụng thuốc trừ nấm?', labelEn: 'Use fungicide?', type: 'bool' },
    { code: 'FdQ_F05', labelVi: 'Tên thuốc trừ nấm', labelEn: 'Fungicide name', type: 'text', depends: 'FdQ_F04' },
    { code: 'FdQ_F06', labelVi: 'Có sử dụng thuốc diệt cỏ?', labelEn: 'Use herbicide?', type: 'bool' },
    { code: 'FdQ_F07', labelVi: 'Tên thuốc diệt cỏ', labelEn: 'Herbicide name', type: 'text', depends: 'FdQ_F06' },
  ]},
  { key: 'G', labelVi: 'G. Sâu bệnh', labelEn: 'G. Pests & Diseases', icon: '🐛', questions: [
    { code: 'FdQ_G01', labelVi: 'Tỷ lệ nhiễm rệp sáp (%)', labelEn: 'Mealybug %', type: 'number', unit: '%' },
    { code: 'FdQ_G02', labelVi: 'Tỷ lệ nhiễm tuyến trùng (%)', labelEn: 'Nematode %', type: 'number', unit: '%' },
    { code: 'FdQ_G03', labelVi: 'Tỷ lệ nhiễm rỉ sắt (%)', labelEn: 'Rust %', type: 'number', unit: '%' },
    { code: 'FdQ_G04', labelVi: 'Tỷ lệ nhiễm mọt cành (%)', labelEn: 'Stem borer %', type: 'number', unit: '%' },
    { code: 'FdQ_G05', labelVi: 'Tỷ lệ khô cành (%)', labelEn: 'Dieback %', type: 'number', unit: '%' },
    { code: 'FdQ_G06', labelVi: 'Biện pháp can thiệp', labelEn: 'Intervention', type: 'text' },
  ]},
  { key: 'H', labelVi: 'H. Tưới nước', labelEn: 'H. Irrigation', icon: '💧', questions: [
    { code: 'FdQ_H01', labelVi: 'Số đợt tưới/năm', labelEn: 'Irrigation rounds/yr', type: 'number' },
    { code: 'FdQ_H02', labelVi: 'Lượng nước tưới (lít/cây)', labelEn: 'Liters per tree', type: 'number', unit: 'L' },
    { code: 'FdQ_H03', labelVi: 'Kiểu tưới', labelEn: 'Irrigation type', type: 'select', options: ['basin', 'sprinkler', 'drip', 'saving'] },
    { code: 'FdQ_H04', labelVi: 'Nguồn nước tưới', labelEn: 'Water source', type: 'select', options: ['rain', 'well', 'river', 'canal'] },
  ]},
  { key: 'I', labelVi: 'I. Năng lượng', labelEn: 'I. Energy', icon: '⚡', questions: [
    { code: 'FdQ_I01', labelVi: 'Xăng sử dụng (lít/năm)', labelEn: 'Gasoline (L/yr)', type: 'number', unit: 'L' },
    { code: 'FdQ_I02', labelVi: 'Dầu diesel (lít/năm)', labelEn: 'Diesel (L/yr)', type: 'number', unit: 'L' },
    { code: 'FdQ_I03', labelVi: 'Điện (kWh/năm)', labelEn: 'Electric (kWh/yr)', type: 'number', unit: 'kWh' },
    { code: 'FdQ_I04', labelVi: 'Nước chế biến (lít/năm)', labelEn: 'Processing water (L/yr)', type: 'number', unit: 'L' },
    { code: 'FdQ_I05', labelVi: 'Nước thải (lít/năm)', labelEn: 'Waste water (L/yr)', type: 'number', unit: 'L' },
  ]},
  { key: 'J', labelVi: 'J. Sông suối', labelEn: 'J. Rivers & Waterways', icon: '🏞️', questions: [
    { code: 'FdQ_J01', labelVi: 'Farm giáp sông/suối?', labelEn: 'Near river/stream?', type: 'bool', required: true },
    { code: 'FdQ_J02', labelVi: 'Khoảng cách vùng đệm (m)', labelEn: 'Buffer zone distance (m)', type: 'number', depends: 'FdQ_J01', unit: 'm' },
  ]},
];

const ALL_QUESTIONS = SECTIONS.flatMap(s => s.questions);
const TOTAL_Q = ALL_QUESTIONS.length;

/* ───────── COMPONENT ───────── */
export default function FieldQuest() {
  const { i18n } = useTranslation();
  const lang = i18n.language === 'vi' ? 'vi' : 'en';

  // Data
  type Rec = Record<string, any>;
  const [items, setItems] = useState<Rec[]>([]);
  const [farmers, setFarmers] = useState<Rec[]>([]);
  const [farms, setFarms] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal
  const [modal, setModal] = useState<'add' | 'edit' | 'view' | null>(null);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<Rec>({});
  const [answers, setAnswers] = useState<Rec>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ A: true });
  const [deleteId, setDeleteId] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const perPage = 20;

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [fr, fa] = await Promise.all([
        pb.collection('farmers').getFullList({ sort: 'full_name', fields: 'id,code,full_name' }),
        pb.collection('farms').getFullList({ sort: 'code', fields: 'id,code,farmer_id,plot_name,extra_data,total_area,coffee_area,latitude,longitude' }),
      ]);
      setFarmers(fr); setFarms(fa);
      // Build items from farms that have field_quest_data in extra_data
      const questItems = fa.filter((f: Rec) => f.extra_data?.field_quest_date).map((f: Rec) => ({
        id: f.id, code: f.code, farmer_id: f.farmer_id,
        farmer_name: fr.find((x: Rec) => x.id === f.farmer_id)?.full_name || '—',
        farmer_code: fr.find((x: Rec) => x.id === f.farmer_id)?.code || '—',
        date: f.extra_data?.field_quest_date || '',
        answers: f.extra_data?.field_quest_answers || {},
        status: f.extra_data?.field_quest_status || 'draft',
      }));
      setItems(questItems);
    } catch { /* empty */ }
    setLoading(false);
  }

  function countAnswered(ans: Rec): number {
    return ALL_QUESTIONS.filter(q => {
      const v = ans[q.code];
      return v !== undefined && v !== '' && v !== null;
    }).length;
  }

  /* ── CRUD ── */
  function handleAdd() {
    setForm({ date: new Date().toISOString().slice(0, 10), farmer_id: '', farm_id: '', status: 'draft' });
    setAnswers({}); setStep(1); setExpanded({ A: true }); setModal('add');
  }

  function handleEdit(item: Rec) {
    const farm = farms.find((f: Rec) => f.id === item.id);
    setForm({ date: item.date, farmer_id: item.farmer_id, farm_id: item.id, status: item.status });
    setAnswers(item.answers || {});
    // Auto-fill from farm fields
    if (farm) {
      const a: Rec = { ...item.answers };
      if (farm.code) a['FdQ_A01'] = farm.code;
      if (farm.latitude) a['FdQ_A04'] = farm.latitude;
      if (farm.longitude) a['FdQ_A05'] = farm.longitude;
      if (farm.total_area) a['FdQ_B01'] = farm.total_area;
      if (farm.coffee_area) a['FdQ_B02'] = farm.coffee_area;
      setAnswers(a);
    }
    setStep(1); setExpanded({ A: true }); setModal('edit');
  }

  function handleView(item: Rec) {
    setForm({ date: item.date, farmer_id: item.farmer_id, farm_id: item.id, status: item.status });
    setAnswers(item.answers || {}); setModal('view');
  }

  async function handleSave() {
    try {
      const farmId = form.farm_id;
      if (!farmId) return;
      const farm = farms.find((f: Rec) => f.id === farmId);
      const existingExtra = farm?.extra_data || {};
      const extraData = {
        ...existingExtra,
        field_quest_date: form.date,
        field_quest_status: countAnswered(answers) >= TOTAL_Q * 0.8 ? 'completed' : 'draft',
        field_quest_answers: answers,
      };
      // Also map direct farm fields
      const farmUpdate: Rec = { extra_data: extraData };
      if (answers['FdQ_A03']) farmUpdate.plot_name = answers['FdQ_A03'];
      if (answers['FdQ_A04']) farmUpdate.latitude = Number(answers['FdQ_A04']);
      if (answers['FdQ_A05']) farmUpdate.longitude = Number(answers['FdQ_A05']);
      if (answers['FdQ_B01']) farmUpdate.total_area = Number(answers['FdQ_B01']);
      if (answers['FdQ_B02']) farmUpdate.coffee_area = Number(answers['FdQ_B02']);
      if (answers['FdQ_B03']) farmUpdate.certified_area = Number(answers['FdQ_B03']);
      if (answers['FdQ_C02']) farmUpdate.tree_count = Number(answers['FdQ_C02']);
      if (answers['FdQ_C03']) farmUpdate.density_per_ha = Number(answers['FdQ_C03']);
      if (answers['FdQ_C04']) farmUpdate.planting_year = Number(answers['FdQ_C04']);
      if (answers['FdQ_C08']) farmUpdate.production_yield = Number(answers['FdQ_C08']);
      if (answers['FdQ_C09']) farmUpdate.yield_per_ha = Number(answers['FdQ_C09']);
      if (answers['FdQ_D03']) farmUpdate.shade_tree_count = Number(answers['FdQ_D03']);
      if (answers['FdQ_D04']) farmUpdate.natural_vegetation_pct = Number(answers['FdQ_D04']);

      await pb.collection('farms').update(farmId, farmUpdate);
      setModal(null); await loadAll();
    } catch (e: any) {
      alert(lang === 'vi' ? 'Lỗi lưu: ' + e.message : 'Save error: ' + e.message);
    }
  }

  async function handleDelete() {
    // We don't delete the farm, just clear quest data
    try {
      const farm = farms.find((f: Rec) => f.id === deleteId);
      if (farm) {
        const ed = farm.extra_data || {};
        delete ed.field_quest_date; delete ed.field_quest_status; delete ed.field_quest_answers;
        await pb.collection('farms').update(deleteId, { extra_data: ed });
      }
      setDeleteId(''); await loadAll();
    } catch { /* empty */ }
  }

  /* ── FILTER ── */
  const filtered = items.filter(i =>
    !search || i.code?.toLowerCase().includes(search.toLowerCase()) ||
    i.farmer_name?.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  // Farm filter by selected farmer
  const filteredFarms = form.farmer_id
    ? farms.filter((f: Rec) => f.farmer_id === form.farmer_id)
    : farms;

  /* ── RENDER ── */
  const answered = countAnswered(answers);
  const pct = TOTAL_Q > 0 ? Math.round((answered / TOTAL_Q) * 100) : 0;

  function renderInput(q: QDef) {
    const val = answers[q.code] ?? '';
    const set = (v: any) => setAnswers(prev => ({ ...prev, [q.code]: v }));

    // Check depends
    if (q.depends) {
      const depVal = answers[q.depends];
      if (!depVal || depVal === 'false' || depVal === false) return null;
    }

    switch (q.type) {
      case 'bool':
        return (
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className={`btn ${val === true || val === 'true' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 16px', fontSize: 13 }}
              onClick={() => set(true)}>
              {lang === 'vi' ? 'Có' : 'Yes'}
            </button>
            <button type="button" className={`btn ${val === false || val === 'false' ? 'btn-danger' : 'btn-secondary'}`}
              style={{ padding: '6px 16px', fontSize: 13 }}
              onClick={() => set(false)}>
              {lang === 'vi' ? 'Không' : 'No'}
            </button>
          </div>
        );
      case 'select':
        return (
          <select className="form-select" value={val} onChange={e => set(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', width: '100%' }}>
            <option value="">{lang === 'vi' ? '— Chọn —' : '— Select —'}</option>
            {q.options?.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        );
      case 'number':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="number" value={val} onChange={e => set(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', width: '100%' }} />
            {q.unit && <span style={{ color: '#888', fontSize: 13, whiteSpace: 'nowrap' }}>{q.unit}</span>}
          </div>
        );
      default:
        return (
          <textarea value={val} onChange={e => set(e.target.value)} rows={2}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', width: '100%', resize: 'vertical' }} />
        );
    }
  }

  return (
    <div className="animate-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {lang === 'vi' ? 'Phiếu Điều Tra Nông Trại (FdQ)' : 'Field Questionnaire (FdQ)'}
          </h1>
          <p className="page-subtitle">
            {lang === 'vi' ? `${TOTAL_Q} câu hỏi — 10 phần` : `${TOTAL_Q} questions — 10 sections`}
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={handleAdd}>
            <Plus size={16} /> {lang === 'vi' ? 'Thêm phiếu' : 'New Entry'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#2E7D32' }}>{items.length}</div>
          <div style={{ color: '#666', fontSize: 14 }}>{lang === 'vi' ? 'Tổng phiếu' : 'Total'}</div>
        </div>
        <div className="card" style={{ padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#1565C0' }}>
            {items.filter(i => i.status === 'completed').length}
          </div>
          <div style={{ color: '#666', fontSize: 14 }}>{lang === 'vi' ? 'Hoàn thành' : 'Completed'}</div>
        </div>
        <div className="card" style={{ padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#E65100' }}>
            {items.filter(i => i.status !== 'completed').length}
          </div>
          <div style={{ color: '#666', fontSize: 14 }}>{lang === 'vi' ? 'Bản nháp' : 'Draft'}</div>
        </div>
      </div>

      {/* Search */}
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Search size={18} style={{ color: '#888' }} />
          <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder={lang === 'vi' ? 'Tìm theo mã farm, tên nông dân...' : 'Search by farm code, farmer...'}
            style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd' }} />
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e0e0e0', background: '#f8f8f8' }}>
              <th style={TH}>#</th>
              <th style={TH}>{lang === 'vi' ? 'Mã farm' : 'Farm Code'}</th>
              <th style={TH}>{lang === 'vi' ? 'Nông dân' : 'Farmer'}</th>
              <th style={TH}>{lang === 'vi' ? 'Ngày' : 'Date'}</th>
              <th style={TH}>{lang === 'vi' ? 'Tiến độ' : 'Progress'}</th>
              <th style={TH}>{lang === 'vi' ? 'Trạng thái' : 'Status'}</th>
              <th style={TH}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}>
                {lang === 'vi' ? 'Đang tải...' : 'Loading...'}
              </td></tr>
            ) : paged.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                {lang === 'vi' ? 'Chưa có phiếu nào' : 'No entries yet'}
              </td></tr>
            ) : paged.map((item, idx) => {
              const a = countAnswered(item.answers || {});
              const p = Math.round((a / TOTAL_Q) * 100);
              return (
                <tr key={item.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={TD}>{(page - 1) * perPage + idx + 1}</td>
                  <td style={TD}><strong>{item.code}</strong></td>
                  <td style={TD}>{item.farmer_name}</td>
                  <td style={TD}>{item.date}</td>
                  <td style={TD}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 6, background: '#e8e8e8', borderRadius: 3 }}>
                        <div style={{ height: 6, borderRadius: 3, width: `${p}%`,
                          background: p >= 80 ? '#2E7D32' : p >= 40 ? '#F9A825' : '#E53935' }} />
                      </div>
                      <span style={{ fontSize: 12, color: '#666' }}>{a}/{TOTAL_Q}</span>
                    </div>
                  </td>
                  <td style={TD}>
                    <span style={{ padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                      background: item.status === 'completed' ? '#E8F5E9' : '#FFF3E0',
                      color: item.status === 'completed' ? '#2E7D32' : '#E65100' }}>
                      {item.status === 'completed' ? (lang === 'vi' ? 'Hoàn thành' : 'Completed') : (lang === 'vi' ? 'Nháp' : 'Draft')}
                    </span>
                  </td>
                  <td style={TD}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-secondary" style={IBTN} onClick={() => handleView(item)}><Eye size={14} /></button>
                      <button className="btn btn-secondary" style={IBTN} onClick={() => handleEdit(item)}><Edit3 size={14} /></button>
                      <button className="btn btn-secondary" style={IBTN} onClick={() => setDeleteId(item.id)}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: 16 }}>
            {Array.from({ length: totalPages }, (_, i) => (
              <button key={i} className={`btn ${page === i + 1 ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '4px 12px', fontSize: 13 }} onClick={() => setPage(i + 1)}>{i + 1}</button>
            ))}
          </div>
        )}
      </div>

      {/* ADD/EDIT MODAL */}
      {(modal === 'add' || modal === 'edit') && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}
            style={{ width: '95vw', maxWidth: 900, maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>
                {modal === 'add'
                  ? (lang === 'vi' ? 'Tạo Phiếu ĐT Nông Trại' : 'New Field Questionnaire')
                  : (lang === 'vi' ? 'Sửa Phiếu ĐT Nông Trại' : 'Edit Field Questionnaire')}
                {step === 2 && <span style={{ marginLeft: 12, fontSize: 14, color: '#888' }}>
                  {answered}/{TOTAL_Q} ({pct}%)
                </span>}
              </h2>
              <button className="btn btn-secondary" onClick={() => setModal(null)} style={{ padding: 6 }}><X size={18} /></button>
            </div>

            {/* Steps indicator */}
            <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #eee' }}>
              {[1, 2].map(s => (
                <button key={s} onClick={() => setStep(s)}
                  style={{ flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer', fontWeight: step === s ? 700 : 400,
                    color: step === s ? '#2E7D32' : '#888', background: step === s ? '#E8F5E9' : 'transparent',
                    borderBottom: step === s ? '3px solid #2E7D32' : '3px solid transparent', fontSize: 14 }}>
                  {s === 1
                    ? (lang === 'vi' ? '① Thông tin chung' : '① General Info')
                    : (lang === 'vi' ? `② ${TOTAL_Q} Câu hỏi` : `② ${TOTAL_Q} Questions`)}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="modal-body" style={{ flex: 1, overflow: 'auto', padding: 20 }}>
              {step === 1 ? (
                <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label>{lang === 'vi' ? 'Nông dân' : 'Farmer'} <span style={{ color: 'red' }}>*</span></label>
                    <select value={form.farmer_id || ''} onChange={e => setForm(p => ({ ...p, farmer_id: e.target.value, farm_id: '' }))}
                      style={SEL}>
                      <option value="">{lang === 'vi' ? '— Chọn nông dân —' : '— Select farmer —'}</option>
                      {farmers.map(f => <option key={f.id} value={f.id}>{f.code} — {f.full_name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>{lang === 'vi' ? 'Nông trại' : 'Farm'} <span style={{ color: 'red' }}>*</span></label>
                    <select value={form.farm_id || ''} onChange={e => setForm(p => ({ ...p, farm_id: e.target.value }))}
                      style={SEL}>
                      <option value="">{lang === 'vi' ? '— Chọn farm —' : '— Select farm —'}</option>
                      {filteredFarms.map(f => <option key={f.id} value={f.id}>{f.code} — {f.plot_name || ''}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>{lang === 'vi' ? 'Ngày khảo sát' : 'Survey date'} <span style={{ color: 'red' }}>*</span></label>
                    <input type="date" value={form.date || ''} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} style={SEL} />
                  </div>
                  <div className="form-group">
                    <label>{lang === 'vi' ? 'Trạng thái' : 'Status'}</label>
                    <select value={form.status || 'draft'} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} style={SEL}>
                      <option value="draft">{lang === 'vi' ? 'Nháp' : 'Draft'}</option>
                      <option value="completed">{lang === 'vi' ? 'Hoàn thành' : 'Completed'}</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div>
                  {/* Progress bar */}
                  <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                      <span>{lang === 'vi' ? 'Tiến độ' : 'Progress'}</span>
                      <strong>{answered}/{TOTAL_Q} ({pct}%)</strong>
                    </div>
                    <div style={{ height: 8, background: '#ddd', borderRadius: 4 }}>
                      <div style={{ height: 8, borderRadius: 4, width: `${pct}%`, transition: 'width 0.3s',
                        background: pct >= 80 ? '#2E7D32' : pct >= 40 ? '#F9A825' : '#E53935' }} />
                    </div>
                  </div>

                  {/* Sections */}
                  {SECTIONS.map(sec => {
                    const secAnswered = sec.questions.filter(q => {
                      const v = answers[q.code];
                      return v !== undefined && v !== '' && v !== null;
                    }).length;
                    const isOpen = expanded[sec.key] ?? false;
                    return (
                      <div key={sec.key} style={{ marginBottom: 8, border: '1px solid #e0e0e0', borderRadius: 10, overflow: 'hidden' }}>
                        <button onClick={() => setExpanded(p => ({ ...p, [sec.key]: !p[sec.key] }))}
                          style={{ width: '100%', padding: '12px 16px', background: isOpen ? '#E8F5E9' : '#fafafa',
                            border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 600 }}>
                          <span>{sec.icon}</span>
                          <span style={{ flex: 1, textAlign: 'left' }}>{lang === 'vi' ? sec.labelVi : sec.labelEn}</span>
                          <span style={{ fontSize: 12, color: '#888', fontWeight: 400 }}>{secAnswered}/{sec.questions.length}</span>
                          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                        {isOpen && (
                          <div style={{ padding: '12px 16px' }}>
                            {sec.questions.map(q => {
                              const input = renderInput(q);
                              if (input === null) return null;
                              return (
                                <div key={q.code} style={{ marginBottom: 14 }}>
                                  <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 600 }}>
                                    <span style={{ color: '#666', fontFamily: 'monospace', marginRight: 6 }}>{q.code}</span>
                                    {lang === 'vi' ? q.labelVi : q.labelEn}
                                    {q.required && <span style={{ color: 'red', marginLeft: 4 }}>*</span>}
                                  </label>
                                  {lang === 'vi'
                                    ? <div style={{ fontSize: 11, color: '#999', marginBottom: 4, fontStyle: 'italic' }}>{q.labelEn}</div>
                                    : <div style={{ fontSize: 11, color: '#999', marginBottom: 4, fontStyle: 'italic' }}>{q.labelVi}</div>
                                  }
                                  {input}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid #eee' }}>
              {step === 1 ? (
                <>
                  <button className="btn btn-secondary" onClick={() => setModal(null)}>
                    {lang === 'vi' ? 'Đóng' : 'Cancel'}
                  </button>
                  <button className="btn btn-primary" onClick={() => setStep(2)}
                    disabled={!form.farmer_id || !form.farm_id}>
                    {lang === 'vi' ? 'Tiếp theo →' : 'Next →'} <ArrowRight size={14} />
                  </button>
                </>
              ) : (
                <>
                  <button className="btn btn-secondary" onClick={() => setStep(1)}>
                    <ArrowLeft size={14} /> {lang === 'vi' ? '← Quay lại' : '← Back'}
                  </button>
                  <button className="btn btn-primary" onClick={handleSave}>
                    <Save size={14} /> {lang === 'vi' ? 'Lưu phiếu' : 'Save'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {modal === 'view' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}
            style={{ width: '95vw', maxWidth: 800, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>
                {lang === 'vi' ? 'Chi tiết Phiếu ĐT Nông Trại' : 'Field Questionnaire Detail'}
                <span style={{ marginLeft: 12, fontSize: 14, color: '#888' }}>{answered}/{TOTAL_Q}</span>
              </h2>
              <button className="btn btn-secondary" onClick={() => setModal(null)} style={{ padding: 6 }}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ flex: 1, overflow: 'auto', padding: 20 }}>
              {SECTIONS.map(sec => (
                <div key={sec.key} style={{ marginBottom: 20 }}>
                  <h3 style={{ fontSize: 15, color: '#2E7D32', borderBottom: '2px solid #E8F5E9', paddingBottom: 6, marginBottom: 10 }}>
                    {sec.icon} {lang === 'vi' ? sec.labelVi : sec.labelEn}
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 20px' }}>
                    {sec.questions.map(q => {
                      const v = answers[q.code];
                      const display = v === true ? '✅ Có' : v === false ? '❌ Không' : (v || '—');
                      return (
                        <div key={q.code} style={{ padding: '6px 0', borderBottom: '1px solid #f5f5f5' }}>
                          <div style={{ fontSize: 11, color: '#999' }}>{q.code}</div>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{lang === 'vi' ? q.labelVi : q.labelEn}</div>
                          <div style={{ fontSize: 14, color: v ? '#333' : '#ccc' }}>{String(display)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM */}
      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId('')}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420, padding: 24 }}>
            <h3 style={{ margin: '0 0 12px', color: '#d32f2f' }}>
              {lang === 'vi' ? '⚠️ Xác nhận xóa' : '⚠️ Confirm Delete'}
            </h3>
            <p style={{ color: '#666' }}>
              {lang === 'vi' ? 'Bạn có chắc muốn xóa phiếu điều tra này?' : 'Are you sure you want to delete this questionnaire?'}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button className="btn btn-secondary" onClick={() => setDeleteId('')}>
                {lang === 'vi' ? 'Hủy' : 'Cancel'}
              </button>
              <button className="btn btn-danger" onClick={handleDelete}>
                <Trash2 size={14} /> {lang === 'vi' ? 'Xóa' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Styles ── */
const TH: React.CSSProperties = { padding: '10px 12px', textAlign: 'left', fontSize: 13, fontWeight: 600 };
const TD: React.CSSProperties = { padding: '10px 12px', fontSize: 13 };
const IBTN: React.CSSProperties = { padding: '4px 8px', minWidth: 0 };
const SEL: React.CSSProperties = { padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', width: '100%' };
