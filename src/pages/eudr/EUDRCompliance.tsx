import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Pencil, Trash2, Search, ChevronLeft, ChevronRight, X,
  CheckCircle2, ClipboardList, Filter,
  ArrowRight, ArrowLeft, Star, Eye, Save, ChevronDown, ChevronUp,
} from 'lucide-react';
import pb from '../../lib/pocketbase';

// ─── Interfaces ────────────────────────────────────────────────

interface ComplianceAssessment {
  id: string;
  farm_id: string;
  farmer_id: string;
  assessment_code: string;
  assessment_date: string;
  findings: Record<string, string>;
  notes: string;
  status: string;
  expand?: {
    farmer_id?: { id: string; full_name: string; code: string };
    farm_id?: { id: string; code: string; plot_name: string };
  };
}

interface FarmerOption { id: string; code: string; full_name: string }
interface FarmOption { id: string; code: string; farmer_id: string; plot_name: string }

type QuestionType = 'text' | 'bool' | 'number';

interface Question {
  key: string;
  vi: string;
  en: string;
  type: QuestionType;
  required?: boolean;
  critical?: boolean;
  unit?: string;
}

interface Category {
  id: string;
  label_vi: string;
  label_en: string;
  questions: Question[];
}

// ─── 35 Questions Definition ───────────────────────────────────

