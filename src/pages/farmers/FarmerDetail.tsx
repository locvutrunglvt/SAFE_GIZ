// ============================================================
// FarmerDetail — Full 68-field detail page with CRUD tabs
// Author: Lộc Vũ Trung
// ============================================================
import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, User, MapPin, Mountain, CheckSquare, Package, GraduationCap,
  ShoppingCart, Phone, Sprout, ChevronRight, ChevronDown,
  Layers, Pencil, Plus, Trash2, X, Home, Award, Shield, Landmark,
  ClipboardList, Zap, Save, Loader2,
} from 'lucide-react';
import pb from '../../lib/pocketbase';

// ── Types ────────────────────────────────────────────────────
interface Farmer {
  id: string;
  // Section 1: Basic Info
  code: string; full_name: string; gender: string; birth_year: number;
  date_of_birth: string; national_id: string; national_id_date: string;
  national_id_place: string; phone: string; ethnicity: string;
  education_level: string; marital_status: string; photo: string;
  id_card_front: string; id_card_back: string;
  // Section 2: Location & Organization
  village_id: string; group_id: string; company: string;
  cooperative_member: boolean; cooperative_name: string;
  farmer_type: string; farmer_type_detail: string;
  // Section 3: Household
  is_household_head: boolean; household_head_name: string;
  household_members: number; farming_members: number;
  dependents_count: number; income_level: string;
  // Section 4: Land & Production
  total_farm_area: number; total_coffee_area: number; total_plots: number;
  coffee_experience_years: number; land_use_certificate: boolean;
  land_certificate_number: string;
  // Section 5: Infrastructure
  water_source: string; electricity_source: string;
  // Section 6: Certification
  has_certificate: boolean; certificate_type: string;
  certificate_number: string; certificate_date: string;
  certificate_expiry: string; previous_certifications: any;
  // Section 7: EUDR
  eudr_compliant: boolean; eudr_assessment_date: string; eudr_risk_level: string;
  // Section 8: Finance
  has_bank_account: boolean; bank_name: string; bank_account: string;
  bank_branch: string; insurance: any;
  // Section 9: Management
  registered_by: string; registration_date: string; verified_by: string;
  verified_date: string; enrollment_date: string; withdrawal_date: string;
  withdrawal_reason: string; data_source: string; status: string;
  notes: string; extra_data: any;
  // Expand
  expand?: {
    village_id?: { id: string; name: string; commune_id?: string; expand?: { commune_id?: { id: string; name: string } } };
    group_id?: { id: string; name: string };
  };
  [key: string]: any;
}

interface Farm {
  id: string; code: string; coffee_area: number; total_area: number;
  tree_count: number; crop_type: string; polygon_status: string;
  latitude: number; longitude: number; notes: string;
}

interface EUDRAssessment {
  id: string; farm_id: string; farmer_id: string; assessment_code: string;
  assessment_date: string; assessor_name: string; assessor_org: string;
  risk_level: string; total_score: number; max_score: number;
  compliance_pct: number; deforestation_free: boolean; cutoff_date: string;
  recommendation: string; next_assessment_date: string; notes: string;
  status: string; [key: string]: any;
}

interface SupportItem {
  id: string; code: string; item_id: string; farmer_id: string;
  quantity: number; unit: string; value: number; distribution_date: string;
  distributed_by: string; location: string; receipt_number: string;
  notes: string; status: string; [key: string]: any;
}

interface TrainingItem {
  id: string; training_id: string; farmer_id: string; participant_name: string;
  phone: string; gender: string; organization: string; attended: boolean;
  score: number; feedback: string; notes: string;
  expand?: { training_id?: { title: string; training_date: string; topic: string; duration_hours: number } };
  [key: string]: any;
}

interface TradeItem {
  id: string; code: string; farmer_id: string; buyer_id: string;
  transaction_date: string; transaction_type: string; total_quantity: number;
  total_amount: number; currency: string; payment_method: string;
  payment_status: string; receipt_number: string; delivery_location: string;
  notes: string; status: string; [key: string]: any;
}

type TabKey = 'farms' | 'eudr' | 'support' | 'training' | 'trade';

