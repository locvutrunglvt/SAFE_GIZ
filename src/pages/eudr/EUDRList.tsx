import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Pencil, Trash2, Search, ChevronLeft, ChevronRight, X,
  CheckCircle2, AlertTriangle, XCircle, ClipboardList, Filter,
  ArrowRight, ArrowLeft, Star, Minus, Eye, Save,
} from 'lucide-react';
import pb from '../../lib/pocketbase';

// ─── Interfaces ────────────────────────────────────────────────

interface EUDRCriteria {
  id: string;
  number: number;
  criteria_code: string;
  category: string;
  title_vi: string;
  title_en: string;
  guidance_vi: string;
  guidance_en: string;
  sort_order: number;
  is_critical: boolean;
  status: string;
}

interface EUDRAssessment {
  id: string;
  farm_id: string;
  farmer_id: string;
  assessment_code: string;
  assessment_date: string;
  assessor_name: string;
  assessor_org: string;
  risk_level: string;
  total_score: number;
  max_score: number;
  compliance_pct: number;
  deforestation_free: boolean;
  notes: string;
  status: string;
  expand?: {
    farmer_id?: { id: string; full_name: string; code: string };
    farm_id?: { id: string; code: string; plot_name: string };
  };
}

interface ChecklistResult {
  id?: string;
  assessment_id: string;
  criteria_id: string;
  result: string;
  score: number;
  evidence: string;
  notes: string;
}

interface FarmerOption { id: string; code: string; full_name: string }
interface FarmOption { id: string; code: string; farmer_id: string; plot_name: string }

type ResultValue = 'pass' | 'fail' | 'partial' | 'na' | '';

// ─── Constants ─────────────────────────────────────────────────

const STATUS_OPTIONS = ['draft', 'in_progress', 'completed', 'approved', 'rejected'] as const;
const RISK_OPTIONS = ['low', 'standard', 'high'] as const;
const PER_PAGE = 20;

// ─── Helpers ───────────────────────────────────────────────────

function resultIcon(r: string, size = 16) {
  switch (r) {
    case 'pass': return <CheckCircle2 size={size} style={{ color: '#2E7D32' }} />;
    case 'fail': return <XCircle size={size} style={{ color: '#C62828' }} />;
    case 'partial': return <AlertTriangle size={size} style={{ color: '#E65100' }} />;
    case 'na': return <Minus size={size} style={{ color: '#9E9E9E' }} />;
    default: return null;
  }
}

function statusMeta(s: string, lang: string) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    draft:       { bg: '#EFEBE9', color: '#5D4037', label: lang === 'vi' ? 'Nháp' : 'Draft' },
    in_progress: { bg: '#FFF3E0', color: '#E65100', label: lang === 'vi' ? 'Đang ĐG' : 'In Progress' },
    completed:   { bg: '#E8F5E9', color: '#2E7D32', label: lang === 'vi' ? 'Hoàn thành' : 'Completed' },
    approved:    { bg: '#E3F2FD', color: '#1565C0', label: lang === 'vi' ? 'Phê duyệt' : 'Approved' },
    rejected:    { bg: '#FFEBEE', color: '#C62828', label: lang === 'vi' ? 'Từ chối' : 'Rejected' },
  };
  return map[s] || map.draft;
}

function riskMeta(r: string, lang: string) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    low:      { bg: '#E8F5E9', color: '#2E7D32', label: lang === 'vi' ? 'Thấp' : 'Low' },
    standard: { bg: '#FFF3E0', color: '#E65100', label: lang === 'vi' ? 'Trung bình' : 'Standard' },
    high:     { bg: '#FFEBEE', color: '#C62828', label: lang === 'vi' ? 'Cao' : 'High' },
  };
  return map[r] || map.standard;
}

// ─── Component ─────────────────────────────────────────────────