const CATEGORIES: Category[] = [
  {
    id: 'ownership',
    label_vi: 'I.a Sở hữu',
    label_en: 'I.a Ownership',
    questions: [
      { key: 'Q1', vi: 'Ai sở hữu đất nông trại trong từng giai đoạn?', en: 'Who owned the farm areas during each period?', type: 'text', required: true },
      { key: 'Q2', vi: 'Có thay đổi quyền sở hữu giữa các giai đoạn?', en: 'Changes in ownership between periods?', type: 'text' },
      { key: 'Q3', vi: 'Tranh chấp pháp lý liên quan sở hữu?', en: 'Disputes or legal issues related to ownership?', type: 'text' },
      { key: 'Q4', vi: 'Giấy tờ chứng minh quyền sở hữu?', en: 'Documents/proof of ownership provided?', type: 'text' },
    ],
  },
  {
    id: 'management',
    label_vi: 'I.b Quản lý',
    label_en: 'I.b Management',
    questions: [
      { key: 'Q5', vi: 'Ai quản lý trước/sau 31/12/2020?', en: 'Who managed the farm before/after Dec 2020?', type: 'text', required: true },
      { key: 'Q6', vi: 'Thay đổi cơ cấu quản lý?', en: 'Changes in management structure?', type: 'text' },
      { key: 'Q7', vi: 'Có quy hoạch sử dụng đất cụ thể?', en: 'Farm managed under specific zoning plan?', type: 'bool' },
      { key: 'Q8', vi: 'Hợp đồng bảo vệ/quản lý?', en: 'Contracts for farm protection/management?', type: 'text' },
    ],
  },
  {
    id: 'certification',
    label_vi: 'I.c Chứng nhận',
    label_en: 'I.c Certification',
    questions: [
      { key: 'Q9', vi: 'Tham gia chứng nhận bền vững?', en: 'Participated in sustainable certification?', type: 'text' },
      { key: 'Q10', vi: 'Cam kết bảo vệ môi trường?', en: 'Commitments regarding environmental protection?', type: 'text' },
      { key: 'Q11', vi: 'Tham gia chương trình phục hồi/bảo vệ?', en: 'Participate in restoration/protection programs?', type: 'bool' },
      { key: 'Q12', vi: 'Có vùng đệm/đai xanh tự nhiên?', en: 'Greenbelt or natural buffer zone?', type: 'text' },
    ],
  },
  {
    id: 'area',
    label_vi: 'II Diện tích',
    label_en: 'II Area',
    questions: [
      { key: 'Q13', vi: 'Diện tích nông trại giai đoạn này? (ha)', en: 'Area of farm areas during this period? (ha)', type: 'number', unit: 'ha' },
      { key: 'Q14', vi: 'Bản đồ rõ ràng với tọa độ GPS?', en: 'Clear map with GPS coordinates?', type: 'bool' },
      { key: 'Q15', vi: 'Lịch sử trồng cacao/dầu cọ?', en: 'History of cacao/oil palm planting?', type: 'text' },
      { key: 'Q16', vi: 'Diện tích thay đổi sau mốc?', en: 'Area change after milestone?', type: 'text' },
      { key: 'Q17', vi: 'Bản đồ/GPS được duy trì cập nhật?', en: 'Map/GPS maintained and updated?', type: 'bool' },
      { key: 'Q18', vi: 'Thay đổi vùng trước có cacao/cọ?', en: 'Changes in areas previously with cacao/palm?', type: 'text' },
      { key: 'Q19', vi: 'Mở rộng sau 31/12/2020?', en: 'Expansion after Dec 2020?', type: 'bool', critical: true },
    ],
  },
  {
    id: 'silvicultural',
    label_vi: 'III Lâm sinh',
    label_en: 'III Silvicultural',
    questions: [
      { key: 'Q20', vi: 'Hoạt động đốt/chặt cây?', en: 'Burning or tree cutting activities?', type: 'bool', critical: true },
      { key: 'Q21', vi: 'Biện pháp lâm sinh (tỉa cành)?', en: 'Silvicultural measures (pruning)?', type: 'text' },
      { key: 'Q22', vi: 'Thay đổi sử dụng đất?', en: 'Land-use changes?', type: 'text' },
      { key: 'Q23', vi: 'Đốt/chặt sau mốc?', en: 'Burning/cutting after milestone?', type: 'bool', critical: true },
      { key: 'Q24', vi: 'Tiếp tục biện pháp lâm sinh?', en: 'Silvicultural measures continued?', type: 'text' },
      { key: 'Q25', vi: 'Bổ sung bảo vệ môi trường?', en: 'Additional environmental protection?', type: 'text' },
      { key: 'Q26', vi: 'Bảo vệ đai xanh, chống xói mòn?', en: 'Greenbelt protection, erosion control?', type: 'text' },
      { key: 'Q27', vi: 'Giám sát chất lượng đất/nước?', en: 'Monitoring soil/water quality?', type: 'text' },
      { key: 'Q28', vi: 'Tăng cường đa dạng sinh học?', en: 'Enhancing biodiversity protection?', type: 'text' },
      { key: 'Q29', vi: 'Quản lý vùng đệm tự nhiên?', en: 'Natural buffer zone management?', type: 'text' },
    ],
  },
  {
    id: 'utilization',
    label_vi: 'IV Sử dụng',
    label_en: 'IV Utilization',
    questions: [
      { key: 'Q30', vi: 'Khai thác gỗ/lâm sản ngoài gỗ?', en: 'Timber/non-timber exploitation?', type: 'text' },
      { key: 'Q31', vi: 'Sử dụng nông trại cho mục đích khác?', en: 'Farm used for other purposes?', type: 'text' },
      { key: 'Q32', vi: 'Thu hoạch sản phẩm cacao/cọ?', en: 'Cacao/palm products harvested?', type: 'text' },
      { key: 'Q33', vi: 'Khai thác gỗ/LSNG sau mốc?', en: 'Timber/non-timber after milestone?', type: 'text' },
      { key: 'Q34', vi: 'Sử dụng mục đích mới?', en: 'Farm used for new purposes?', type: 'text' },
    ],
  },
  {
    id: 'comparison',
    label_vi: 'V So sánh',
    label_en: 'V Comparison',
    questions: [
      { key: 'Q35', vi: 'Thay đổi quan trọng nhất giữa 2 giai đoạn?', en: 'Most significant changes between periods?', type: 'text', required: true },
    ],
  },
];

const TOTAL_QUESTIONS = 35;
const ALL_QUESTION_KEYS = CATEGORIES.flatMap(c => c.questions.map(q => q.key));

// ─── Constants ─────────────────────────────────────────────────

const STATUS_OPTIONS = ['draft', 'in_progress', 'completed'] as const;
const PER_PAGE = 20;

// ─── Helpers ───────────────────────────────────────────────────

function statusMeta(s: string, lang: string) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    draft:       { bg: '#EFEBE9', color: '#5D4037', label: lang === 'vi' ? 'Nháp' : 'Draft' },
    in_progress: { bg: '#FFF3E0', color: '#E65100', label: lang === 'vi' ? 'Đang thực hiện' : 'In Progress' },
    completed:   { bg: '#E8F5E9', color: '#2E7D32', label: lang === 'vi' ? 'Hoàn thành' : 'Completed' },
  };
  return map[s] || map.draft;
}