// ── Helpers ──────────────────────────────────────────────────
const fmtDate = (d: string | undefined) => {
  if (!d) return '—';
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    const dd = String(dt.getDate()).padStart(2, '0');
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${dt.getFullYear()}`;
  } catch { return d; }
};

const fmtBool = (v: any) => (v === true ? '✅' : v === false ? '❌' : '—');

const fmtJson = (v: any) => {
  if (!v) return '—';
  if (typeof v === 'string') return v;
  try { return JSON.stringify(v, null, 2); } catch { return '—'; }
};

const statusBadge = (status: string, lang: string) => {
  const map: Record<string, { bg: string; color: string; vi: string; en: string }> = {
    active: { bg: '#E8F5E9', color: '#2E7D32', vi: 'Hoạt động', en: 'Active' },
    inactive: { bg: '#FFF3E0', color: '#E65100', vi: 'Ngừng HĐ', en: 'Inactive' },
    pending: { bg: '#FFF8E1', color: '#F57F17', vi: 'Chờ duyệt', en: 'Pending' },
    rejected: { bg: '#FFEBEE', color: '#C62828', vi: 'Từ chối', en: 'Rejected' },
    suspended: { bg: '#FCE4EC', color: '#AD1457', vi: 'Tạm dừng', en: 'Suspended' },
  };
  const s = map[status] || { bg: '#EFEBE9', color: '#5D4037', vi: status, en: status };
  return (
    <span style={{ padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: s.bg, color: s.color }}>
      {lang === 'vi' ? s.vi : s.en}
    </span>
  );
};

const riskBadge = (level: string) => {
  const map: Record<string, { bg: string; color: string }> = {
    low: { bg: '#E8F5E9', color: '#2E7D32' },
    standard: { bg: '#FFF8E1', color: '#F57F17' },
    high: { bg: '#FFEBEE', color: '#C62828' },
  };
  const s = map[level] || { bg: '#EFEBE9', color: '#5D4037' };
  return <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color }}>{level}</span>;
};

// ═════════════════════════════════════════════════════════════
// COMPONENT
// ═════════════════════════════════════════════════════════════
export default function FarmerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const lang = i18n.language;

  // ── State ────────────────────────────────────────────────
  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [assessments, setAssessments] = useState<EUDRAssessment[]>([]);
  const [supports, setSupports] = useState<SupportItem[]>([]);
  const [trainings, setTrainings] = useState<TrainingItem[]>([]);
  const [trades, setTrades] = useState<TradeItem[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('farms');
  const [loading, setLoading] = useState(true);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Edit farmer modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [editModalTab, setEditModalTab] = useState(0);

  // Tab CRUD modals
  const [tabModal, setTabModal] = useState<{ type: 'add' | 'edit'; tab: TabKey; data: Record<string, any> } | null>(null);
  const [tabSaving, setTabSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ tab: TabKey; id: string } | null>(null);

  // Relation options
  const [villages, setVillages] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);

  // ── Data Loading ─────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!id) return;
    try {
      const f = await pb.collection('farmers').getOne(id, { expand: 'village_id,village_id.commune_id,group_id' });
      setFarmer(f as unknown as Farmer);

      const farmResult = await pb.collection('farms').getList(1, 50, { filter: `farmer_id="${id}"`, sort: 'code' });
      setFarms(farmResult.items as unknown as Farm[]);

      try {
        const farmIds = farmResult.items.map(f => f.id);
        if (farmIds.length > 0) {
          const eudrFilter = farmIds.map(fid => `farm_id="${fid}"`).join('||');
          const farmerFilter = `farmer_id="${id}"`;
          const eudrResult = await pb.collection('eudr_assessments').getList(1, 50, {
            filter: `(${eudrFilter})||${farmerFilter}`, sort: '-assessment_date',
          });
          setAssessments(eudrResult.items as unknown as EUDRAssessment[]);
        } else {
          try {
            const eudrResult = await pb.collection('eudr_assessments').getList(1, 50, {
              filter: `farmer_id="${id}"`, sort: '-assessment_date',
            });
            setAssessments(eudrResult.items as unknown as EUDRAssessment[]);
          } catch { /* */ }
        }
      } catch { /* */ }

      try {
        const supResult = await pb.collection('support_distributions').getList(1, 50, { filter: `farmer_id="${id}"`, sort: '-distribution_date' });
        setSupports(supResult.items as unknown as SupportItem[]);
      } catch { /* */ }

      try {
        const trainResult = await pb.collection('training_participants').getList(1, 50, { filter: `farmer_id="${id}"`, expand: 'training_id' });
        setTrainings(trainResult.items as unknown as TrainingItem[]);
      } catch { /* */ }

      try {
        const tradeResult = await pb.collection('sales_transactions').getList(1, 50, { filter: `farmer_id="${id}"`, sort: '-transaction_date' });
        setTrades(tradeResult.items as unknown as TradeItem[]);
      } catch { /* */ }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    (async () => {
      try {
        const province = localStorage.getItem('selectedProvince') || '';
        const [v, g] = await Promise.all([
          pb.collection('villages').getFullList({ sort: 'name', ...(province ? { filter: `province_code="${province}"` } : {}) }),
          pb.collection('farmer_groups').getFullList({ sort: 'name' }),
        ]);
        setVillages(v);
        setGroups(g);
      } catch { /* */ }
    })();
  }, []);

  // ── Loading & Not Found ──────────────────────────────────
  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#8D6E63' }}><Loader2 size={24} className="spin" style={{ marginRight: 8 }} />Loading...</div>;
  if (!farmer) return <div style={{ padding: 40, textAlign: 'center', color: '#8D6E63' }}>{lang === 'vi' ? 'Không tìm thấy nông dân' : 'Farmer not found'}</div>;

  // ── Derived ──────────────────────────────────────────────
  const village = farmer.expand?.village_id;
  const commune = (farmer.expand?.village_id as any)?.expand?.commune_id;
  const group = farmer.expand?.group_id;
  const villageName = village?.name || '—';
  const communeName = commune?.name || '—';
  const groupName = group?.name || '—';
  const isDetech = groupName.includes('Detech') || groupName.includes('CẦN BỔ SUNG');
  const partnerKey = isDetech ? 'detech' : 'phucsinh';

  const linkStyle = {
    cursor: 'pointer', color: '#5D4037', textDecoration: 'underline',
    textDecorationColor: '#D7CCC8', textUnderlineOffset: '2px',
  };

  // ── Toggle Section ───────────────────────────────────────
  const toggleSection = (key: string) => setCollapsedSections(p => ({ ...p, [key]: !p[key] }));

  // ── Info Field Row ───────────────────────────────────────
  const fieldRow = (label: string, value: any) => (
    <div style={{ display: 'flex', padding: '7px 0', borderBottom: '1px solid #F5F0EB', gap: 8, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 12, color: '#8D6E63', minWidth: 130, flexShrink: 0, fontWeight: 500, lineHeight: '20px' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#3E2723', lineHeight: '20px', wordBreak: 'break-word' }}>
        {value === null || value === undefined || value === '' ? '—' : value}
      </span>
    </div>
  );

  // ── Section Accordion ────────────────────────────────────
  const section = (key: string, title: string, icon: React.ReactNode, fields: [string, any][]) => {
    const isCollapsed = collapsedSections[key];
    return (
      <div key={key} style={{ marginBottom: 12 }}>
        <button
          onClick={() => toggleSection(key)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 12px', background: '#FAF7F4', border: '1px solid #EFEBE9',
            borderRadius: isCollapsed ? 10 : '10px 10px 0 0', cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <span style={{ color: '#5D4037' }}>{icon}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#3E2723', flex: 1, textAlign: 'left' }}>{title}</span>
          <ChevronDown size={16} style={{ color: '#8D6E63', transition: 'transform 0.2s', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }} />
        </button>
        {!isCollapsed && (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '0 24px', padding: '8px 12px', border: '1px solid #EFEBE9',
            borderTop: 'none', borderRadius: '0 0 10px 10px', background: 'white',
          }}>
            {fields.map(([label, value], i) => <div key={i}>{fieldRow(label, value)}</div>)}
          </div>
        )}
      </div>
    );
  };

  // ── Gender display ───────────────────────────────────────
  const genderDisplay = (g: string) => {
    const map: Record<string, { vi: string; en: string }> = {
      male: { vi: 'Nam', en: 'Male' },
      female: { vi: 'Nữ', en: 'Female' },
      other: { vi: 'Khác', en: 'Other' },
    };
    return (map[g] || { vi: g, en: g })[lang === 'vi' ? 'vi' : 'en'] || g || '—';
  };

  const maritalDisplay = (s: string) => {
    const map: Record<string, { vi: string; en: string }> = {
      single: { vi: 'Độc thân', en: 'Single' },
      married: { vi: 'Đã kết hôn', en: 'Married' },
      divorced: { vi: 'Ly hôn', en: 'Divorced' },
      widowed: { vi: 'Góa', en: 'Widowed' },
    };
    return (map[s] || { vi: s, en: s })[lang === 'vi' ? 'vi' : 'en'] || s || '—';
  };

  const incomeDisplay = (l: string) => {
    const map: Record<string, { vi: string; en: string }> = {
      poor: { vi: 'Nghèo', en: 'Poor' },
      near_poor: { vi: 'Cận nghèo', en: 'Near poor' },
      average: { vi: 'Trung bình', en: 'Average' },
      above_average: { vi: 'Trên TB', en: 'Above average' },
    };
    return (map[l] || { vi: l, en: l })[lang === 'vi' ? 'vi' : 'en'] || l || '—';
  };

  // ── Farmer Edit Modal Helpers ────────────────────────────
  const openEditFarmer = () => {
    setEditData({ ...farmer } as Record<string, any>);
    setEditModalTab(0);
    setShowEditModal(true);
  };

  const setEditField = (key: string, value: any) => setEditData(p => ({ ...p, [key]: value }));

  const saveFarmer = async () => {
    setSaving(true);
    try {
      const data: Record<string, any> = { ...editData };
      delete data.id; delete data.expand; delete data.collectionId;
      delete data.collectionName; delete data.created; delete data.updated;
      await pb.collection('farmers').update(farmer.id, data);
      setShowEditModal(false);
      setLoading(true);
      await fetchAll();
    } catch (e: any) {
      alert(e?.message || 'Error saving farmer');
    }
    setSaving(false);
  };

  // ── Tab CRUD Helpers ─────────────────────────────────────
  const collectionMap: Record<TabKey, string> = {
    farms: 'farms', eudr: 'eudr_assessments', support: 'support_distributions',
    training: 'training_participants', trade: 'sales_transactions',
  };

  const openTabAdd = (tab: TabKey) => {
    const defaults: Record<string, any> = { farmer_id: id };
    if (tab === 'farms') defaults.code = '';
    setTabModal({ type: 'add', tab, data: defaults });
  };

  const openTabEdit = (tab: TabKey, item: Record<string, any>) => {
    setTabModal({ type: 'edit', tab, data: { ...item } });
  };

  const setTabField = (key: string, value: any) => {
    setTabModal(p => p ? { ...p, data: { ...p.data, [key]: value } } : null);
  };

  const saveTabItem = async () => {
    if (!tabModal) return;
    setTabSaving(true);
    try {
      const collection = collectionMap[tabModal.tab];
      const data = { ...tabModal.data };
      const itemId = data.id;
      delete data.id; delete data.expand; delete data.collectionId;
      delete data.collectionName; delete data.created; delete data.updated;

      if (tabModal.type === 'edit' && itemId) {
        await pb.collection(collection).update(itemId, data);
      } else {
        await pb.collection(collection).create(data);
      }
      setTabModal(null);
      setLoading(true);
      await fetchAll();
    } catch (e: any) {
      alert(e?.message || 'Error saving');
    }
    setTabSaving(false);
  };

  const deleteTabItem = async () => {
    if (!deleteConfirm) return;
    try {
      await pb.collection(collectionMap[deleteConfirm.tab]).delete(deleteConfirm.id);
      setDeleteConfirm(null);
      setLoading(true);
      await fetchAll();
    } catch (e: any) {
      alert(e?.message || 'Error deleting');
    }
  };

  // ── Reusable form input ──────────────────────────────────
  const formInput = (
    label: string, key: string, data: Record<string, any>,
    setter: (k: string, v: any) => void,
    opts?: { type?: string; options?: { value: string; label: string }[]; required?: boolean; fullWidth?: boolean; readOnly?: boolean }
  ) => {
    const type = opts?.type || 'text';
    const val = data[key] ?? '';
    return (
      <div className={`form-group ${opts?.fullWidth ? 'full-width' : ''}`}>
        <label>{label}{opts?.required && <span style={{ color: '#C62828' }}> *</span>}</label>
        {type === 'select' ? (
          <select value={val} onChange={e => setter(key, e.target.value)}>
            <option value="">— —</option>
            {(opts?.options || []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ) : type === 'textarea' ? (
          <textarea rows={3} value={val} onChange={e => setter(key, e.target.value)} style={{ resize: 'vertical' }} />
        ) : type === 'checkbox' ? (
          <div style={{ paddingTop: 6 }}>
            <input type="checkbox" checked={!!val} onChange={e => setter(key, e.target.checked)} style={{ width: 'auto', marginRight: 8 }} />
            <span style={{ fontSize: 13, color: '#5D4037' }}>{val ? 'Yes' : 'No'}</span>
          </div>
        ) : (
          <input
            type={type === 'date' ? 'date' : type === 'number' ? 'number' : 'text'}
            value={type === 'date' && val ? val.slice(0, 10) : val}
            onChange={e => setter(key, type === 'number' ? (e.target.value ? Number(e.target.value) : null) : e.target.value)}
            readOnly={opts?.readOnly}
          />
        )}
      </div>
    );
  };

  // ── Tab Config ───────────────────────────────────────────
  const tabs: { key: TabKey; label: string; count: number; icon: React.ReactNode; color: string }[] = [
    { key: 'farms', label: lang === 'vi' ? 'Nông trại' : 'Farms', count: farms.length, icon: <Sprout size={14} />, color: '#2E7D32' },
    { key: 'eudr', label: 'EUDR', count: assessments.length, icon: <CheckSquare size={14} />, color: '#1565C0' },
    { key: 'support', label: lang === 'vi' ? 'Hỗ trợ' : 'Support', count: supports.length, icon: <Package size={14} />, color: '#E65100' },
    { key: 'training', label: lang === 'vi' ? 'Đào tạo' : 'Training', count: trainings.length, icon: <GraduationCap size={14} />, color: '#6A1B9A' },
    { key: 'trade', label: lang === 'vi' ? 'Thương mại' : 'Trade', count: trades.length, icon: <ShoppingCart size={14} />, color: '#C62828' },
  ];

  const emptyState = (icon: React.ReactNode, msg: string) => (
    <div style={{ textAlign: 'center', padding: 40, color: '#A1887F' }}>
      <div style={{ marginBottom: 10, opacity: 0.5 }}>{icon}</div>
      <div style={{ fontSize: 14 }}>{msg}</div>
      <div style={{ fontSize: 12, marginTop: 6, color: '#BCAAA4' }}>{lang === 'vi' ? 'Dữ liệu sẽ hiển thị khi có bản ghi liên quan' : 'Data will appear when related records exist'}</div>
    </div>
  );

  // Action column icons
  const actionIcons = (tab: TabKey, item: any) => (
    <td style={{ whiteSpace: 'nowrap' }}>
      <button onClick={(e) => { e.stopPropagation(); openTabEdit(tab, item); }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5D4037', padding: 4 }} title="Edit">
        <Pencil size={14} />
      </button>
      <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ tab, id: item.id }); }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C62828', padding: 4 }} title="Delete">
        <Trash2 size={14} />
      </button>
    </td>
  );

  // Add button for tab header
  const tabAddBtn = (tab: TabKey) => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
      <button className="btn btn-primary btn-sm" onClick={() => openTabAdd(tab)}>
        <Plus size={14} /> {lang === 'vi' ? 'Thêm' : 'Add'}
      </button>
    </div>
  );

  // ═════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════
  return (
    <div className="animate-in">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#8D6E63', cursor: 'pointer', fontSize: 14, fontWeight: 500, marginBottom: 16 }}
      >
        <ArrowLeft size={18} /> {lang === 'vi' ? 'Quay lại' : 'Back'}
      </button>

      {/* Breadcrumb */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
        padding: '10px 16px', background: '#F5F0EB', borderRadius: 10, marginBottom: 16,
        fontSize: 13, color: '#5D4037',
      }}>
        <span style={{ cursor: 'pointer', color: '#8D6E63' }} onClick={() => navigate('/dashboard')}>Dashboard</span>
        <ChevronRight size={14} style={{ color: '#A1887F' }} />
        <span style={{ cursor: 'pointer', color: '#8D6E63' }} onClick={() => navigate(`/drill/${partnerKey}`)}>{isDetech ? 'Detech' : 'Phúc Sinh'}</span>
        {commune && (<>
          <ChevronRight size={14} style={{ color: '#A1887F' }} />
          <span style={{ cursor: 'pointer', color: '#8D6E63' }}
            onClick={() => navigate(`/drill/${partnerKey}?commune=${commune.id}&communeName=${communeName}`)}
          >{communeName}</span>
        </>)}
        {village && (<>
          <ChevronRight size={14} style={{ color: '#A1887F' }} />
          <span style={{ cursor: 'pointer', color: '#8D6E63' }}
            onClick={() => navigate(`/drill/${partnerKey}?commune=${commune?.id || ''}&communeName=${communeName}&village=${village.id}&villageName=${villageName}`)}
          >{villageName}</span>
        </>)}
        <ChevronRight size={14} style={{ color: '#A1887F' }} />
        <span style={{ fontWeight: 700, color: '#3E2723' }}>{farmer.full_name}</span>
      </div>

      {/* ── Header Card ───────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 20, padding: '24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: farmer.gender === 'female' ? 'linear-gradient(135deg, #BF360C, #E64A19)' : 'linear-gradient(135deg, #5D4037, #8D6E63)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0,
            fontSize: 24, fontWeight: 800,
          }}>
            <User size={28} />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#2C2C2C', margin: 0 }}>{farmer.full_name}</h1>
            <div style={{ fontSize: 14, color: '#8D6E63', fontWeight: 600, marginTop: 4 }}>{farmer.code}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 12 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13 }}>
                <User size={14} style={{ color: '#8D6E63' }} /> {genderDisplay(farmer.gender)}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13 }}>
                <Phone size={14} style={{ color: '#8D6E63' }} /> {farmer.phone || '—'}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13 }}>
                <MapPin size={14} style={{ color: '#8D6E63' }} />
                <span style={linkStyle}
                  onClick={() => commune && navigate(`/drill/${partnerKey}?commune=${commune.id}&communeName=${communeName}`)}
                >{communeName}</span>
                <span style={{ color: '#A1887F' }}>›</span>
                <span style={linkStyle}
                  onClick={() => village && navigate(`/drill/${partnerKey}?commune=${commune?.id || ''}&communeName=${communeName}&village=${village.id}&villageName=${villageName}`)}
                >{villageName}</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13 }}>
                <Layers size={14} style={{ color: '#8D6E63' }} />
                <span style={linkStyle}
                  onClick={() => group && navigate(`/drill/${partnerKey}?commune=${commune?.id || ''}&communeName=${communeName}&village=${village?.id || ''}&villageName=${villageName}&group=${group.id}&groupName=${groupName}`)}
                >{groupName}</span>
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {statusBadge(farmer.status, lang)}
            <button
              onClick={openEditFarmer}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <Pencil size={14} /> {lang === 'vi' ? 'Sửa' : 'Edit'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Info Sections (Accordion) ─────────────────────── */}
      {section('basic', lang === 'vi' ? '📋 Thông tin cơ bản' : '📋 Basic Info', <User size={16} />, [
        [lang === 'vi' ? 'Mã nông dân' : 'Farmer Code', farmer.code],
        [lang === 'vi' ? 'Họ và tên' : 'Full Name', farmer.full_name],
        [lang === 'vi' ? 'Giới tính' : 'Gender', genderDisplay(farmer.gender)],
        [lang === 'vi' ? 'Năm sinh' : 'Birth Year', farmer.birth_year],
        [lang === 'vi' ? 'Ngày sinh' : 'Date of Birth', fmtDate(farmer.date_of_birth)],
        ['CMND/CCCD', farmer.national_id],
        [lang === 'vi' ? 'Ngày cấp CCCD' : 'ID Issue Date', fmtDate(farmer.national_id_date)],
        [lang === 'vi' ? 'Nơi cấp CCCD' : 'ID Issue Place', farmer.national_id_place],
        [lang === 'vi' ? 'Điện thoại' : 'Phone', farmer.phone],
        [lang === 'vi' ? 'Dân tộc' : 'Ethnicity', farmer.ethnicity],
        [lang === 'vi' ? 'Trình độ' : 'Education', farmer.education_level],
        [lang === 'vi' ? 'Hôn nhân' : 'Marital Status', maritalDisplay(farmer.marital_status)],
        [lang === 'vi' ? 'Ảnh' : 'Photo', farmer.photo ? '📷 ' + farmer.photo : '—'],
        [lang === 'vi' ? 'CCCD mặt trước' : 'ID Front', farmer.id_card_front ? '📷 ' + farmer.id_card_front : '—'],
        [lang === 'vi' ? 'CCCD mặt sau' : 'ID Back', farmer.id_card_back ? '📷 ' + farmer.id_card_back : '—'],
      ])}

      {section('location', lang === 'vi' ? '📍 Địa chỉ & Tổ chức' : '📍 Location & Organization', <MapPin size={16} />, [
        [lang === 'vi' ? 'Thôn/Bản' : 'Village', villageName],
        [lang === 'vi' ? 'Xã' : 'Commune', communeName],
        [lang === 'vi' ? 'Nhóm hộ' : 'Farmer Group', groupName],
        [lang === 'vi' ? 'Công ty' : 'Company', farmer.company],
        [lang === 'vi' ? 'Thành viên HTX' : 'Coop Member', fmtBool(farmer.cooperative_member)],
        [lang === 'vi' ? 'Tên HTX' : 'Coop Name', farmer.cooperative_name],
        [lang === 'vi' ? 'Loại nông dân' : 'Farmer Type', farmer.farmer_type],
        [lang === 'vi' ? 'Chi tiết loại' : 'Type Detail', farmer.farmer_type_detail],
      ])}

      {section('household', lang === 'vi' ? '🏠 Hộ gia đình' : '🏠 Household', <Home size={16} />, [
        [lang === 'vi' ? 'Là chủ hộ' : 'Household Head', fmtBool(farmer.is_household_head)],
        [lang === 'vi' ? 'Tên chủ hộ' : 'Head Name', farmer.household_head_name],
        [lang === 'vi' ? 'Số thành viên' : 'Members', farmer.household_members],
        [lang === 'vi' ? 'Lao động NN' : 'Farming Workers', farmer.farming_members],
        [lang === 'vi' ? 'Số người phụ thuộc' : 'Dependents', farmer.dependents_count],
        [lang === 'vi' ? 'Mức thu nhập' : 'Income Level', incomeDisplay(farmer.income_level)],
      ])}

      {section('land', lang === 'vi' ? '🌿 Đất đai & Sản xuất' : '🌿 Land & Production', <Mountain size={16} />, [
        [lang === 'vi' ? 'Tổng diện tích (ha)' : 'Total Farm Area (ha)', farmer.total_farm_area],
        [lang === 'vi' ? 'Diện tích cà phê (ha)' : 'Coffee Area (ha)', farmer.total_coffee_area],
        [lang === 'vi' ? 'Số lô' : 'Total Plots', farmer.total_plots],
        [lang === 'vi' ? 'Kinh nghiệm (năm)' : 'Experience (years)', farmer.coffee_experience_years],
        [lang === 'vi' ? 'Có giấy CNQSDĐ' : 'Land Certificate', fmtBool(farmer.land_use_certificate)],
        [lang === 'vi' ? 'Số giấy CNQSDĐ' : 'Certificate No.', farmer.land_certificate_number],
      ])}

      {section('infra', lang === 'vi' ? '🔌 Hạ tầng' : '🔌 Infrastructure', <Zap size={16} />, [
        [lang === 'vi' ? 'Nguồn nước' : 'Water Source', farmer.water_source],
        [lang === 'vi' ? 'Nguồn điện' : 'Electricity Source', farmer.electricity_source],
      ])}

      {section('cert', lang === 'vi' ? '🏅 Chứng nhận' : '🏅 Certification', <Award size={16} />, [
        [lang === 'vi' ? 'Có chứng nhận' : 'Has Certificate', fmtBool(farmer.has_certificate)],
        [lang === 'vi' ? 'Loại chứng nhận' : 'Certificate Type', farmer.certificate_type],
        [lang === 'vi' ? 'Số chứng nhận' : 'Certificate No.', farmer.certificate_number],
        [lang === 'vi' ? 'Ngày cấp' : 'Issue Date', fmtDate(farmer.certificate_date)],
        [lang === 'vi' ? 'Ngày hết hạn' : 'Expiry Date', fmtDate(farmer.certificate_expiry)],
        [lang === 'vi' ? 'Chứng nhận trước' : 'Previous Certs', fmtJson(farmer.previous_certifications)],
      ])}

      {section('eudr_info', lang === 'vi' ? '🛡️ EUDR' : '🛡️ EUDR', <Shield size={16} />, [
        [lang === 'vi' ? 'Tuân thủ EUDR' : 'EUDR Compliant', fmtBool(farmer.eudr_compliant)],
        [lang === 'vi' ? 'Ngày đánh giá' : 'Assessment Date', fmtDate(farmer.eudr_assessment_date)],
        [lang === 'vi' ? 'Mức rủi ro' : 'Risk Level', farmer.eudr_risk_level],
      ])}

      {section('finance', lang === 'vi' ? '🏦 Tài chính' : '🏦 Finance', <Landmark size={16} />, [
        [lang === 'vi' ? 'Có TK ngân hàng' : 'Bank Account', fmtBool(farmer.has_bank_account)],
        [lang === 'vi' ? 'Tên ngân hàng' : 'Bank Name', farmer.bank_name],
        [lang === 'vi' ? 'Số tài khoản' : 'Account No.', farmer.bank_account],
        [lang === 'vi' ? 'Chi nhánh' : 'Branch', farmer.bank_branch],
        [lang === 'vi' ? 'Bảo hiểm' : 'Insurance', fmtJson(farmer.insurance)],
      ])}

      {section('management', lang === 'vi' ? '📂 Quản lý' : '📂 Management', <ClipboardList size={16} />, [
        [lang === 'vi' ? 'Người đăng ký' : 'Registered By', farmer.registered_by],
        [lang === 'vi' ? 'Ngày đăng ký' : 'Registration Date', fmtDate(farmer.registration_date)],
        [lang === 'vi' ? 'Người xác minh' : 'Verified By', farmer.verified_by],
        [lang === 'vi' ? 'Ngày xác minh' : 'Verified Date', fmtDate(farmer.verified_date)],
        [lang === 'vi' ? 'Ngày tham gia' : 'Enrollment Date', fmtDate(farmer.enrollment_date)],
        [lang === 'vi' ? 'Ngày rút lui' : 'Withdrawal Date', fmtDate(farmer.withdrawal_date)],
        [lang === 'vi' ? 'Lý do rút lui' : 'Withdrawal Reason', farmer.withdrawal_reason],
        [lang === 'vi' ? 'Nguồn dữ liệu' : 'Data Source', farmer.data_source],
        [lang === 'vi' ? 'Trạng thái' : 'Status', farmer.status],
        [lang === 'vi' ? 'Ghi chú' : 'Notes', farmer.notes],
        [lang === 'vi' ? 'Dữ liệu mở rộng' : 'Extra Data', fmtJson(farmer.extra_data)],
      ])}

      {/* ── Tabs ──────────────────────────────────────────── */}
      <div className="detail-tabs" style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 16, marginTop: 24 }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '8px 12px', border: 'none', cursor: 'pointer',
              borderRadius: '8px 8px 0 0', fontWeight: 600, fontSize: 12,
              background: activeTab === tab.key ? tab.color : '#F5F0EB',
              color: activeTab === tab.key ? 'white' : '#8D6E63',
              transition: 'all 0.2s', flex: '1 1 auto', justifyContent: 'center',
              minWidth: 0,
              borderBottom: activeTab === tab.key ? `3px solid ${tab.color}` : '3px solid transparent',
            }}
          >
            {tab.icon}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tab.label}</span>
            <span style={{
              padding: '1px 5px', borderRadius: 8, fontSize: 10, fontWeight: 700,
              background: activeTab === tab.key ? 'rgba(255,255,255,0.25)' : '#E8E0D8',
              color: activeTab === tab.key ? 'white' : '#8D6E63',
            }}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* ── Tab Content ───────────────────────────────────── */}
      <div className="card" style={{ padding: '16px 16px', overflow: 'hidden' }}>

        {/* FARMS TAB */}
        {activeTab === 'farms' && (<>
          {tabAddBtn('farms')}
          {farms.length === 0
            ? emptyState(<Mountain size={36} />, lang === 'vi' ? 'Chưa có nông trại nào' : 'No farms yet')
            : <div>
                {farms.map(farm => (
                  <div key={farm.id} className="card" style={{ marginBottom: 12, padding: '16px 20px', border: '1px solid #EFEBE9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: 'linear-gradient(135deg, #2E7D3222, #81C78422)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Sprout size={20} style={{ color: '#2E7D32' }} />
                      </div>
                      <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => navigate(`/farms/${farm.id}`)}>
                        <div style={{ fontWeight: 700, color: '#3E2723', fontSize: 15 }}>{farm.code}</div>
                        <div style={{ display: 'flex', gap: 16, marginTop: 4, fontSize: 13, color: '#8D6E63' }}>
                          <span><strong>{farm.coffee_area || 0}</strong> ha {lang === 'vi' ? 'cà phê' : 'coffee'}</span>
                          <span>{farm.tree_count || 0} {lang === 'vi' ? 'cây' : 'trees'}</span>
                        </div>
                      </div>
                      <button onClick={() => openTabEdit('farms', farm)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5D4037', padding: 4 }}>
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setDeleteConfirm({ tab: 'farms', id: farm.id })}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C62828', padding: 4 }}>
                        <Trash2 size={14} />
                      </button>
                      <ChevronRight size={18} style={{ color: '#A1887F', cursor: 'pointer' }} onClick={() => navigate(`/farms/${farm.id}`)} />
                    </div>
                  </div>
                ))}
              </div>
          }
        </>)}

        {/* EUDR TAB */}
        {activeTab === 'eudr' && (<>
          {tabAddBtn('eudr')}
          {assessments.length === 0
            ? emptyState(<CheckSquare size={36} />, lang === 'vi' ? 'Chưa có đánh giá EUDR' : 'No EUDR assessments')
            : <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', margin: '0 -8px', padding: '0 8px' }}>
                <table style={{ minWidth: 700 }}>
                  <thead><tr>
                    <th>Code</th>
                    <th>{lang === 'vi' ? 'Ngày' : 'Date'}</th>
                    <th>{lang === 'vi' ? 'Đánh giá viên' : 'Assessor'}</th>
                    <th>{lang === 'vi' ? 'Rủi ro' : 'Risk'}</th>
                    <th>{lang === 'vi' ? 'Điểm' : 'Score'}</th>
                    <th>%</th>
                    <th>{lang === 'vi' ? 'Không phá rừng' : 'Deforest-free'}</th>
                    <th>{lang === 'vi' ? 'TT' : 'Status'}</th>
                    <th></th>
                  </tr></thead>
                  <tbody>
                    {assessments.map(a => (
                      <tr key={a.id}>
                        <td style={{ fontWeight: 600 }}>{a.assessment_code || (a as any).code || '—'}</td>
                        <td>{fmtDate(a.assessment_date)}</td>
                        <td>{a.assessor_name || '—'}</td>
                        <td>{riskBadge(a.risk_level)}</td>
                        <td>{a.total_score ?? '—'}/{a.max_score ?? '—'}</td>
                        <td>{a.compliance_pct != null ? `${a.compliance_pct}%` : '—'}</td>
                        <td>{fmtBool(a.deforestation_free)}</td>
                        <td>{a.status || '—'}</td>
                        {actionIcons('eudr', a)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          }
        </>)}

        {/* SUPPORT TAB */}
        {activeTab === 'support' && (<>
          {tabAddBtn('support')}
          {supports.length === 0
            ? emptyState(<Package size={36} />, lang === 'vi' ? 'Chưa có hỗ trợ nào' : 'No support records')
            : <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', margin: '0 -8px', padding: '0 8px' }}>
                <table style={{ minWidth: 650 }}>
                  <thead><tr>
                    <th>{lang === 'vi' ? 'Mã' : 'Code'}</th>
                    <th>{lang === 'vi' ? 'SL' : 'Qty'}</th>
                    <th>{lang === 'vi' ? 'ĐV' : 'Unit'}</th>
                    <th>{lang === 'vi' ? 'Giá trị' : 'Value'}</th>
                    <th>{lang === 'vi' ? 'Ngày' : 'Date'}</th>
                    <th>{lang === 'vi' ? 'Người phát' : 'Distributed By'}</th>
                    <th>{lang === 'vi' ? 'Biên lai' : 'Receipt'}</th>
                    <th>{lang === 'vi' ? 'TT' : 'Status'}</th>
                    <th></th>
                  </tr></thead>
                  <tbody>
                    {supports.map(s => (
                      <tr key={s.id}>
                        <td style={{ fontWeight: 600 }}>{s.code || '—'}</td>
                        <td>{s.quantity ?? '—'}</td>
                        <td>{s.unit || '—'}</td>
                        <td style={{ fontWeight: 600 }}>{s.value?.toLocaleString() || (s as any).value_vnd?.toLocaleString() || '—'}</td>
                        <td>{fmtDate(s.distribution_date)}</td>
                        <td>{s.distributed_by || '—'}</td>
                        <td>{s.receipt_number || '—'}</td>
                        <td>{s.status || '—'}</td>
                        {actionIcons('support', s)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          }
        </>)}

        {/* TRAINING TAB */}
        {activeTab === 'training' && (<>
          {tabAddBtn('training')}
          {trainings.length === 0
            ? emptyState(<GraduationCap size={36} />, lang === 'vi' ? 'Chưa tham gia tập huấn' : 'No training records')
            : <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', margin: '0 -8px', padding: '0 8px' }}>
                <table style={{ minWidth: 600 }}>
                  <thead><tr>
                    <th>{lang === 'vi' ? 'Khóa học' : 'Course'}</th>
                    <th>{lang === 'vi' ? 'Họ tên' : 'Name'}</th>
                    <th>{lang === 'vi' ? 'SĐT' : 'Phone'}</th>
                    <th>{lang === 'vi' ? 'Giới tính' : 'Gender'}</th>
                    <th>{lang === 'vi' ? 'Tổ chức' : 'Org'}</th>
                    <th>{lang === 'vi' ? 'Tham dự' : 'Attended'}</th>
                    <th>{lang === 'vi' ? 'Điểm' : 'Score'}</th>
                    <th></th>
                  </tr></thead>
                  <tbody>
                    {trainings.map(t => (
                      <tr key={t.id}>
                        <td style={{ fontWeight: 600 }}>{t.expand?.training_id?.title || '—'}</td>
                        <td>{t.participant_name || '—'}</td>
                        <td>{t.phone || '—'}</td>
                        <td>{genderDisplay(t.gender)}</td>
                        <td>{t.organization || '—'}</td>
                        <td>{fmtBool(t.attended)}</td>
                        <td>{t.score ?? '—'}</td>
                        {actionIcons('training', t)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          }
        </>)}

        {/* TRADE TAB */}
        {activeTab === 'trade' && (<>
          {tabAddBtn('trade')}
          {trades.length === 0
            ? emptyState(<ShoppingCart size={36} />, lang === 'vi' ? 'Chưa có giao dịch thương mại' : 'No trade transactions')
            : <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', margin: '0 -8px', padding: '0 8px' }}>
                <table style={{ minWidth: 750 }}>
                  <thead><tr>
                    <th>{lang === 'vi' ? 'Mã' : 'Code'}</th>
                    <th>{lang === 'vi' ? 'Ngày' : 'Date'}</th>
                    <th>{lang === 'vi' ? 'Loại' : 'Type'}</th>
                    <th>{lang === 'vi' ? 'SL' : 'Qty'}</th>
                    <th>{lang === 'vi' ? 'Tổng tiền' : 'Amount'}</th>
                    <th>{lang === 'vi' ? 'Thanh toán' : 'Payment'}</th>
                    <th>{lang === 'vi' ? 'TT TT' : 'Pay Status'}</th>
                    <th>{lang === 'vi' ? 'Nơi giao' : 'Location'}</th>
                    <th>{lang === 'vi' ? 'TT' : 'Status'}</th>
                    <th></th>
                  </tr></thead>
                  <tbody>
                    {trades.map(t => (
                      <tr key={t.id}>
                        <td style={{ fontWeight: 600 }}>{t.code || '—'}</td>
                        <td>{fmtDate(t.transaction_date)}</td>
                        <td><span style={{ padding: '2px 8px', borderRadius: 8, fontSize: 11, background: '#FCE4EC', color: '#C62828' }}>{t.transaction_type || '—'}</span></td>
                        <td>{t.total_quantity?.toLocaleString() ?? '—'}</td>
                        <td style={{ fontWeight: 700, color: '#2E7D32' }}>{t.total_amount?.toLocaleString() ?? '—'} {t.currency || '₫'}</td>
                        <td>{t.payment_method || '—'}</td>
                        <td>{t.payment_status || '—'}</td>
                        <td>{t.delivery_location || '—'}</td>
                        <td>{t.status || '—'}</td>
                        {actionIcons('trade', t)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          }
        </>)}
      </div>

      {/* ═══════════════════════════════════════════════════════
         EDIT FARMER MODAL
         ═══════════════════════════════════════════════════════ */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" style={{ maxWidth: 720, maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{lang === 'vi' ? 'Chỉnh sửa nông dân' : 'Edit Farmer'}</h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}><X size={16} /></button>
            </div>

            {/* Modal inner tabs */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, padding: '0 20px', borderBottom: '1px solid #EFEBE9', background: '#FAF7F4' }}>
              {[
                lang === 'vi' ? 'Cơ bản' : 'Basic',
                lang === 'vi' ? 'Địa chỉ' : 'Location',
                lang === 'vi' ? 'Hộ GĐ' : 'Household',
                lang === 'vi' ? 'Đất đai' : 'Land',
                lang === 'vi' ? 'Khác' : 'Other',
              ].map((t, i) => (
                <button key={i} onClick={() => setEditModalTab(i)} style={{
                  padding: '8px 12px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  background: editModalTab === i ? 'white' : 'transparent',
                  color: editModalTab === i ? '#3E2723' : '#8D6E63',
                  borderBottom: editModalTab === i ? '2px solid #5D4037' : '2px solid transparent',
                }}>{t}</button>
              ))}
            </div>

            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <div className="form-grid">
                {/* Tab 0: Basic */}
                {editModalTab === 0 && (<>
                  {formInput(lang === 'vi' ? 'Mã nông dân' : 'Code', 'code', editData, setEditField, { required: true, readOnly: true })}
                  {formInput(lang === 'vi' ? 'Họ và tên' : 'Full Name', 'full_name', editData, setEditField, { required: true })}
                  {formInput(lang === 'vi' ? 'Giới tính' : 'Gender', 'gender', editData, setEditField, { type: 'select', options: [{ value: 'male', label: lang === 'vi' ? 'Nam' : 'Male' }, { value: 'female', label: lang === 'vi' ? 'Nữ' : 'Female' }, { value: 'other', label: lang === 'vi' ? 'Khác' : 'Other' }] })}
                  {formInput(lang === 'vi' ? 'Năm sinh' : 'Birth Year', 'birth_year', editData, setEditField, { type: 'number' })}
                  {formInput(lang === 'vi' ? 'Ngày sinh' : 'Date of Birth', 'date_of_birth', editData, setEditField, { type: 'date' })}
                  {formInput('CMND/CCCD', 'national_id', editData, setEditField)}
                  {formInput(lang === 'vi' ? 'Ngày cấp CCCD' : 'ID Issue Date', 'national_id_date', editData, setEditField, { type: 'date' })}
                  {formInput(lang === 'vi' ? 'Nơi cấp' : 'ID Issue Place', 'national_id_place', editData, setEditField)}
                  {formInput(lang === 'vi' ? 'Điện thoại' : 'Phone', 'phone', editData, setEditField)}
                  {formInput(lang === 'vi' ? 'Dân tộc' : 'Ethnicity', 'ethnicity', editData, setEditField)}
                  {formInput(lang === 'vi' ? 'Trình độ' : 'Education', 'education_level', editData, setEditField)}
                  {formInput(lang === 'vi' ? 'Hôn nhân' : 'Marital Status', 'marital_status', editData, setEditField, { type: 'select', options: [{ value: 'single', label: lang === 'vi' ? 'Độc thân' : 'Single' }, { value: 'married', label: lang === 'vi' ? 'Đã kết hôn' : 'Married' }, { value: 'divorced', label: lang === 'vi' ? 'Ly hôn' : 'Divorced' }, { value: 'widowed', label: lang === 'vi' ? 'Góa' : 'Widowed' }] })}
                </>)}

                {/* Tab 1: Location & Org */}
                {editModalTab === 1 && (<>
                  {formInput(lang === 'vi' ? 'Thôn/Bản' : 'Village', 'village_id', editData, setEditField, { type: 'select', options: villages.map(v => ({ value: v.id, label: v.name })) })}
                  {formInput(lang === 'vi' ? 'Nhóm hộ' : 'Group', 'group_id', editData, setEditField, { type: 'select', options: groups.map(g => ({ value: g.id, label: g.name })) })}
                  {formInput(lang === 'vi' ? 'Công ty' : 'Company', 'company', editData, setEditField)}
                  {formInput(lang === 'vi' ? 'Thành viên HTX' : 'Coop Member', 'cooperative_member', editData, setEditField, { type: 'checkbox' })}
                  {formInput(lang === 'vi' ? 'Tên HTX' : 'Coop Name', 'cooperative_name', editData, setEditField)}
                  {formInput(lang === 'vi' ? 'Loại nông dân' : 'Farmer Type', 'farmer_type', editData, setEditField)}
                  {formInput(lang === 'vi' ? 'Chi tiết loại' : 'Type Detail', 'farmer_type_detail', editData, setEditField)}
                </>)}

                {/* Tab 2: Household */}
                {editModalTab === 2 && (<>
                  {formInput(lang === 'vi' ? 'Là chủ hộ' : 'Household Head', 'is_household_head', editData, setEditField, { type: 'checkbox' })}
                  {formInput(lang === 'vi' ? 'Tên chủ hộ' : 'Head Name', 'household_head_name', editData, setEditField)}
                  {formInput(lang === 'vi' ? 'Số thành viên' : 'Members', 'household_members', editData, setEditField, { type: 'number' })}
                  {formInput(lang === 'vi' ? 'Lao động NN' : 'Farming Workers', 'farming_members', editData, setEditField, { type: 'number' })}
                  {formInput(lang === 'vi' ? 'Người phụ thuộc' : 'Dependents', 'dependents_count', editData, setEditField, { type: 'number' })}
                  {formInput(lang === 'vi' ? 'Mức thu nhập' : 'Income Level', 'income_level', editData, setEditField, { type: 'select', options: [{ value: 'poor', label: lang === 'vi' ? 'Nghèo' : 'Poor' }, { value: 'near_poor', label: lang === 'vi' ? 'Cận nghèo' : 'Near poor' }, { value: 'average', label: lang === 'vi' ? 'Trung bình' : 'Average' }, { value: 'above_average', label: lang === 'vi' ? 'Trên TB' : 'Above average' }] })}
                </>)}

                {/* Tab 3: Land & Production */}
                {editModalTab === 3 && (<>
                  {formInput(lang === 'vi' ? 'Tổng diện tích (ha)' : 'Total Area (ha)', 'total_farm_area', editData, setEditField, { type: 'number' })}
                  {formInput(lang === 'vi' ? 'Diện tích cà phê (ha)' : 'Coffee Area (ha)', 'total_coffee_area', editData, setEditField, { type: 'number' })}
                  {formInput(lang === 'vi' ? 'Số lô' : 'Total Plots', 'total_plots', editData, setEditField, { type: 'number' })}
                  {formInput(lang === 'vi' ? 'Kinh nghiệm (năm)' : 'Experience (years)', 'coffee_experience_years', editData, setEditField, { type: 'number' })}
                  {formInput(lang === 'vi' ? 'Có giấy CNQSDĐ' : 'Land Certificate', 'land_use_certificate', editData, setEditField, { type: 'checkbox' })}
                  {formInput(lang === 'vi' ? 'Số giấy CNQSDĐ' : 'Certificate No.', 'land_certificate_number', editData, setEditField)}
                </>)}

                {/* Tab 4: Other (Infrastructure, Cert, EUDR, Finance, Management) */}
                {editModalTab === 4 && (<>
                  <div className="full-width" style={{ fontSize: 12, fontWeight: 700, color: '#5D4037', marginTop: 4, marginBottom: -4 }}>
                    {lang === 'vi' ? '🔌 Hạ tầng' : '🔌 Infrastructure'}
                  </div>
                  {formInput(lang === 'vi' ? 'Nguồn nước' : 'Water', 'water_source', editData, setEditField, { type: 'select', options: ['well', 'river', 'rain', 'tap', 'spring', 'other'].map(v => ({ value: v, label: v })) })}
                  {formInput(lang === 'vi' ? 'Nguồn điện' : 'Electricity', 'electricity_source', editData, setEditField, { type: 'select', options: ['grid', 'solar', 'generator', 'none'].map(v => ({ value: v, label: v })) })}

                  <div className="full-width" style={{ fontSize: 12, fontWeight: 700, color: '#5D4037', marginTop: 8, marginBottom: -4 }}>
                    {lang === 'vi' ? '🏅 Chứng nhận' : '🏅 Certification'}
                  </div>
                  {formInput(lang === 'vi' ? 'Có chứng nhận' : 'Has Cert', 'has_certificate', editData, setEditField, { type: 'checkbox' })}
                  {formInput(lang === 'vi' ? 'Loại CN' : 'Cert Type', 'certificate_type', editData, setEditField)}
                  {formInput(lang === 'vi' ? 'Số CN' : 'Cert No.', 'certificate_number', editData, setEditField)}
                  {formInput(lang === 'vi' ? 'Ngày cấp CN' : 'Cert Date', 'certificate_date', editData, setEditField, { type: 'date' })}
                  {formInput(lang === 'vi' ? 'Hết hạn CN' : 'Cert Expiry', 'certificate_expiry', editData, setEditField, { type: 'date' })}

                  <div className="full-width" style={{ fontSize: 12, fontWeight: 700, color: '#5D4037', marginTop: 8, marginBottom: -4 }}>
                    {lang === 'vi' ? '🛡️ EUDR' : '🛡️ EUDR'}
                  </div>
                  {formInput(lang === 'vi' ? 'Tuân thủ EUDR' : 'EUDR Compliant', 'eudr_compliant', editData, setEditField, { type: 'checkbox' })}
                  {formInput(lang === 'vi' ? 'Ngày đánh giá' : 'Assessment Date', 'eudr_assessment_date', editData, setEditField, { type: 'date' })}
                  {formInput(lang === 'vi' ? 'Mức rủi ro' : 'Risk Level', 'eudr_risk_level', editData, setEditField)}

                  <div className="full-width" style={{ fontSize: 12, fontWeight: 700, color: '#5D4037', marginTop: 8, marginBottom: -4 }}>
                    {lang === 'vi' ? '🏦 Tài chính' : '🏦 Finance'}
                  </div>
                  {formInput(lang === 'vi' ? 'Có TK ngân hàng' : 'Bank Account', 'has_bank_account', editData, setEditField, { type: 'checkbox' })}
                  {formInput(lang === 'vi' ? 'Ngân hàng' : 'Bank Name', 'bank_name', editData, setEditField)}
                  {formInput(lang === 'vi' ? 'Số TK' : 'Account No.', 'bank_account', editData, setEditField)}
                  {formInput(lang === 'vi' ? 'Chi nhánh' : 'Branch', 'bank_branch', editData, setEditField)}

                  <div className="full-width" style={{ fontSize: 12, fontWeight: 700, color: '#5D4037', marginTop: 8, marginBottom: -4 }}>
                    {lang === 'vi' ? '📂 Quản lý' : '📂 Management'}
                  </div>
                  {formInput(lang === 'vi' ? 'Người đăng ký' : 'Registered By', 'registered_by', editData, setEditField)}
                  {formInput(lang === 'vi' ? 'Ngày ĐK' : 'Reg Date', 'registration_date', editData, setEditField, { type: 'date' })}
                  {formInput(lang === 'vi' ? 'Người xác minh' : 'Verified By', 'verified_by', editData, setEditField)}
                  {formInput(lang === 'vi' ? 'Ngày XM' : 'Verify Date', 'verified_date', editData, setEditField, { type: 'date' })}
                  {formInput(lang === 'vi' ? 'Ngày tham gia' : 'Enrollment', 'enrollment_date', editData, setEditField, { type: 'date' })}
                  {formInput(lang === 'vi' ? 'Ngày rút' : 'Withdrawal', 'withdrawal_date', editData, setEditField, { type: 'date' })}
                  {formInput(lang === 'vi' ? 'Lý do rút' : 'Withdrawal Reason', 'withdrawal_reason', editData, setEditField)}
                  {formInput(lang === 'vi' ? 'Nguồn DL' : 'Data Source', 'data_source', editData, setEditField)}
                  {formInput(lang === 'vi' ? 'Trạng thái' : 'Status', 'status', editData, setEditField, { type: 'select', options: ['active', 'inactive', 'pending', 'rejected', 'suspended'].map(v => ({ value: v, label: v })) })}
                  {formInput(lang === 'vi' ? 'Ghi chú' : 'Notes', 'notes', editData, setEditField, { type: 'textarea', fullWidth: true })}
                </>)}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                {lang === 'vi' ? 'Hủy' : 'Cancel'}
              </button>
              <button className="btn btn-primary" onClick={saveFarmer} disabled={saving}>
                {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
                {lang === 'vi' ? 'Lưu' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
         TAB CRUD MODAL
         ═══════════════════════════════════════════════════════ */}
      {tabModal && (
        <div className="modal-overlay" onClick={() => setTabModal(null)}>
          <div className="modal" style={{ maxWidth: 640, maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {tabModal.type === 'add' ? (lang === 'vi' ? 'Thêm mới' : 'Add New') : (lang === 'vi' ? 'Chỉnh sửa' : 'Edit')}
                {' — '}
                {tabs.find(t => t.key === tabModal.tab)?.label}
              </h2>
              <button className="modal-close" onClick={() => setTabModal(null)}><X size={16} /></button>
            </div>
            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <div className="form-grid">

                {/* EUDR Assessment fields */}
                {tabModal.tab === 'eudr' && (<>
                  {formInput(lang === 'vi' ? 'Mã đánh giá' : 'Assessment Code', 'assessment_code', tabModal.data, setTabField)}
                  {formInput(lang === 'vi' ? 'Ngày đánh giá' : 'Date', 'assessment_date', tabModal.data, setTabField, { type: 'date' })}
                  {formInput(lang === 'vi' ? 'Đánh giá viên' : 'Assessor', 'assessor_name', tabModal.data, setTabField)}
                  {formInput(lang === 'vi' ? 'Tổ chức ĐG' : 'Assessor Org', 'assessor_org', tabModal.data, setTabField)}
                  {formInput(lang === 'vi' ? 'Mức rủi ro' : 'Risk Level', 'risk_level', tabModal.data, setTabField, { type: 'select', options: [{ value: 'low', label: lang === 'vi' ? 'Thấp' : 'Low' }, { value: 'standard', label: lang === 'vi' ? 'Tiêu chuẩn' : 'Standard' }, { value: 'high', label: lang === 'vi' ? 'Cao' : 'High' }] })}
                  {formInput(lang === 'vi' ? 'Tổng điểm' : 'Total Score', 'total_score', tabModal.data, setTabField, { type: 'number' })}
                  {formInput(lang === 'vi' ? 'Điểm tối đa' : 'Max Score', 'max_score', tabModal.data, setTabField, { type: 'number' })}
                  {formInput(lang === 'vi' ? '% tuân thủ' : 'Compliance %', 'compliance_pct', tabModal.data, setTabField, { type: 'number' })}
                  {formInput(lang === 'vi' ? 'Không phá rừng' : 'Deforestation Free', 'deforestation_free', tabModal.data, setTabField, { type: 'checkbox' })}
                  {formInput(lang === 'vi' ? 'Ngày mốc' : 'Cutoff Date', 'cutoff_date', tabModal.data, setTabField, { type: 'date' })}
                  {formInput(lang === 'vi' ? 'Đề xuất' : 'Recommendation', 'recommendation', tabModal.data, setTabField, { type: 'textarea', fullWidth: true })}
                  {formInput(lang === 'vi' ? 'ĐG tiếp theo' : 'Next Assessment', 'next_assessment_date', tabModal.data, setTabField, { type: 'date' })}
                  {formInput(lang === 'vi' ? 'Trạng thái' : 'Status', 'status', tabModal.data, setTabField)}
                  {formInput(lang === 'vi' ? 'Ghi chú' : 'Notes', 'notes', tabModal.data, setTabField, { type: 'textarea', fullWidth: true })}
                </>)}

                {/* Support Distribution fields */}
                {tabModal.tab === 'support' && (<>
                  {formInput(lang === 'vi' ? 'Mã' : 'Code', 'code', tabModal.data, setTabField)}
                  {formInput(lang === 'vi' ? 'Số lượng' : 'Quantity', 'quantity', tabModal.data, setTabField, { type: 'number' })}
                  {formInput(lang === 'vi' ? 'Đơn vị' : 'Unit', 'unit', tabModal.data, setTabField)}
                  {formInput(lang === 'vi' ? 'Giá trị' : 'Value', 'value', tabModal.data, setTabField, { type: 'number' })}
                  {formInput(lang === 'vi' ? 'Ngày phát' : 'Distribution Date', 'distribution_date', tabModal.data, setTabField, { type: 'date' })}
                  {formInput(lang === 'vi' ? 'Người phát' : 'Distributed By', 'distributed_by', tabModal.data, setTabField)}
                  {formInput(lang === 'vi' ? 'Địa điểm' : 'Location', 'location', tabModal.data, setTabField)}
                  {formInput(lang === 'vi' ? 'Số biên lai' : 'Receipt No.', 'receipt_number', tabModal.data, setTabField)}
                  {formInput(lang === 'vi' ? 'Trạng thái' : 'Status', 'status', tabModal.data, setTabField)}
                  {formInput(lang === 'vi' ? 'Ghi chú' : 'Notes', 'notes', tabModal.data, setTabField, { type: 'textarea', fullWidth: true })}
                </>)}

                {/* Training Participant fields */}
                {tabModal.tab === 'training' && (<>
                  {formInput(lang === 'vi' ? 'Tên HV' : 'Participant Name', 'participant_name', tabModal.data, setTabField)}
                  {formInput(lang === 'vi' ? 'SĐT' : 'Phone', 'phone', tabModal.data, setTabField)}
                  {formInput(lang === 'vi' ? 'Giới tính' : 'Gender', 'gender', tabModal.data, setTabField, { type: 'select', options: [{ value: 'male', label: lang === 'vi' ? 'Nam' : 'Male' }, { value: 'female', label: lang === 'vi' ? 'Nữ' : 'Female' }, { value: 'other', label: lang === 'vi' ? 'Khác' : 'Other' }] })}
                  {formInput(lang === 'vi' ? 'Tổ chức' : 'Organization', 'organization', tabModal.data, setTabField)}
                  {formInput(lang === 'vi' ? 'Tham dự' : 'Attended', 'attended', tabModal.data, setTabField, { type: 'checkbox' })}
                  {formInput(lang === 'vi' ? 'Điểm' : 'Score', 'score', tabModal.data, setTabField, { type: 'number' })}
                  {formInput(lang === 'vi' ? 'Phản hồi' : 'Feedback', 'feedback', tabModal.data, setTabField, { type: 'textarea', fullWidth: true })}
                  {formInput(lang === 'vi' ? 'Ghi chú' : 'Notes', 'notes', tabModal.data, setTabField, { type: 'textarea', fullWidth: true })}
                </>)}

                {/* Sales Transaction fields */}
                {tabModal.tab === 'trade' && (<>
                  {formInput(lang === 'vi' ? 'Mã' : 'Code', 'code', tabModal.data, setTabField)}
                  {formInput(lang === 'vi' ? 'Ngày GD' : 'Date', 'transaction_date', tabModal.data, setTabField, { type: 'date' })}
                  {formInput(lang === 'vi' ? 'Loại GD' : 'Type', 'transaction_type', tabModal.data, setTabField, { type: 'select', options: [{ value: 'sale', label: lang === 'vi' ? 'Bán' : 'Sale' }, { value: 'purchase', label: lang === 'vi' ? 'Mua' : 'Purchase' }, { value: 'exchange', label: lang === 'vi' ? 'Trao đổi' : 'Exchange' }] })}
                  {formInput(lang === 'vi' ? 'Tổng SL' : 'Total Quantity', 'total_quantity', tabModal.data, setTabField, { type: 'number' })}
                  {formInput(lang === 'vi' ? 'Tổng tiền' : 'Total Amount', 'total_amount', tabModal.data, setTabField, { type: 'number' })}
                  {formInput(lang === 'vi' ? 'Tiền tệ' : 'Currency', 'currency', tabModal.data, setTabField)}
                  {formInput(lang === 'vi' ? 'Thanh toán' : 'Payment Method', 'payment_method', tabModal.data, setTabField, { type: 'select', options: [{ value: 'cash', label: lang === 'vi' ? 'Tiền mặt' : 'Cash' }, { value: 'bank', label: lang === 'vi' ? 'Chuyển khoản' : 'Bank' }, { value: 'mobile', label: 'Mobile' }] })}
                  {formInput(lang === 'vi' ? 'TT thanh toán' : 'Payment Status', 'payment_status', tabModal.data, setTabField, { type: 'select', options: [{ value: 'paid', label: lang === 'vi' ? 'Đã TT' : 'Paid' }, { value: 'pending', label: lang === 'vi' ? 'Chờ TT' : 'Pending' }, { value: 'partial', label: lang === 'vi' ? 'Một phần' : 'Partial' }] })}
                  {formInput(lang === 'vi' ? 'Số biên lai' : 'Receipt No.', 'receipt_number', tabModal.data, setTabField)}
                  {formInput(lang === 'vi' ? 'Nơi giao' : 'Delivery Location', 'delivery_location', tabModal.data, setTabField)}
                  {formInput(lang === 'vi' ? 'Trạng thái' : 'Status', 'status', tabModal.data, setTabField)}
                  {formInput(lang === 'vi' ? 'Ghi chú' : 'Notes', 'notes', tabModal.data, setTabField, { type: 'textarea', fullWidth: true })}
                </>)}

                {/* Farms fields */}
                {tabModal.tab === 'farms' && (<>
                  {formInput(lang === 'vi' ? 'Mã' : 'Code', 'code', tabModal.data, setTabField, { required: true })}
                  {formInput(lang === 'vi' ? 'DT cà phê (ha)' : 'Coffee Area (ha)', 'coffee_area', tabModal.data, setTabField, { type: 'number' })}
                  {formInput(lang === 'vi' ? 'Tổng DT (ha)' : 'Total Area (ha)', 'total_area', tabModal.data, setTabField, { type: 'number' })}
                  {formInput(lang === 'vi' ? 'Số cây' : 'Tree Count', 'tree_count', tabModal.data, setTabField, { type: 'number' })}
                  {formInput(lang === 'vi' ? 'Loại cây' : 'Crop Type', 'crop_type', tabModal.data, setTabField)}
                  {formInput(lang === 'vi' ? 'Vĩ độ' : 'Latitude', 'latitude', tabModal.data, setTabField, { type: 'number' })}
                  {formInput(lang === 'vi' ? 'Kinh độ' : 'Longitude', 'longitude', tabModal.data, setTabField, { type: 'number' })}
                  {formInput(lang === 'vi' ? 'Ghi chú' : 'Notes', 'notes', tabModal.data, setTabField, { type: 'textarea', fullWidth: true })}
                </>)}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setTabModal(null)}>
                {lang === 'vi' ? 'Hủy' : 'Cancel'}
              </button>
              <button className="btn btn-primary" onClick={saveTabItem} disabled={tabSaving}>
                {tabSaving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
                {lang === 'vi' ? 'Lưu' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
         DELETE CONFIRMATION DIALOG
         ═══════════════════════════════════════════════════════ */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{lang === 'vi' ? 'Xác nhận xóa' : 'Confirm Delete'}</h2>
              <button className="modal-close" onClick={() => setDeleteConfirm(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 14, color: '#5D4037', lineHeight: 1.6 }}>
                {lang === 'vi'
                  ? 'Bạn có chắc chắn muốn xóa bản ghi này? Hành động này không thể hoàn tác.'
                  : 'Are you sure you want to delete this record? This action cannot be undone.'}
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>
                {lang === 'vi' ? 'Hủy' : 'Cancel'}
              </button>
              <button className="btn btn-danger" onClick={deleteTabItem}>
                <Trash2 size={14} /> {lang === 'vi' ? 'Xóa' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