export default function EUDRList() {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const navigate = useNavigate();
  const province = localStorage.getItem('selectedProvince') || 'SL';

  // ── List state ───────────────────────────────────────────────
  const [assessments, setAssessments] = useState<EUDRAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRisk, setFilterRisk] = useState('');

  // ── Stats ────────────────────────────────────────────────────
  const [stats, setStats] = useState({ total: 0, completed: 0, in_progress: 0, draft: 0 });

  // ── Modal state ──────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);
  const [saving, setSaving] = useState(false);

  // ── Form state (Step 1) ──────────────────────────────────────
  const [formId, setFormId] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formFarmerId, setFormFarmerId] = useState('');
  const [formFarmId, setFormFarmId] = useState('');
  const [formAssessor, setFormAssessor] = useState('');
  const [formOrg, setFormOrg] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formStatus, setFormStatus] = useState('draft');

  // ── Checklist state (Step 2) ─────────────────────────────────
  const [allCriteria, setAllCriteria] = useState<EUDRCriteria[]>([]);
  const [checklistMap, setChecklistMap] = useState<Record<string, { result: ResultValue; evidence: string; notes: string }>>({});

  // ── Dropdown data ────────────────────────────────────────────
  const [farmersList, setFarmersList] = useState<FarmerOption[]>([]);
  const [farmsList, setFarmsList] = useState<FarmOption[]>([]);

  // ── View detail ──────────────────────────────────────────────
  const [viewItem, setViewItem] = useState<EUDRAssessment | null>(null);
  const [viewResults, setViewResults] = useState<ChecklistResult[]>([]);
  const [viewLoading, setViewLoading] = useState(false);

  // ── Delete ───────────────────────────────────────────────────
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // ─── Filtered farms by selected farmer ───────────────────────
  const filteredFarms = useMemo(() => {
    if (!formFarmerId) return farmsList;
    return farmsList.filter(f => f.farmer_id === formFarmerId);
  }, [formFarmerId, farmsList]);

  // ─── Categories grouped from criteria ────────────────────────
  const categoriesGrouped = useMemo(() => {
    const groups: Record<string, EUDRCriteria[]> = {};
    for (const c of allCriteria) {
      const cat = c.category || 'General';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(c);
    }
    return groups;
  }, [allCriteria]);

  // ─── Auto-calculated summary from checklist ──────────────────
  const calculatedSummary = useMemo(() => {
    let totalScore = 0;
    let maxScore = 0;
    let deforestationFree = true;

    for (const c of allCriteria) {
      const entry = checklistMap[c.id];
      const result = entry?.result || '';
      if (result === 'na') continue;
      maxScore++;
      if (result === 'pass') totalScore++;
      // Deforestation-related criteria: check category or code hint
      const isDeforestationRelated = c.category?.toLowerCase().includes('deforestation')
        || c.criteria_code?.toLowerCase().includes('deforest')
        || c.title_en?.toLowerCase().includes('deforestation');
      if (isDeforestationRelated && result !== 'pass') {
        deforestationFree = false;
      }
    }

    const compliancePct = maxScore > 0 ? parseFloat((totalScore / maxScore * 100).toFixed(1)) : 0;
    const riskLevel: string = compliancePct >= 80 ? 'low' : compliancePct >= 50 ? 'standard' : 'high';

    return { totalScore, maxScore, compliancePct, riskLevel, deforestationFree };
  }, [allCriteria, checklistMap]);

  // ─── Fetch assessment list ───────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const filters: string[] = [];
      if (search) filters.push(`(assessment_code~"${search}" || assessor_name~"${search}")`);
      if (filterStatus) filters.push(`status="${filterStatus}"`);
      if (filterRisk) filters.push(`risk_level="${filterRisk}"`);

      const result = await pb.collection('eudr_assessments').getList(page, PER_PAGE, {
        sort: '-assessment_date',
        expand: 'farmer_id,farm_id',
        filter: filters.join(' && '),
      });
      setAssessments(result.items as unknown as EUDRAssessment[]);
      setTotalPages(result.totalPages);
      setTotalItems(result.totalItems);
    } catch (e) { console.error('fetchData error:', e); }
    setLoading(false);
  }, [page, search, filterStatus, filterRisk]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Fetch stats ─────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [all, completed, inProgress, draft] = await Promise.allSettled([
          pb.collection('eudr_assessments').getList(1, 1),
          pb.collection('eudr_assessments').getList(1, 1, { filter: 'status="completed"' }),
          pb.collection('eudr_assessments').getList(1, 1, { filter: 'status="in_progress"' }),
          pb.collection('eudr_assessments').getList(1, 1, { filter: 'status="draft"' }),
        ]);
        const v = (r: PromiseSettledResult<{ totalItems: number }>) =>
          r.status === 'fulfilled' ? r.value.totalItems : 0;
        setStats({ total: v(all), completed: v(completed), in_progress: v(inProgress), draft: v(draft) });
      } catch { /* ignore */ }
    })();
  }, [assessments]);

  // ─── Load dropdown data ──────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [f, fm] = await Promise.all([
          pb.collection('farmers').getFullList({ sort: 'full_name', fields: 'id,code,full_name' }),
          pb.collection('farms').getFullList({ sort: 'code', fields: 'id,code,farmer_id,plot_name' }),
        ]);
        setFarmersList(f as unknown as FarmerOption[]);
        setFarmsList(fm as unknown as FarmOption[]);
      } catch { /* ignore */ }
    })();
  }, []);

  // ─── Load all criteria (once) ────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const items = await pb.collection('eudr_criteria').getFullList({
          sort: 'sort_order',
          filter: 'status="active"',
        });
        setAllCriteria(items as unknown as EUDRCriteria[]);
      } catch { /* ignore */ }
    })();
  }, []);

  // ─── Generate next assessment code ───────────────────────────
  const generateNextCode = async (): Promise<string> => {
    try {
      const latest = await pb.collection('eudr_assessments').getList(1, 1, { sort: '-assessment_code' });
      if (latest.items.length > 0) {
        const match = (latest.items[0].assessment_code as string).match(/(\d+)$/);
        if (match) return `EUDR-${province}${(parseInt(match[1]) + 1).toString().padStart(4, '0')}`;
      }
    } catch { /* ignore */ }
    return `EUDR-${province}0001`;
  };

  // ─── Reset wizard form ───────────────────────────────────────
  const resetForm = () => {
    setFormId('');
    setFormCode('');
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormFarmerId('');
    setFormFarmId('');
    setFormAssessor('');
    setFormOrg('');
    setFormNotes('');
    setFormStatus('draft');
    setChecklistMap({});
    setWizardStep(1);
  };

  // ─── Handle ADD ──────────────────────────────────────────────
  const handleAdd = async () => {
    resetForm();
    const code = await generateNextCode();
    setFormCode(code);
    setShowModal(true);
  };

  // ─── Handle EDIT ─────────────────────────────────────────────
  const handleEdit = async (item: EUDRAssessment) => {
    resetForm();
    setFormId(item.id);
    setFormCode(item.assessment_code);
    setFormDate(item.assessment_date?.slice(0, 10) || '');
    setFormFarmerId(item.farmer_id || '');
    setFormFarmId(item.farm_id || '');
    setFormAssessor(item.assessor_name || '');
    setFormOrg(item.assessor_org || '');
    setFormNotes(item.notes || '');
    setFormStatus(item.status || 'draft');

    // Load existing checklist results
    try {
      const results = await pb.collection('eudr_checklist_results').getFullList({
        filter: `assessment_id="${item.id}"`,
      });
      const map: Record<string, { result: ResultValue; evidence: string; notes: string }> = {};
      for (const r of results) {
        map[r.criteria_id as string] = {
          result: (r.result as ResultValue) || '',
          evidence: (r.evidence as string) || '',
          notes: (r.notes as string) || '',
        };
      }
      setChecklistMap(map);
    } catch { /* ignore */ }

    setShowModal(true);
  };

  // ─── Handle DELETE ───────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      // Delete related checklist results first
      const results = await pb.collection('eudr_checklist_results').getFullList({
        filter: `assessment_id="${deleteId}"`,
        fields: 'id',
      });
      for (const r of results) {
        await pb.collection('eudr_checklist_results').delete(r.id);
      }
      await pb.collection('eudr_assessments').delete(deleteId);
      setDeleteId(null);
      fetchData();
    } catch { alert('Error deleting'); }
  };

  // ─── Handle SAVE ─────────────────────────────────────────────
  const handleSave = async () => {
    if (!formFarmId) {
      alert(lang === 'vi' ? 'Vui lòng chọn nông trại' : 'Please select a farm');
      return;
    }
    setSaving(true);
    try {
      const { totalScore, maxScore, compliancePct, riskLevel, deforestationFree } = calculatedSummary;

      const assessmentData: Record<string, unknown> = {
        assessment_code: formCode,
        assessment_date: formDate || new Date().toISOString().slice(0, 10),
        farmer_id: formFarmerId || '',
        farm_id: formFarmId,
        assessor_name: formAssessor,
        assessor_org: formOrg,
        notes: formNotes,
        status: formStatus,
        total_score: totalScore,
        max_score: maxScore,
        compliance_pct: compliancePct,
        risk_level: riskLevel,
        deforestation_free: deforestationFree,
      };

      let assessmentId = formId;
      if (formId) {
        await pb.collection('eudr_assessments').update(formId, assessmentData);
      } else {
        const created = await pb.collection('eudr_assessments').create(assessmentData);
        assessmentId = created.id;
      }

      // Save checklist results
      // First get existing results to know which to update vs create
      const existingResults = formId
        ? await pb.collection('eudr_checklist_results').getFullList({
            filter: `assessment_id="${assessmentId}"`,
          })
        : [];

      const existingMap = new Map<string, string>();
      for (const er of existingResults) {
        existingMap.set(er.criteria_id as string, er.id);
      }

      for (const criteria of allCriteria) {
        const entry = checklistMap[criteria.id];
        if (!entry || !entry.result) continue;

        const resultData: Record<string, unknown> = {
          assessment_id: assessmentId,
          criteria_id: criteria.id,
          result: entry.result,
          score: entry.result === 'pass' ? 1 : 0,
          evidence: entry.evidence || '',
          notes: entry.notes || '',
        };

        const existingId = existingMap.get(criteria.id);
        if (existingId) {
          await pb.collection('eudr_checklist_results').update(existingId, resultData);
        } else {
          await pb.collection('eudr_checklist_results').create(resultData);
        }
      }

      setShowModal(false);
      resetForm();
      fetchData();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error saving';
      alert(msg);
    }
    setSaving(false);
  };

  // ─── Handle VIEW detail ──────────────────────────────────────
  const handleView = async (item: EUDRAssessment) => {
    setViewItem(item);
    setViewLoading(true);
    try {
      const results = await pb.collection('eudr_checklist_results').getFullList({
        filter: `assessment_id="${item.id}"`,
      });
      setViewResults(results as unknown as ChecklistResult[]);
    } catch { setViewResults([]); }
    setViewLoading(false);
  };

  // ─── Update a checklist entry ────────────────────────────────
  const setChecklistField = (criteriaId: string, field: 'result' | 'evidence' | 'notes', value: string) => {
    setChecklistMap(prev => {
      const existing = prev[criteriaId] || { result: '' as ResultValue, evidence: '', notes: '' };
      return { ...prev, [criteriaId]: { ...existing, [field]: value } };
    });
  };

  // ─── Render badges ───────────────────────────────────────────
  const renderStatusBadge = (s: string) => {
    const m = statusMeta(s, lang);
    return (
      <span style={{ background: m.bg, color: m.color, padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
        {m.label}
      </span>
    );
  };

  const renderRiskBadge = (r: string) => {
    const m = riskMeta(r, lang);
    return (
      <span style={{ background: m.bg, color: m.color, padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
        {m.label}
      </span>
    );
  };

  // ─── Compliance progress bar ─────────────────────────────────
  const renderComplianceBar = (pct: number) => {
    const barColor = pct >= 80 ? '#2E7D32' : pct >= 50 ? '#E65100' : '#C62828';
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, height: 8, background: '#EFEBE9', borderRadius: 4, overflow: 'hidden', minWidth: 60 }}>
          <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: barColor, borderRadius: 4, transition: 'width 0.3s' }} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: barColor, minWidth: 40, textAlign: 'right' }}>{pct}%</span>
      </div>
    );
  };

  // ─── RENDER ──────────────────────────────────────────────────
  return (
    <div className="animate-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">EUDR Compliance</h1>
          <p className="page-subtitle">
            {lang === 'vi'
              ? 'Đánh giá tuân thủ Quy định không gây mất rừng của EU'
              : 'EU Deforestation-Free Regulation Assessment'}
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={handleAdd}>
            <Plus size={16} /> {lang === 'vi' ? 'Đánh giá mới' : 'New Assessment'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: lang === 'vi' ? 'Tổng đánh giá' : 'Total', value: stats.total, bg: '#EFEBE9', color: '#5D4037' },
          { label: lang === 'vi' ? 'Hoàn thành' : 'Completed', value: stats.completed, bg: '#E8F5E9', color: '#2E7D32' },
          { label: lang === 'vi' ? 'Đang ĐG' : 'In Progress', value: stats.in_progress, bg: '#FFF3E0', color: '#E65100' },
          { label: lang === 'vi' ? 'Nháp' : 'Draft', value: stats.draft, bg: '#F5F5F5', color: '#757575' },
        ].map((s, i) => (
          <div key={i} style={{ background: s.bg, borderRadius: 12, padding: '16px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: s.color, opacity: 0.8 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search + Filters */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#8D6E63' }} />
          <input
            type="text"
            placeholder={lang === 'vi' ? 'Tìm theo mã...' : 'Search by code...'}
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1.5px solid #D7CCC8', borderRadius: 8, fontSize: 14 }}
          />
        </div>
        <Filter size={14} style={{ color: '#8D6E63' }} />
        <select
          value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
          style={{ padding: '9px 12px', border: '1.5px solid #D7CCC8', borderRadius: 8, fontSize: 13 }}
        >
          <option value="">{lang === 'vi' ? 'Tất cả trạng thái' : 'All status'}</option>
          {STATUS_OPTIONS.map(s => (
            <option key={s} value={s}>{statusMeta(s, lang).label}</option>
          ))}
        </select>
        <select
          value={filterRisk}
          onChange={e => { setFilterRisk(e.target.value); setPage(1); }}
          style={{ padding: '9px 12px', border: '1.5px solid #D7CCC8', borderRadius: 8, fontSize: 13 }}
        >
          <option value="">{lang === 'vi' ? 'Mức rủi ro' : 'Risk level'}</option>
          {RISK_OPTIONS.map(r => (
            <option key={r} value={r}>{riskMeta(r, lang).label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F5F0EB', borderBottom: '2px solid #D7CCC8' }}>
                {[
                  '#',
                  lang === 'vi' ? 'Mã ĐG' : 'Code',
                  lang === 'vi' ? 'Nông dân' : 'Farmer',
                  lang === 'vi' ? 'Nông trại' : 'Farm',
                  lang === 'vi' ? 'Ngày ĐG' : 'Date',
                  lang === 'vi' ? 'Điểm %' : 'Score %',
                  lang === 'vi' ? 'Rủi ro' : 'Risk',
                  lang === 'vi' ? 'Trạng thái' : 'Status',
                  '',
                ].map((h, i) => (
                  <th key={i} style={{ padding: '12px 10px', textAlign: i === 0 ? 'center' : 'left', fontWeight: 600, color: '#5D4037', whiteSpace: 'nowrap', fontSize: 12 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#8D6E63' }}>
                    {lang === 'vi' ? 'Đang tải...' : 'Loading...'}
                  </td>
                </tr>
              ) : assessments.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#8D6E63' }}>
                    <ClipboardList size={32} style={{ opacity: 0.3, marginBottom: 8 }} /><br />
                    {lang === 'vi' ? 'Chưa có đánh giá EUDR' : 'No EUDR assessments yet'}
                  </td>
                </tr>
              ) : assessments.map((a, idx) => (
                <tr
                  key={a.id}
                  style={{
                    borderBottom: '1px solid #EFEBE9',
                    background: idx % 2 === 0 ? 'white' : '#FAFAF8',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F5F0EB')}
                  onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? 'white' : '#FAFAF8')}
                >
                  <td style={{ padding: '10px', textAlign: 'center', color: '#A1887F' }}>{(page - 1) * PER_PAGE + idx + 1}</td>
                  <td style={{ padding: '10px', fontWeight: 600, color: '#5D4037', fontFamily: 'monospace', fontSize: 11 }}>{a.assessment_code}</td>
                  <td style={{ padding: '10px' }}>
                    <span
                      style={{ fontWeight: 500, cursor: 'pointer', color: '#5D4037', textDecoration: 'underline', textDecorationColor: '#D7CCC8' }}
                      onClick={e => { e.stopPropagation(); if (a.farmer_id) navigate(`/farmers/${a.farmer_id}`); }}
                    >
                      {a.expand?.farmer_id?.full_name || '—'}
                    </span>
                  </td>
                  <td style={{ padding: '10px' }}>
                    <span
                      style={{ fontSize: 12, cursor: 'pointer', color: '#8D6E63', textDecoration: 'underline', textDecorationColor: '#D7CCC8' }}
                      onClick={e => { e.stopPropagation(); if (a.farm_id) navigate(`/farms/${a.farm_id}`); }}
                    >
                      {a.expand?.farm_id?.code || '—'}
                    </span>
                  </td>
                  <td style={{ padding: '10px', fontSize: 11, color: '#8D6E63' }}>{a.assessment_date?.slice(0, 10) || '—'}</td>
                  <td style={{ padding: '10px', minWidth: 110 }}>
                    {renderComplianceBar(a.compliance_pct || 0)}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>{renderRiskBadge(a.risk_level)}</td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>{renderStatusBadge(a.status)}</td>
                  <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>
                    <button onClick={() => handleView(a)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1565C0', padding: 4 }} title="View"><Eye size={15} /></button>
                    <button onClick={() => handleEdit(a)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5D4037', padding: 4 }} title="Edit"><Pencil size={15} /></button>
                    <button onClick={() => setDeleteId(a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C62828', padding: 4 }} title="Delete"><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid #EFEBE9', fontSize: 13, color: '#8D6E63' }}>
          <span>
            {lang === 'vi'
              ? `Trang ${page}/${totalPages} (${totalItems} bản ghi)`
              : `Page ${page}/${totalPages} (${totalItems} records)`}
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

      {/* ═══════════════════════════════════════════════════════════
          WIZARD MODAL — Create / Edit Assessment
         ═══════════════════════════════════════════════════════════ */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div
            style={{
              background: 'white', borderRadius: 16, width: '94vw', maxWidth: 900,
              height: '90vh', display: 'flex', flexDirection: 'column',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ padding: '20px 28px', borderBottom: '1px solid #EFEBE9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#3E2723', margin: 0 }}>
                  {formId
                    ? (lang === 'vi' ? 'Sửa đánh giá EUDR' : 'Edit EUDR Assessment')
                    : (lang === 'vi' ? 'Đánh giá EUDR mới' : 'New EUDR Assessment')}
                </h2>
                {/* Step indicator */}
                <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                  <span style={{
                    fontSize: 12, fontWeight: 600, padding: '3px 12px', borderRadius: 12,
                    background: wizardStep === 1 ? '#5D4037' : '#EFEBE9',
                    color: wizardStep === 1 ? 'white' : '#8D6E63',
                  }}>
                    1. {lang === 'vi' ? 'Thông tin chung' : 'General Info'}
                  </span>
                  <span style={{
                    fontSize: 12, fontWeight: 600, padding: '3px 12px', borderRadius: 12,
                    background: wizardStep === 2 ? '#5D4037' : '#EFEBE9',
                    color: wizardStep === 2 ? 'white' : '#8D6E63',
                  }}>
                    2. {lang === 'vi' ? 'Bộ tiêu chí EUDR' : 'EUDR Checklist'}
                  </span>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}><X size={22} /></button>
            </div>

            {/* Modal Body */}
            <div style={{ flex: 1, overflow: 'auto', padding: '24px 28px' }}>
              {/* ─── STEP 1: General Info ─────────────────────────── */}
              {wizardStep === 1 && (
                <div>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>{lang === 'vi' ? 'Mã đánh giá' : 'Assessment Code'}</label>
                      <input value={formCode} readOnly />
                    </div>
                    <div className="form-group">
                      <label>{lang === 'vi' ? 'Ngày đánh giá' : 'Assessment Date'} <span style={{ color: '#C62828' }}>*</span></label>
                      <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>{lang === 'vi' ? 'Nông dân' : 'Farmer'}</label>
                      <select value={formFarmerId} onChange={e => { setFormFarmerId(e.target.value); setFormFarmId(''); }}>
                        <option value="">{lang === 'vi' ? '— Chọn nông dân —' : '— Select farmer —'}</option>
                        {farmersList.map(f => <option key={f.id} value={f.id}>{f.full_name} ({f.code})</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>{lang === 'vi' ? 'Nông trại' : 'Farm'} <span style={{ color: '#C62828' }}>*</span></label>
                      <select value={formFarmId} onChange={e => setFormFarmId(e.target.value)}>
                        <option value="">{lang === 'vi' ? '— Chọn nông trại —' : '— Select farm —'}</option>
                        {filteredFarms.map(f => <option key={f.id} value={f.id}>{f.code}{f.plot_name ? ` — ${f.plot_name}` : ''}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>{lang === 'vi' ? 'Người đánh giá' : 'Assessor Name'}</label>
                      <input value={formAssessor} onChange={e => setFormAssessor(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>{lang === 'vi' ? 'Tổ chức' : 'Organization'}</label>
                      <input value={formOrg} onChange={e => setFormOrg(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>{lang === 'vi' ? 'Trạng thái' : 'Status'}</label>
                      <select value={formStatus} onChange={e => setFormStatus(e.target.value)}>
                        {STATUS_OPTIONS.map(s => (
                          <option key={s} value={s}>{statusMeta(s, lang).label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group" />
                    <div className="form-group full-width">
                      <label>{lang === 'vi' ? 'Ghi chú' : 'Notes'}</label>
                      <textarea
                        rows={3}
                        value={formNotes}
                        onChange={e => setFormNotes(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #D7CCC8', borderRadius: 8, fontSize: 14, resize: 'vertical', fontFamily: 'inherit' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ─── STEP 2: EUDR Checklist ──────────────────────── */}
              {wizardStep === 2 && (
                <div>
                  {allCriteria.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: '#8D6E63' }}>
                      {lang === 'vi' ? 'Không tìm thấy tiêu chí đánh giá' : 'No assessment criteria found'}
                    </div>
                  ) : (
                    Object.entries(categoriesGrouped).map(([category, criteria]) => (
                      <div key={category} style={{ marginBottom: 24 }}>
                        {/* Category header */}
                        <div style={{
                          padding: '10px 16px', background: '#F5F0EB', borderRadius: 10,
                          marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8,
                        }}>
                          <ClipboardList size={16} style={{ color: '#5D4037' }} />
                          <span style={{ fontWeight: 700, fontSize: 14, color: '#3E2723' }}>{category}</span>
                          <span style={{ fontSize: 11, color: '#8D6E63', marginLeft: 4 }}>({criteria.length})</span>
                        </div>

                        {/* Criteria cards */}
                        {criteria.map(c => {
                          const entry = checklistMap[c.id] || { result: '' as ResultValue, evidence: '', notes: '' };
                          const resultColors: Record<string, string> = {
                            pass: '#E8F5E9', fail: '#FFEBEE', partial: '#FFF3E0', na: '#F5F5F5',
                          };
                          const bgColor = entry.result ? (resultColors[entry.result] || 'white') : 'white';

                          return (
                            <div
                              key={c.id}
                              style={{
                                padding: '14px 16px', marginBottom: 8, borderRadius: 10,
                                border: `1.5px solid ${entry.result === 'pass' ? '#81C784' : entry.result === 'fail' ? '#EF9A9A' : '#D7CCC8'}`,
                                background: bgColor, transition: 'all 0.2s',
                              }}
                            >
                              {/* Criteria header row */}
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: '#8D6E63', fontFamily: 'monospace' }}>
                                      {c.criteria_code}
                                    </span>
                                    {c.is_critical && (
                                      <span style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 2,
                                        background: '#FFEBEE', color: '#C62828', padding: '1px 8px',
                                        borderRadius: 10, fontSize: 10, fontWeight: 700,
                                      }}>
                                        <Star size={10} /> {lang === 'vi' ? 'Quan trọng' : 'Critical'}
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: 14, fontWeight: 600, color: '#3E2723', marginBottom: 4 }}>
                                    {lang === 'vi' ? c.title_vi : c.title_en}
                                  </div>
                                  {(lang === 'vi' ? c.guidance_vi : c.guidance_en) && (
                                    <div style={{ fontSize: 12, color: '#8D6E63', lineHeight: 1.5 }}>
                                      {lang === 'vi' ? c.guidance_vi : c.guidance_en}
                                    </div>
                                  )}
                                </div>

                                {/* Result select */}
                                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                                  {([
                                    { val: 'pass' as ResultValue, icon: <CheckCircle2 size={16} />, color: '#2E7D32', bg: '#E8F5E9', tip: lang === 'vi' ? 'Đạt' : 'Pass' },
                                    { val: 'fail' as ResultValue, icon: <XCircle size={16} />, color: '#C62828', bg: '#FFEBEE', tip: lang === 'vi' ? 'Không đạt' : 'Fail' },
                                    { val: 'partial' as ResultValue, icon: <AlertTriangle size={16} />, color: '#E65100', bg: '#FFF3E0', tip: lang === 'vi' ? 'Một phần' : 'Partial' },
                                    { val: 'na' as ResultValue, icon: <Minus size={16} />, color: '#757575', bg: '#F5F5F5', tip: 'N/A' },
                                  ]).map(opt => (
                                    <button
                                      key={opt.val}
                                      title={opt.tip}
                                      onClick={() => setChecklistField(c.id, 'result', entry.result === opt.val ? '' : opt.val)}
                                      style={{
                                        width: 36, height: 36, borderRadius: 8,
                                        border: `2px solid ${entry.result === opt.val ? opt.color : '#D7CCC8'}`,
                                        background: entry.result === opt.val ? opt.bg : 'white',
                                        color: entry.result === opt.val ? opt.color : '#BCAAA4',
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        transition: 'all 0.15s',
                                      }}
                                    >
                                      {opt.icon}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Evidence & notes — shown when a result is selected */}
                              {entry.result && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                                  <input
                                    placeholder={lang === 'vi' ? 'Bằng chứng / Evidence...' : 'Evidence...'}
                                    value={entry.evidence}
                                    onChange={e => setChecklistField(c.id, 'evidence', e.target.value)}
                                    style={{ padding: '6px 10px', border: '1px solid #D7CCC8', borderRadius: 6, fontSize: 12 }}
                                  />
                                  <input
                                    placeholder={lang === 'vi' ? 'Ghi chú / Notes...' : 'Notes...'}
                                    value={entry.notes}
                                    onChange={e => setChecklistField(c.id, 'notes', e.target.value)}
                                    style={{ padding: '6px 10px', border: '1px solid #D7CCC8', borderRadius: 6, fontSize: 12 }}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))
                  )}

                  {/* Summary bar */}
                  {allCriteria.length > 0 && (
                    <div style={{
                      marginTop: 20, padding: '16px 20px', borderRadius: 12,
                      background: '#F5F0EB', border: '1.5px solid #D7CCC8',
                    }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#3E2723', marginBottom: 12 }}>
                        {lang === 'vi' ? '📊 Tổng kết đánh giá' : '📊 Assessment Summary'}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                        <div style={{ background: 'white', borderRadius: 10, padding: '12px 16px', textAlign: 'center' }}>
                          <div style={{ fontSize: 22, fontWeight: 800, color: '#5D4037' }}>
                            {calculatedSummary.totalScore}/{calculatedSummary.maxScore}
                          </div>
                          <div style={{ fontSize: 11, color: '#8D6E63', fontWeight: 600 }}>
                            {lang === 'vi' ? 'Đạt / Tổng' : 'Pass / Total'}
                          </div>
                        </div>
                        <div style={{ background: 'white', borderRadius: 10, padding: '12px 16px', textAlign: 'center' }}>
                          <div style={{ fontSize: 22, fontWeight: 800, color: riskMeta(calculatedSummary.riskLevel, lang).color }}>
                            {calculatedSummary.compliancePct}%
                          </div>
                          <div style={{ fontSize: 11, color: '#8D6E63', fontWeight: 600 }}>
                            {lang === 'vi' ? 'Tỉ lệ tuân thủ' : 'Compliance %'}
                          </div>
                        </div>
                        <div style={{ background: 'white', borderRadius: 10, padding: '12px 16px', textAlign: 'center' }}>
                          {renderRiskBadge(calculatedSummary.riskLevel)}
                          <div style={{ fontSize: 11, color: '#8D6E63', fontWeight: 600, marginTop: 4 }}>
                            {lang === 'vi' ? 'Mức rủi ro' : 'Risk Level'}
                          </div>
                        </div>
                        <div style={{ background: 'white', borderRadius: 10, padding: '12px 16px', textAlign: 'center' }}>
                          <span style={{
                            padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700,
                            background: calculatedSummary.deforestationFree ? '#E8F5E9' : '#FFEBEE',
                            color: calculatedSummary.deforestationFree ? '#2E7D32' : '#C62828',
                          }}>
                            {calculatedSummary.deforestationFree
                              ? (lang === 'vi' ? '✅ Không mất rừng' : '✅ Deforestation-free')
                              : (lang === 'vi' ? '❌ Có rủi ro mất rừng' : '❌ Deforestation risk')}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '16px 28px', borderTop: '1px solid #EFEBE9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div>
                {wizardStep === 2 && (
                  <button
                    className="btn btn-secondary"
                    onClick={() => setWizardStep(1)}
                  >
                    <ArrowLeft size={16} /> {lang === 'vi' ? 'Quay lại' : 'Back'}
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  {lang === 'vi' ? 'Hủy' : 'Cancel'}
                </button>
                {wizardStep === 1 && (
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      if (!formFarmId) {
                        alert(lang === 'vi' ? 'Vui lòng chọn nông trại' : 'Please select a farm');
                        return;
                      }
                      setWizardStep(2);
                    }}
                  >
                    {lang === 'vi' ? 'Tiếp theo → Checklist' : 'Next → Checklist'} <ArrowRight size={16} />
                  </button>
                )}
                {wizardStep === 2 && (
                  <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                    <Save size={16} />
                    {saving ? '...' : formId ? (lang === 'vi' ? 'Cập nhật' : 'Update') : (lang === 'vi' ? 'Lưu đánh giá' : 'Save Assessment')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          VIEW DETAIL MODAL
         ═══════════════════════════════════════════════════════════ */}
      {viewItem && (
        <div className="modal-overlay" onClick={() => setViewItem(null)}>
          <div
            style={{
              background: 'white', borderRadius: 16, width: '90vw', maxWidth: 800,
              maxHeight: '90vh', overflow: 'auto', padding: 28,
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#3E2723', margin: 0 }}>{viewItem.assessment_code}</h2>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  {renderStatusBadge(viewItem.status)}
                  {renderRiskBadge(viewItem.risk_level)}
                </div>
              </div>
              <button onClick={() => setViewItem(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={22} /></button>
            </div>

            {/* Assessment info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: '#8D6E63' }}>
                {lang === 'vi' ? 'Nông dân' : 'Farmer'}: <strong style={{ color: '#3E2723' }}>{viewItem.expand?.farmer_id?.full_name || '—'}</strong>
              </div>
              <div style={{ fontSize: 13, color: '#8D6E63' }}>
                {lang === 'vi' ? 'Nông trại' : 'Farm'}: <strong style={{ color: '#3E2723' }}>{viewItem.expand?.farm_id?.code || '—'}</strong>
              </div>
              <div style={{ fontSize: 13, color: '#8D6E63' }}>
                {lang === 'vi' ? 'Ngày ĐG' : 'Date'}: <strong style={{ color: '#3E2723' }}>{viewItem.assessment_date?.slice(0, 10)}</strong>
              </div>
              <div style={{ fontSize: 13, color: '#8D6E63' }}>
                {lang === 'vi' ? 'Người ĐG' : 'Assessor'}: <strong style={{ color: '#3E2723' }}>{viewItem.assessor_name || '—'}</strong>
              </div>
            </div>

            {/* Compliance summary */}
            <div style={{ marginBottom: 20, padding: '16px 20px', background: '#F5F0EB', borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 11, color: '#8D6E63', fontWeight: 600, marginBottom: 2 }}>{lang === 'vi' ? 'Điểm' : 'Score'}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#5D4037' }}>{viewItem.total_score}/{viewItem.max_score}</div>
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: 11, color: '#8D6E63', fontWeight: 600, marginBottom: 4 }}>{lang === 'vi' ? 'Tuân thủ' : 'Compliance'}</div>
                  {renderComplianceBar(viewItem.compliance_pct || 0)}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span style={{
                    padding: '4px 12px', borderRadius: 12, fontSize: 12, fontWeight: 700,
                    background: viewItem.deforestation_free ? '#E8F5E9' : '#FFEBEE',
                    color: viewItem.deforestation_free ? '#2E7D32' : '#C62828',
                  }}>
                    {viewItem.deforestation_free
                      ? (lang === 'vi' ? '✅ Không mất rừng' : '✅ Deforestation-free')
                      : (lang === 'vi' ? '❌ Rủi ro mất rừng' : '❌ Deforestation risk')}
                  </span>
                </div>
              </div>
            </div>

            {/* Checklist results */}
            {viewLoading ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#8D6E63' }}>{lang === 'vi' ? 'Đang tải...' : 'Loading...'}</div>
            ) : (
              (() => {
                // Group results by category using criteria lookup
                const criteriaById = new Map(allCriteria.map(c => [c.id, c]));
                const resultsByCriteria = new Map(viewResults.map(r => [r.criteria_id, r]));
                const grouped: Record<string, { criteria: EUDRCriteria; result: ChecklistResult | undefined }[]> = {};

                for (const c of allCriteria) {
                  const cat = c.category || 'General';
                  if (!grouped[cat]) grouped[cat] = [];
                  grouped[cat].push({ criteria: c, result: resultsByCriteria.get(c.id) });
                }

                // Also detect orphan results
                void criteriaById;

                return Object.entries(grouped).map(([category, items]) => (
                  <div key={category} style={{ marginBottom: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#5D4037', marginBottom: 8, padding: '4px 0', borderBottom: '1px solid #EFEBE9' }}>
                      {category}
                    </div>
                    {items.map(({ criteria: c, result: r }) => {
                      const resultVal = r?.result || '';
                      const bgMap: Record<string, string> = { pass: '#E8F5E9', fail: '#FFEBEE', partial: '#FFF3E0', na: '#F5F5F5' };
                      return (
                        <div key={c.id} style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '8px 12px', marginBottom: 4, borderRadius: 8,
                          background: bgMap[resultVal] || 'white',
                          border: '1px solid #EFEBE9',
                        }}>
                          <span style={{ width: 24, textAlign: 'center' }}>
                            {resultIcon(resultVal)}
                          </span>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#8D6E63', fontFamily: 'monospace' }}>{c.criteria_code} </span>
                            <span style={{ fontSize: 13, fontWeight: 500, color: '#3E2723' }}>
                              {lang === 'vi' ? c.title_vi : c.title_en}
                            </span>
                            {c.is_critical && <Star size={12} style={{ color: '#C62828', marginLeft: 6 }} />}
                            {r?.evidence && (
                              <div style={{ fontSize: 11, color: '#8D6E63', marginTop: 2 }}>
                                {lang === 'vi' ? 'Bằng chứng' : 'Evidence'}: {r.evidence}
                              </div>
                            )}
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#8D6E63', textTransform: 'uppercase' }}>
                            {resultVal || '—'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ));
              })()
            )}

            {/* Actions */}
            <div style={{ marginTop: 20, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              {viewItem.farmer_id && (
                <button className="btn btn-secondary" onClick={() => { setViewItem(null); navigate(`/farmers/${viewItem.farmer_id}`); }}>
                  {lang === 'vi' ? 'Xem nông dân' : 'View Farmer'}
                </button>
              )}
              {viewItem.farm_id && (
                <button className="btn btn-secondary" onClick={() => { setViewItem(null); navigate(`/farms/${viewItem.farm_id}`); }}>
                  {lang === 'vi' ? 'Xem nông trại' : 'View Farm'}
                </button>
              )}
              <button className="btn btn-primary" onClick={() => { setViewItem(null); handleEdit(viewItem); }}>
                <Pencil size={14} /> {lang === 'vi' ? 'Sửa đánh giá' : 'Edit Assessment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          DELETE CONFIRMATION
         ═══════════════════════════════════════════════════════════ */}
      {deleteId && (
        <div className="modal-overlay">
          <div style={{ background: 'white', borderRadius: 16, padding: 28, width: 400, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
              {lang === 'vi' ? 'Xác nhận xóa?' : 'Confirm Delete?'}
            </h3>
            <p style={{ color: '#8D6E63', fontSize: 14, marginBottom: 20 }}>
              {lang === 'vi'
                ? 'Đánh giá và tất cả kết quả checklist sẽ bị xóa. Hành động không thể hoàn tác.'
                : 'The assessment and all checklist results will be deleted. This action cannot be undone.'}
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