function countAnswered(findings: Record<string, string> | null | undefined): number {
  if (!findings) return 0;
  return ALL_QUESTION_KEYS.filter(k => {
    const v = findings[k];
    return v !== undefined && v !== null && v !== '';
  }).length;
}

// ─── Component ─────────────────────────────────────────────────

export default function EUDRCompliance() {
  const { i18n } = useTranslation();
  const lang = i18n.language === 'vi' ? 'vi' : 'en';
  const navigate = useNavigate();
  const province = localStorage.getItem('selectedProvince') || 'SL';

  // ── List state ───────────────────────────────────────────────
  const [assessments, setAssessments] = useState<ComplianceAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // ── Stats ────────────────────────────────────────────────────
  const [stats, setStats] = useState({ total: 0, completed: 0, draft: 0 });

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
  const [formNotes, setFormNotes] = useState('');
  const [formStatus, setFormStatus] = useState('draft');

  // ── Findings (Step 2) — Q1..Q35 ──────────────────────────────
  const [findings, setFindings] = useState<Record<string, string>>({});

  // ── Accordion state ──────────────────────────────────────────
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});

  // ── Dropdown data ────────────────────────────────────────────
  const [farmersList, setFarmersList] = useState<FarmerOption[]>([]);
  const [farmsList, setFarmsList] = useState<FarmOption[]>([]);

  // ── View detail ──────────────────────────────────────────────
  const [viewItem, setViewItem] = useState<ComplianceAssessment | null>(null);

  // ── Delete ───────────────────────────────────────────────────
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // ─── Filtered farms by selected farmer ───────────────────────
  const filteredFarms = useMemo(() => {
    if (!formFarmerId) return farmsList;
    return farmsList.filter(f => f.farmer_id === formFarmerId);
  }, [formFarmerId, farmsList]);

  // ─── Answered count ──────────────────────────────────────────
  const answeredCount = useMemo(() => countAnswered(findings), [findings]);

  // ─── Fetch assessment list ───────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const filters: string[] = ['assessment_code~"EUDR-C"'];
      if (search) filters.push(`(assessment_code~"${search}" || notes~"${search}")`);
      if (filterStatus) filters.push(`status="${filterStatus}"`);

      const result = await pb.collection('eudr_assessments').getList(page, PER_PAGE, {
        sort: '-assessment_date',
        expand: 'farmer_id,farm_id',
        filter: filters.join(' && '),
      });
      setAssessments(result.items as unknown as ComplianceAssessment[]);
      setTotalPages(result.totalPages);
      setTotalItems(result.totalItems);
    } catch (e) { console.error('fetchData error:', e); }
    setLoading(false);
  }, [page, search, filterStatus]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Fetch stats ─────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const base = 'assessment_code~"EUDR-C"';
        const [all, completed, draft] = await Promise.allSettled([
          pb.collection('eudr_assessments').getList(1, 1, { filter: base }),
          pb.collection('eudr_assessments').getList(1, 1, { filter: `${base} && status="completed"` }),
          pb.collection('eudr_assessments').getList(1, 1, { filter: `${base} && status="draft"` }),
        ]);
        const v = (r: PromiseSettledResult<{ totalItems: number }>) =>
          r.status === 'fulfilled' ? r.value.totalItems : 0;
        setStats({ total: v(all), completed: v(completed), draft: v(draft) });
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

  // ─── Generate next assessment code (EUDR-C{province}{NNNN}) ─
  const generateNextCode = async (): Promise<string> => {
    try {
      const latest = await pb.collection('eudr_assessments').getList(1, 1, {
        sort: '-assessment_code',
        filter: 'assessment_code~"EUDR-C"',
      });
      if (latest.items.length > 0) {
        const match = (latest.items[0].assessment_code as string).match(/(\d+)$/);
        if (match) return `EUDR-C${province}${(parseInt(match[1]) + 1).toString().padStart(4, '0')}`;
      }
    } catch { /* ignore */ }
    return `EUDR-C${province}0001`;
  };

  // ─── Reset wizard form ───────────────────────────────────────
  const resetForm = () => {
    setFormId('');
    setFormCode('');
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormFarmerId('');
    setFormFarmId('');
    setFormNotes('');
    setFormStatus('draft');
    setFindings({});
    setWizardStep(1);
    // Expand all categories by default
    const expanded: Record<string, boolean> = {};
    for (const cat of CATEGORIES) expanded[cat.id] = true;
    setExpandedCats(expanded);
  };

  // ─── Handle ADD ──────────────────────────────────────────────
  const handleAdd = async () => {
    resetForm();
    const code = await generateNextCode();
    setFormCode(code);
    setShowModal(true);
  };

  // ─── Handle EDIT ─────────────────────────────────────────────
  const handleEdit = async (item: ComplianceAssessment) => {
    resetForm();
    setFormId(item.id);
    setFormCode(item.assessment_code);
    setFormDate(item.assessment_date?.slice(0, 10) || '');
    setFormFarmerId(item.farmer_id || '');
    setFormFarmId(item.farm_id || '');
    setFormNotes(item.notes || '');
    setFormStatus(item.status || 'draft');
    setFindings(item.findings || {});
    setShowModal(true);
  };

  // ─── Handle DELETE ───────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteId) return;
    try {
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
    // Validate required fields
    const requiredKeys = CATEGORIES.flatMap(c => c.questions.filter(q => q.required).map(q => q.key));
    for (const k of requiredKeys) {
      if (!findings[k] || findings[k].trim() === '') {
        alert(lang === 'vi' ? `Câu ${k} là bắt buộc` : `Question ${k} is required`);
        return;
      }
    }

    setSaving(true);
    try {
      const data: Record<string, unknown> = {
        assessment_code: formCode,
        assessment_date: formDate || new Date().toISOString().slice(0, 10),
        farmer_id: formFarmerId || '',
        farm_id: formFarmId,
        notes: formNotes,
        status: formStatus,
        findings: findings,
      };

      if (formId) {
        await pb.collection('eudr_assessments').update(formId, data);
      } else {
        await pb.collection('eudr_assessments').create(data);
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
  const handleView = (item: ComplianceAssessment) => {
    setViewItem(item);
  };

  // ─── Update a finding ────────────────────────────────────────
  const setFinding = (key: string, value: string) => {
    setFindings(prev => ({ ...prev, [key]: value }));
  };

  // ─── Toggle accordion ───────────────────────────────────────
  const toggleCat = (catId: string) => {
    setExpandedCats(prev => ({ ...prev, [catId]: !prev[catId] }));
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

  // ─── Progress bar ────────────────────────────────────────────
  const renderProgressBar = (answered: number) => {
    const pct = Math.round((answered / TOTAL_QUESTIONS) * 100);
    const barColor = pct >= 80 ? '#2E7D32' : pct >= 50 ? '#E65100' : '#C62828';
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, height: 8, background: '#EFEBE9', borderRadius: 4, overflow: 'hidden', minWidth: 60 }}>
          <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: barColor, borderRadius: 4, transition: 'width 0.3s' }} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: barColor, minWidth: 50, textAlign: 'right' }}>{answered}/{TOTAL_QUESTIONS}</span>
      </div>
    );
  };

  // ─── Render question input ───────────────────────────────────
  const renderInput = (q: Question) => {
    const value = findings[q.key] || '';
    switch (q.type) {
      case 'bool':
        return (
          <div style={{ display: 'flex', gap: 8 }}>
            {([
              { val: 'yes', label: lang === 'vi' ? 'Có' : 'Yes', bg: '#E8F5E9', color: '#2E7D32', border: '#81C784' },
              { val: 'no', label: lang === 'vi' ? 'Không' : 'No', bg: '#FFEBEE', color: '#C62828', border: '#EF9A9A' },
            ]).map(opt => (
              <button
                key={opt.val}
                type="button"
                onClick={() => setFinding(q.key, value === opt.val ? '' : opt.val)}
                style={{
                  padding: '6px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  border: `2px solid ${value === opt.val ? opt.border : '#D7CCC8'}`,
                  background: value === opt.val ? opt.bg : 'white',
                  color: value === opt.val ? opt.color : '#8D6E63',
                  transition: 'all 0.15s',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        );
      case 'number':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="number"
              step="0.01"
              value={value}
              onChange={e => setFinding(q.key, e.target.value)}
              placeholder="0.00"
              style={{ width: 150, padding: '8px 12px', border: '1.5px solid #D7CCC8', borderRadius: 8, fontSize: 14 }}
            />
            {q.unit && <span style={{ fontSize: 12, color: '#8D6E63', fontWeight: 600 }}>{q.unit}</span>}
          </div>
        );
      default: // text
        return (
          <textarea
            rows={2}
            value={value}
            onChange={e => setFinding(q.key, e.target.value)}
            placeholder={lang === 'vi' ? 'Nhập câu trả lời...' : 'Enter answer...'}
            style={{
              width: '100%', padding: '8px 12px', border: '1.5px solid #D7CCC8', borderRadius: 8,
              fontSize: 13, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5,
            }}
          />
        );
    }
  };

  // ─── RENDER ──────────────────────────────────────────────────
  return (
    <div className="animate-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {lang === 'vi' ? 'EUDR Compliance — 35 Câu hỏi' : 'EUDR Compliance — 35 Questions'}
          </h1>
          <p className="page-subtitle">
            {lang === 'vi'
              ? 'Đánh giá tuân thủ EUDR — 35 câu hỏi về quyền sở hữu, quản lý, diện tích, lâm sinh và sử dụng'
              : 'EUDR Compliance Assessment — 35 questions on ownership, management, area, silvicultural & utilization'}
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={handleAdd}>
            <Plus size={16} /> {lang === 'vi' ? 'Đánh giá mới' : 'New Assessment'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: lang === 'vi' ? 'Tổng đánh giá' : 'Total', value: stats.total, bg: '#EFEBE9', color: '#5D4037' },
          { label: lang === 'vi' ? 'Hoàn thành' : 'Completed', value: stats.completed, bg: '#E8F5E9', color: '#2E7D32' },
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
                  lang === 'vi' ? 'Ngày ĐG' : 'Date',
                  lang === 'vi' ? 'Tiến độ' : 'Progress',
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
                  <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#8D6E63' }}>
                    {lang === 'vi' ? 'Đang tải...' : 'Loading...'}
                  </td>
                </tr>
              ) : assessments.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#8D6E63' }}>
                    <ClipboardList size={32} style={{ opacity: 0.3, marginBottom: 8 }} /><br />
                    {lang === 'vi' ? 'Chưa có đánh giá EUDR Compliance' : 'No EUDR Compliance assessments yet'}
                  </td>
                </tr>
              ) : assessments.map((a, idx) => {
                const answered = countAnswered(a.findings);
                return (
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

                    <td style={{ padding: '10px', fontSize: 11, color: '#8D6E63' }}>{a.assessment_date?.slice(0, 10) || '—'}</td>
                    <td style={{ padding: '10px', minWidth: 130 }}>
                      {renderProgressBar(answered)}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>{renderStatusBadge(a.status)}</td>
                    <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>
                      <button onClick={() => handleView(a)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1565C0', padding: 4 }} title="View"><Eye size={15} /></button>
                      <button onClick={() => handleEdit(a)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5D4037', padding: 4 }} title="Edit"><Pencil size={15} /></button>
                      <button onClick={() => setDeleteId(a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C62828', padding: 4 }} title="Delete"><Trash2 size={15} /></button>
                    </td>
                  </tr>
                );
              })}
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
          WIZARD MODAL — Create / Edit Compliance Assessment
         ═══════════════════════════════════════════════════════════ */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div
            style={{
              background: 'white', borderRadius: 16, width: '94vw', maxWidth: 920,
              height: '92vh', display: 'flex', flexDirection: 'column',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ padding: '20px 28px', borderBottom: '1px solid #EFEBE9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#3E2723', margin: 0 }}>
                  {formId
                    ? (lang === 'vi' ? 'Sửa đánh giá EUDR Compliance' : 'Edit EUDR Compliance')
                    : (lang === 'vi' ? 'Đánh giá EUDR Compliance mới' : 'New EUDR Compliance')}
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
                    2. {lang === 'vi' ? '35 Câu hỏi EUDR' : '35 EUDR Questions'}
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

              {/* ─── STEP 2: 35 EUDR Questions ───────────────────── */}
              {wizardStep === 2 && (
                <div>
                  {/* Progress indicator */}
                  <div style={{
                    marginBottom: 20, padding: '14px 20px', background: '#F5F0EB',
                    borderRadius: 12, display: 'flex', alignItems: 'center', gap: 16,
                  }}>
                    <CheckCircle2 size={20} style={{ color: answeredCount === TOTAL_QUESTIONS ? '#2E7D32' : '#8D6E63' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#5D4037', marginBottom: 4 }}>
                        {lang === 'vi' ? 'Tiến độ trả lời' : 'Completion Progress'}
                      </div>
                      {renderProgressBar(answeredCount)}
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#5D4037' }}>
                      {answeredCount}/{TOTAL_QUESTIONS}
                    </div>
                  </div>

                  {/* Category accordions */}
                  {CATEGORIES.map(cat => {
                    const isExpanded = expandedCats[cat.id] !== false;
                    const catAnswered = cat.questions.filter(q => {
                      const v = findings[q.key];
                      return v !== undefined && v !== null && v !== '';
                    }).length;
                    const hasCritical = cat.questions.some(q => q.critical);

                    return (
                      <div key={cat.id} style={{ marginBottom: 12 }}>
                        {/* Category header — clickable accordion */}
                        <div
                          onClick={() => toggleCat(cat.id)}
                          style={{
                            padding: '12px 16px', background: '#F5F0EB', borderRadius: isExpanded ? '10px 10px 0 0' : 10,
                            display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                            border: '1.5px solid #D7CCC8', borderBottom: isExpanded ? '1px solid #D7CCC8' : '1.5px solid #D7CCC8',
                            transition: 'all 0.15s',
                          }}
                        >
                          {isExpanded ? <ChevronUp size={16} style={{ color: '#5D4037' }} /> : <ChevronDown size={16} style={{ color: '#5D4037' }} />}
                          <ClipboardList size={16} style={{ color: '#5D4037' }} />
                          <span style={{ fontWeight: 700, fontSize: 14, color: '#3E2723', flex: 1 }}>
                            {lang === 'vi' ? cat.label_vi : cat.label_en}
                          </span>
                          {hasCritical && (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 2,
                              background: '#FFEBEE', color: '#C62828', padding: '1px 8px',
                              borderRadius: 10, fontSize: 10, fontWeight: 700,
                            }}>
                              <Star size={10} /> {lang === 'vi' ? 'Có câu quan trọng' : 'Has critical'}
                            </span>
                          )}
                          <span style={{
                            fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 10,
                            background: catAnswered === cat.questions.length ? '#E8F5E9' : '#FFF3E0',
                            color: catAnswered === cat.questions.length ? '#2E7D32' : '#E65100',
                          }}>
                            {catAnswered}/{cat.questions.length}
                          </span>
                        </div>

                        {/* Questions list */}
                        {isExpanded && (
                          <div style={{
                            border: '1.5px solid #D7CCC8', borderTop: 'none',
                            borderRadius: '0 0 10px 10px', padding: '12px 16px',
                            background: 'white',
                          }}>
                            {cat.questions.map((q, qi) => {
                              const hasValue = findings[q.key] !== undefined && findings[q.key] !== null && findings[q.key] !== '';
                              return (
                                <div
                                  key={q.key}
                                  style={{
                                    padding: '14px 0',
                                    borderBottom: qi < cat.questions.length - 1 ? '1px solid #EFEBE9' : 'none',
                                  }}
                                >
                                  {/* Question header */}
                                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                                    <span style={{
                                      fontSize: 11, fontWeight: 700, fontFamily: 'monospace',
                                      color: hasValue ? '#2E7D32' : '#8D6E63',
                                      background: hasValue ? '#E8F5E9' : '#EFEBE9',
                                      padding: '2px 8px', borderRadius: 6, flexShrink: 0,
                                    }}>
                                      {q.key}
                                    </span>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ fontSize: 14, fontWeight: 600, color: '#3E2723', marginBottom: 2 }}>
                                        {q.vi}
                                        {q.required && <span style={{ color: '#C62828', marginLeft: 4 }}>*</span>}
                                        {q.critical && (
                                          <span style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 2,
                                            background: '#FFEBEE', color: '#C62828', padding: '1px 8px',
                                            borderRadius: 10, fontSize: 10, fontWeight: 700, marginLeft: 8,
                                            verticalAlign: 'middle',
                                          }}>
                                            ⭐ {lang === 'vi' ? 'QUAN TRỌNG' : 'CRITICAL'}
                                          </span>
                                        )}
                                      </div>
                                      <div style={{ fontSize: 12, color: '#8D6E63', fontStyle: 'italic' }}>
                                        {q.en}
                                      </div>
                                    </div>
                                  </div>
                                  {/* Input */}
                                  <div style={{ marginLeft: 36 }}>
                                    {renderInput(q)}
                                  </div>
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
                    {lang === 'vi' ? 'Tiếp theo → 35 Câu hỏi' : 'Next → 35 Questions'} <ArrowRight size={16} />
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
              background: 'white', borderRadius: 16, width: '92vw', maxWidth: 850,
              maxHeight: '92vh', overflow: 'auto', padding: 28,
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
                  <span style={{
                    background: '#E3F2FD', color: '#1565C0', padding: '3px 10px',
                    borderRadius: 12, fontSize: 11, fontWeight: 600,
                  }}>
                    {countAnswered(viewItem.findings)}/{TOTAL_QUESTIONS} {lang === 'vi' ? 'câu trả lời' : 'answered'}
                  </span>
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
                {lang === 'vi' ? 'Tiến độ' : 'Progress'}: <strong style={{ color: '#3E2723' }}>{countAnswered(viewItem.findings)}/{TOTAL_QUESTIONS}</strong>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ marginBottom: 20, padding: '12px 16px', background: '#F5F0EB', borderRadius: 12 }}>
              {renderProgressBar(countAnswered(viewItem.findings))}
            </div>

            {/* Q&A grouped by category */}
            {CATEGORIES.map(cat => {
              const catFindings = viewItem.findings || {};
              const hasAnyAnswer = cat.questions.some(q => catFindings[q.key]);
              return (
                <div key={cat.id} style={{ marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#5D4037', marginBottom: 8, padding: '6px 0', borderBottom: '1px solid #EFEBE9', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ClipboardList size={14} style={{ color: '#8D6E63' }} />
                    {lang === 'vi' ? cat.label_vi : cat.label_en}
                    {!hasAnyAnswer && (
                      <span style={{ fontSize: 11, color: '#BCAAA4', fontWeight: 400, fontStyle: 'italic' }}>
                        ({lang === 'vi' ? 'Chưa trả lời' : 'No answers'})
                      </span>
                    )}
                  </div>
                  {cat.questions.map(q => {
                    const answer = catFindings[q.key] || '';
                    const hasBoolAnswer = q.type === 'bool' && answer;
                    return (
                      <div key={q.key} style={{
                        display: 'flex', alignItems: 'flex-start', gap: 12,
                        padding: '8px 12px', marginBottom: 4, borderRadius: 8,
                        background: answer ? (q.critical ? '#FFF8E1' : '#FAFAF8') : 'white',
                        border: `1px solid ${answer ? (q.critical ? '#FFE082' : '#EFEBE9') : '#F5F5F5'}`,
                      }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, fontFamily: 'monospace',
                          color: answer ? '#2E7D32' : '#BCAAA4',
                          background: answer ? '#E8F5E9' : '#F5F5F5',
                          padding: '2px 6px', borderRadius: 4, flexShrink: 0, marginTop: 2,
                        }}>
                          {q.key}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#5D4037', marginBottom: 2 }}>
                            {q.vi}
                            {q.critical && <Star size={12} style={{ color: '#C62828', marginLeft: 6, verticalAlign: 'middle' }} />}
                          </div>
                          <div style={{ fontSize: 11, color: '#8D6E63', fontStyle: 'italic', marginBottom: 4 }}>
                            {q.en}
                          </div>
                          <div style={{ fontSize: 13, color: '#3E2723', fontWeight: 500 }}>
                            {hasBoolAnswer ? (
                              <span style={{
                                padding: '2px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                                background: answer === 'yes' ? '#E8F5E9' : '#FFEBEE',
                                color: answer === 'yes' ? '#2E7D32' : '#C62828',
                              }}>
                                {answer === 'yes' ? (lang === 'vi' ? 'Có' : 'Yes') : (lang === 'vi' ? 'Không' : 'No')}
                              </span>
                            ) : (
                              answer || <span style={{ color: '#BCAAA4', fontStyle: 'italic' }}>—</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* Notes */}
            {viewItem.notes && (
              <div style={{ marginTop: 16, padding: '12px 16px', background: '#EFEBE9', borderRadius: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#5D4037', marginBottom: 4 }}>
                  {lang === 'vi' ? 'Ghi chú' : 'Notes'}
                </div>
                <div style={{ fontSize: 13, color: '#3E2723' }}>{viewItem.notes}</div>
              </div>
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
                ? 'Đánh giá EUDR Compliance sẽ bị xóa. Hành động không thể hoàn tác.'
                : 'The EUDR Compliance assessment will be deleted. This action cannot be undone.'}
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
