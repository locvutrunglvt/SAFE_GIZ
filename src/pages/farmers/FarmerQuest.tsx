// ============================================================
// FarmerQuest — Farmer Questionnaire (FQ) Page
// 41 questions in 5 sections (A–E)
// Author: Lộc Vũ Trung
// ============================================================
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus, Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  X, Eye, Pencil, Trash2, ClipboardList, Calendar, Clock,
  CheckCircle2, AlertCircle, Loader2, Users, FileText,
} from 'lucide-react';
import pb from '../../lib/pocketbase';

// ── Types ────────────────────────────────────────────────────

interface FQEntry {
  id: string;
  farmer_id: string;
  answers: Record<string, unknown>;
  progress: number;
  status: 'draft' | 'complete';
  created: string;
  updated: string;
  expand?: {
    farmer_id?: { id: string; code: string; full_name: string };
  };
}

interface FarmerOption {
  id: string;
  code: string;
  full_name: string;
  [key: string]: unknown;
}

// ── Question definitions ────────────────────────────────────

interface QuestionDef {
  code: string;
  vi: string;
  en: string;
  type: 'text' | 'text_auto' | 'number' | 'select' | 'multi_select' | 'bool';
  required?: boolean;
  options?: { value: string; vi: string; en: string }[];
  min?: number;
  max?: number;
  dependsOn?: string;
  dependsValue?: unknown;
  field?: string;
  collection?: string;
}

interface SectionDef {
  key: string;
  vi: string;
  en: string;
  icon: string;
  questions: QuestionDef[];
}

const SECTIONS: SectionDef[] = [
  {
    key: 'A', vi: 'Thông tin chung', en: 'General Info', icon: '👤',
    questions: [
      { code: 'FQ_A01', vi: 'Mã nông hộ', en: 'Farmer ID', type: 'text_auto', required: true, field: 'code', collection: 'farmers' },
      { code: 'FQ_A02', vi: 'Họ và tên chủ hộ', en: 'Full name', type: 'text', required: true, field: 'full_name', collection: 'farmers' },
      { code: 'FQ_A03', vi: 'Giới tính', en: 'Gender', type: 'select', required: true, field: 'gender', collection: 'farmers',
        options: [{ value: 'male', vi: 'Nam', en: 'Male' }, { value: 'female', vi: 'Nữ', en: 'Female' }] },
      { code: 'FQ_A04', vi: 'Năm sinh', en: 'Birth year', type: 'number', required: true, min: 1940, max: 2010, field: 'birth_year', collection: 'farmers' },
      { code: 'FQ_A05', vi: 'Số CMND/CCCD', en: 'National ID', type: 'text', required: true, field: 'national_id', collection: 'farmers' },
      { code: 'FQ_A06', vi: 'Dân tộc', en: 'Ethnicity', type: 'text', field: 'ethnicity', collection: 'farmers' },
      { code: 'FQ_A07', vi: 'Tình trạng hôn nhân', en: 'Marital status', type: 'select', field: 'marital_status', collection: 'farmers',
        options: [
          { value: 'single', vi: 'Độc thân', en: 'Single' },
          { value: 'married', vi: 'Đã kết hôn', en: 'Married' },
          { value: 'divorced', vi: 'Ly hôn', en: 'Divorced' },
          { value: 'widowed', vi: 'Góa', en: 'Widowed' },
        ] },
      { code: 'FQ_A08', vi: 'Trình độ học vấn', en: 'Education', type: 'select', field: 'education_level', collection: 'farmers',
        options: [
          { value: 'none', vi: 'Không', en: 'None' },
          { value: 'primary', vi: 'Tiểu học', en: 'Primary' },
          { value: 'secondary', vi: 'THCS', en: 'Secondary' },
          { value: 'high', vi: 'THPT', en: 'High school' },
          { value: 'univ', vi: 'ĐH/CĐ', en: 'University' },
        ] },
      { code: 'FQ_A09', vi: 'Số điện thoại', en: 'Phone', type: 'text', field: 'phone', collection: 'farmers' },
      { code: 'FQ_A10', vi: 'Tỉnh', en: 'Province', type: 'select', field: '_province' },
      { code: 'FQ_A11', vi: 'Xã', en: 'Commune', type: 'select', field: '_commune' },
      { code: 'FQ_A12', vi: 'Thôn/Bản', en: 'Village', type: 'select', required: true, field: 'village_id', collection: 'farmers' },
      { code: 'FQ_A13', vi: 'Địa chỉ chi tiết', en: 'Address detail', type: 'text', field: 'address_detail', collection: 'farmers' },
    ],
  },
  {
    key: 'B', vi: 'Hộ gia đình', en: 'Household', icon: '🏠',
    questions: [
      { code: 'FQ_B01', vi: 'Số nhân khẩu', en: 'Household size', type: 'number', required: true, min: 1, max: 30, field: 'household_members', collection: 'farmers' },
      { code: 'FQ_B02', vi: 'Số lao động', en: 'Household labor', type: 'number', min: 0, max: 30, field: 'farming_members', collection: 'farmers' },
      { code: 'FQ_B03', vi: 'Số người phụ thuộc', en: 'Dependents', type: 'number', min: 0, field: 'dependents_count', collection: 'farmers' },
      { code: 'FQ_B04', vi: 'Nguồn nước sinh hoạt', en: 'Water source', type: 'select', field: 'water_source', collection: 'farmers',
        options: [
          { value: 'tap', vi: 'Nước máy', en: 'Tap water' },
          { value: 'well', vi: 'Giếng', en: 'Well' },
          { value: 'spring', vi: 'Suối', en: 'Spring' },
          { value: 'rain', vi: 'Nước mưa', en: 'Rain' },
          { value: 'river', vi: 'Sông', en: 'River' },
        ] },
      { code: 'FQ_B05', vi: 'Nguồn điện', en: 'Electricity', type: 'select', field: 'electricity_source', collection: 'farmers',
        options: [
          { value: 'grid', vi: 'Lưới điện', en: 'Grid' },
          { value: 'generator', vi: 'Máy phát', en: 'Generator' },
          { value: 'solar', vi: 'Năng lượng mặt trời', en: 'Solar' },
          { value: 'none', vi: 'Không có', en: 'None' },
        ] },
      { code: 'FQ_B06', vi: 'Bảo hiểm', en: 'Insurance', type: 'multi_select', field: 'insurance', collection: 'farmers',
        options: [
          { value: 'health', vi: 'Y tế', en: 'Health' },
          { value: 'life', vi: 'Nhân thọ', en: 'Life' },
          { value: 'crop', vi: 'Cây trồng', en: 'Crop' },
          { value: 'other', vi: 'Khác', en: 'Other' },
        ] },
      { code: 'FQ_B07', vi: 'Mức thu nhập', en: 'Income level', type: 'select', field: 'income_level', collection: 'farmers',
        options: [
          { value: 'poor', vi: 'Hộ nghèo', en: 'Poor' },
          { value: 'near_poor', vi: 'Cận nghèo', en: 'Near poor' },
          { value: 'medium', vi: 'Trung bình', en: 'Medium' },
          { value: 'above', vi: 'Khá/Giàu', en: 'Above average' },
        ] },
    ],
  },
  {
    key: 'C', vi: 'Lao động', en: 'Labor', icon: '👷',
    questions: [
      { code: 'FQ_C01', vi: 'Số LĐ gia đình', en: 'Family labor count', type: 'number', min: 0, field: 'family_labor_count', collection: 'farmer_labor' },
      { code: 'FQ_C02', vi: 'Số ngày công LĐ gia đình/năm', en: 'Family labor days/year', type: 'number', min: 0, max: 365, field: 'family_labor_days', collection: 'farmer_labor' },
      { code: 'FQ_C03', vi: 'Có thuê LĐ ngoài?', en: 'Hired labor?', type: 'bool', field: 'hired_labor_count', collection: 'farmer_labor' },
      { code: 'FQ_C04', vi: 'Số LĐ thuê', en: 'Hired count', type: 'number', min: 0, dependsOn: 'FQ_C03', dependsValue: true, field: 'hired_labor_count', collection: 'farmer_labor' },
      { code: 'FQ_C05', vi: 'Loại LĐ thuê', en: 'Hired type', type: 'select', dependsOn: 'FQ_C03', dependsValue: true, field: 'hired_labor_type', collection: 'farmer_labor',
        options: [
          { value: 'permanent', vi: 'Thường xuyên', en: 'Permanent' },
          { value: 'seasonal', vi: 'Thời vụ', en: 'Seasonal' },
        ] },
      { code: 'FQ_C06', vi: 'Số ngày công LĐ thuê/năm', en: 'Hired days/year', type: 'number', min: 0, max: 365, dependsOn: 'FQ_C03', dependsValue: true, field: 'hired_labor_days', collection: 'farmer_labor' },
    ],
  },
  {
    key: 'D', vi: 'Thu nhập', en: 'Income', icon: '💰',
    questions: [
      { code: 'FQ_D01', vi: 'Tổng đầu tư cà phê (VNĐ)', en: 'Coffee investment (VND)', type: 'number', min: 0, field: 'total_investment', collection: 'farmer_income' },
      { code: 'FQ_D02', vi: 'Thu nhập từ cà phê (VNĐ)', en: 'Coffee income (VND)', type: 'number', min: 0, field: 'income_coffee', collection: 'farmer_income' },
      { code: 'FQ_D03', vi: 'Thu nhập từ hồ tiêu', en: 'Pepper income', type: 'number', min: 0, field: 'income_pepper', collection: 'farmer_income' },
      { code: 'FQ_D04', vi: 'Thu nhập từ sầu riêng', en: 'Durian income', type: 'number', min: 0, field: 'income_durian', collection: 'farmer_income' },
      { code: 'FQ_D05', vi: 'Thu nhập từ bơ', en: 'Avocado income', type: 'number', min: 0, field: 'income_avocado', collection: 'farmer_income' },
      { code: 'FQ_D06', vi: 'Thu nhập cây trồng khác', en: 'Other crops income', type: 'number', min: 0, field: 'income_other_crops', collection: 'farmer_income' },
      { code: 'FQ_D07', vi: 'Nguồn thu nhập khác', en: 'Other income source', type: 'text', field: 'income_other_source', collection: 'farmer_income' },
      { code: 'FQ_D08', vi: 'Tổng thu nhập hộ/năm', en: 'Total income/year', type: 'number', min: 0, field: 'income_total', collection: 'farmer_income' },
    ],
  },
  {
    key: 'E', vi: 'Xã hội', en: 'Social', icon: '🤝',
    questions: [
      { code: 'FQ_E01', vi: 'Chứng nhận đang có', en: 'Certifications', type: 'multi_select', field: 'certificate_type', collection: 'farmers',
        options: [
          { value: 'ra', vi: 'Rainforest Alliance', en: 'Rainforest Alliance' },
          { value: '4c', vi: '4C', en: '4C' },
          { value: 'flo', vi: 'Fairtrade (FLO)', en: 'Fairtrade (FLO)' },
          { value: 'cafe_practices', vi: 'C.A.F.E. Practices', en: 'C.A.F.E. Practices' },
        ] },
      { code: 'FQ_E02', vi: 'Thành viên HTX?', en: 'Cooperative member?', type: 'bool', field: 'cooperative_member', collection: 'farmers' },
      { code: 'FQ_E03', vi: 'Tên HTX', en: 'Cooperative name', type: 'text', dependsOn: 'FQ_E02', dependsValue: true, field: 'cooperative_name', collection: 'farmers' },
      { code: 'FQ_E04', vi: 'Số lần tập huấn/năm', en: 'Training count/year', type: 'number', min: 0, field: 'training_count' },
      { code: 'FQ_E05', vi: 'Nội dung tập huấn', en: 'Training topics', type: 'text', field: 'training_topics' },
      { code: 'FQ_E06', vi: 'Có sổ đỏ?', en: 'Land certificate?', type: 'bool', required: true, field: 'land_use_certificate', collection: 'farmers' },
      { code: 'FQ_E07', vi: 'Nguyện vọng hỗ trợ', en: 'Support needs', type: 'text', field: 'support_needs' },
    ],
  },
];

const TOTAL_QUESTIONS = 41;

// ── Helpers ─────────────────────────────────────────────────

function countAnswered(answers: Record<string, unknown>): number {
  let count = 0;
  for (const s of SECTIONS) {
    for (const q of s.questions) {
      const v = answers[q.code];
      if (v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0)) {
        count++;
      }
    }
  }
  return count;
}

function formatVND(n: unknown): string {
  if (typeof n !== 'number' || isNaN(n)) return '-';
  return n.toLocaleString('vi-VN') + ' ₫';
}

function formatDate(d: string, lang: string): string {
  if (!d) return '-';
  try {
    return new Date(d).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', {
      year: 'numeric', month: '2-digit', day: '2-digit',
    });
  } catch { return d; }
}

// ── Component ───────────────────────────────────────────────

export default function FarmerQuest() {
  const { i18n } = useTranslation();
  const lang = i18n.language === 'vi' ? 'vi' : 'en';

  // ── State ──
  const [entries, setEntries] = useState<FQEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [wizardStep, setWizardStep] = useState(1); // 1: select farmer, 2: questionnaire
  const [editEntry, setEditEntry] = useState<FQEntry | null>(null);
  const [saving, setSaving] = useState(false);

  // Farmer selection
  const [farmerSearch, setFarmerSearch] = useState('');
  const [farmerOptions, setFarmerOptions] = useState<FarmerOption[]>([]);
  const [selectedFarmer, setSelectedFarmer] = useState<FarmerOption | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});

  // Accordion
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ A: true });

  // View detail
  const [viewEntry, setViewEntry] = useState<FQEntry | null>(null);

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Geography cascading
  const [provinces, setProvinces] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [communes, setCommunes] = useState<Array<{ id: string; name: string; province_code: string }>>([]);
  const [villages, setVillages] = useState<Array<{ id: string; name: string; commune_id: string }>>([]);

  // Stats
  const [statsTotal, setStatsTotal] = useState(0);
  const [statsMonth, setStatsMonth] = useState(0);
  const [statsPending, setStatsPending] = useState(0);

  // ── Fetch entries ──
  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      // Try farmer_questionnaires first, fallback to farmers with fq data
      const filters: string[] = [];
      if (search) {
        filters.push(`(farmer_id.full_name~"${search}" || farmer_id.code~"${search}")`);
      }
      const result = await pb.collection('farmer_questionnaires').getList(page, 20, {
        sort: '-created',
        expand: 'farmer_id',
        filter: filters.join(' && ') || undefined,
      });
      setEntries(result.items as unknown as FQEntry[]);
      setTotalPages(result.totalPages);
      setTotalItems(result.totalItems);

      // Stats
      const all = await pb.collection('farmer_questionnaires').getList(1, 1, {});
      setStatsTotal(all.totalItems);

      const now = new Date();
      const startMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const monthly = await pb.collection('farmer_questionnaires').getList(1, 1, {
        filter: `created>="${startMonth}"`,
      });
      setStatsMonth(monthly.totalItems);

      const pending = await pb.collection('farmer_questionnaires').getList(1, 1, {
        filter: `status="draft"`,
      });
      setStatsPending(pending.totalItems);
    } catch {
      // Collection doesn't exist — show empty
      setEntries([]);
      setTotalPages(1);
      setTotalItems(0);
    }
    setLoading(false);
  }, [page, search]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  // ── Fetch geography ──
  useEffect(() => {
    (async () => {
      try {
        const [p, c, v] = await Promise.all([
          pb.collection('provinces').getFullList({ sort: 'name' }),
          pb.collection('communes').getFullList({ sort: 'name' }),
          pb.collection('villages').getFullList({ sort: 'name' }),
        ]);
        setProvinces(p as unknown as Array<{ id: string; name: string; code: string }>);
        setCommunes(c as unknown as Array<{ id: string; name: string; province_code: string }>);
        setVillages(v as unknown as Array<{ id: string; name: string; commune_id: string }>);
      } catch { /* ignore */ }
    })();
  }, []);

  // ── Search farmers ──
  useEffect(() => {
    if (!showModal || wizardStep !== 1) return;
    const timer = setTimeout(async () => {
      try {
        const filter = farmerSearch
          ? `(full_name~"${farmerSearch}" || code~"${farmerSearch}")`
          : '';
        const result = await pb.collection('farmers').getList(1, 20, {
          sort: 'code', filter: filter || undefined,
        });
        setFarmerOptions(result.items as unknown as FarmerOption[]);
      } catch { setFarmerOptions([]); }
    }, 300);
    return () => clearTimeout(timer);
  }, [farmerSearch, showModal, wizardStep]);

  // ── Populate answers from farmer ──
  const populateFromFarmer = useCallback(async (farmer: FarmerOption) => {
    setSelectedFarmer(farmer);
    const a: Record<string, unknown> = {};

    // Map farmer fields to answer codes
    for (const section of SECTIONS) {
      for (const q of section.questions) {
        if (q.collection === 'farmers' && q.field && q.field in farmer) {
          a[q.code] = farmer[q.field];
        }
      }
    }
    // Auto-fill code
    a['FQ_A01'] = farmer.code;
    a['FQ_A02'] = farmer.full_name;

    // Try loading farmer_labor
    try {
      const labor = await pb.collection('farmer_labor').getFirstListItem(`farmer_id="${farmer.id}"`);
      if (labor) {
        const laborFields: Record<string, string> = {
          family_labor_count: 'FQ_C01', family_labor_days: 'FQ_C02',
          hired_labor_count: 'FQ_C04', hired_labor_type: 'FQ_C05', hired_labor_days: 'FQ_C06',
        };
        for (const [field, code] of Object.entries(laborFields)) {
          if ((labor as Record<string, unknown>)[field] !== undefined) {
            a[code] = (labor as Record<string, unknown>)[field];
          }
        }
        if ((labor as Record<string, unknown>)['hired_labor_count'] && Number((labor as Record<string, unknown>)['hired_labor_count']) > 0) {
          a['FQ_C03'] = true;
        }
      }
    } catch { /* collection may not exist */ }

    // Try loading farmer_income
    try {
      const income = await pb.collection('farmer_income').getFirstListItem(`farmer_id="${farmer.id}"`);
      if (income) {
        const incomeFields: Record<string, string> = {
          total_investment: 'FQ_D01', income_coffee: 'FQ_D02', income_pepper: 'FQ_D03',
          income_durian: 'FQ_D04', income_avocado: 'FQ_D05', income_other_crops: 'FQ_D06',
          income_other_source: 'FQ_D07', income_total: 'FQ_D08',
        };
        for (const [field, code] of Object.entries(incomeFields)) {
          if ((income as Record<string, unknown>)[field] !== undefined) {
            a[code] = (income as Record<string, unknown>)[field];
          }
        }
      }
    } catch { /* collection may not exist */ }

    setAnswers(a);
  }, []);

  // ── Handle Add ──
  const handleAdd = () => {
    setEditEntry(null);
    setSelectedFarmer(null);
    setAnswers({});
    setFarmerSearch('');
    setWizardStep(1);
    setExpandedSections({ A: true });
    setShowModal(true);
  };

  // ── Handle Edit ──
  const handleEdit = async (entry: FQEntry) => {
    setEditEntry(entry);
    setAnswers(entry.answers || {});
    // Try to load farmer
    try {
      const farmer = await pb.collection('farmers').getOne(entry.farmer_id);
      setSelectedFarmer(farmer as unknown as FarmerOption);
    } catch { setSelectedFarmer(null); }
    setWizardStep(2);
    setExpandedSections({ A: true });
    setShowModal(true);
  };

  // ── Handle Save ──
  const handleSave = async () => {
    if (!selectedFarmer) return;
    setSaving(true);
    try {
      // 1. Update farmers collection (sections A, B, E)
      const farmerData: Record<string, unknown> = {};
      for (const section of SECTIONS) {
        if (!['A', 'B', 'E'].includes(section.key)) continue;
        for (const q of section.questions) {
          if (q.collection === 'farmers' && q.field && !q.field.startsWith('_')) {
            const val = answers[q.code];
            if (val !== undefined) {
              // multi_select → JSON
              if (q.type === 'multi_select') {
                farmerData[q.field] = JSON.stringify(val);
              } else {
                farmerData[q.field] = val;
              }
            }
          }
        }
      }
      await pb.collection('farmers').update(selectedFarmer.id, farmerData);

      // 2. farmer_labor (section C)
      const laborData: Record<string, unknown> = { farmer_id: selectedFarmer.id };
      let hasLaborData = false;
      for (const q of SECTIONS[2].questions) {
        if (q.field && q.code !== 'FQ_C03') {
          const val = answers[q.code];
          if (val !== undefined) {
            laborData[q.field] = val;
            hasLaborData = true;
          }
        }
      }

      if (hasLaborData) {
        try {
          const existing = await pb.collection('farmer_labor').getFirstListItem(`farmer_id="${selectedFarmer.id}"`);
          await pb.collection('farmer_labor').update(existing.id, laborData);
        } catch {
          try {
            await pb.collection('farmer_labor').create(laborData);
          } catch {
            // Fallback: store in farmers.extra_data
            const extraData = { ...(selectedFarmer.extra_data as Record<string, unknown> || {}), labor: laborData };
            await pb.collection('farmers').update(selectedFarmer.id, { extra_data: JSON.stringify(extraData) });
          }
        }
      }

      // 3. farmer_income (section D)
      const incomeData: Record<string, unknown> = { farmer_id: selectedFarmer.id };
      let hasIncomeData = false;
      for (const q of SECTIONS[3].questions) {
        if (q.field) {
          const val = answers[q.code];
          if (val !== undefined) {
            incomeData[q.field] = val;
            hasIncomeData = true;
          }
        }
      }

      if (hasIncomeData) {
        try {
          const existing = await pb.collection('farmer_income').getFirstListItem(`farmer_id="${selectedFarmer.id}"`);
          await pb.collection('farmer_income').update(existing.id, incomeData);
        } catch {
          try {
            await pb.collection('farmer_income').create(incomeData);
          } catch {
            // Fallback: store in farmers.extra_data
            const extraData = { ...(selectedFarmer.extra_data as Record<string, unknown> || {}), income: incomeData };
            await pb.collection('farmers').update(selectedFarmer.id, { extra_data: JSON.stringify(extraData) });
          }
        }
      }

      // 4. Save questionnaire entry
      const progress = countAnswered(answers);
      const entryData = {
        farmer_id: selectedFarmer.id,
        answers: JSON.stringify(answers),
        progress,
        status: progress >= TOTAL_QUESTIONS ? 'complete' : 'draft',
      };

      try {
        if (editEntry?.id) {
          await pb.collection('farmer_questionnaires').update(editEntry.id, entryData);
        } else {
          await pb.collection('farmer_questionnaires').create(entryData);
        }
      } catch {
        // If collection doesn't exist, store in extra_data
        const extraData = {
          ...(selectedFarmer.extra_data as Record<string, unknown> || {}),
          questionnaire: { answers, progress, status: entryData.status, date: new Date().toISOString() },
        };
        await pb.collection('farmers').update(selectedFarmer.id, { extra_data: JSON.stringify(extraData) });
      }

      setShowModal(false);
      fetchEntries();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error saving';
      alert(msg);
    }
    setSaving(false);
  };

  // ── Handle Delete ──
  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await pb.collection('farmer_questionnaires').delete(deleteId);
      setDeleteId(null);
      fetchEntries();
    } catch {
      alert(lang === 'vi' ? 'Lỗi khi xóa' : 'Error deleting');
    }
  };

  // ── Set answer ──
  const setAnswer = (code: string, value: unknown) => {
    setAnswers(prev => ({ ...prev, [code]: value }));
  };

  // ── Toggle multi-select ──
  const toggleMultiSelect = (code: string, optionValue: string) => {
    setAnswers(prev => {
      const current = (prev[code] as string[]) || [];
      const next = current.includes(optionValue)
        ? current.filter(v => v !== optionValue)
        : [...current, optionValue];
      return { ...prev, [code]: next };
    });
  };

  // ── Toggle section ──
  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // ── Check dependency ──
  const isVisible = (q: QuestionDef): boolean => {
    if (!q.dependsOn) return true;
    return answers[q.dependsOn] === q.dependsValue;
  };

  // ── Filtered geography ──
  const selectedProvince = answers['FQ_A10'] as string | undefined;
  const selectedCommune = answers['FQ_A11'] as string | undefined;

  const filteredCommunes = useMemo(() => {
    if (!selectedProvince) return communes;
    const prov = provinces.find(p => p.id === selectedProvince);
    if (!prov) return communes;
    return communes.filter(c => c.province_code === prov.code);
  }, [selectedProvince, communes, provinces]);

  const filteredVillages = useMemo(() => {
    if (selectedCommune) return villages.filter(v => v.commune_id === selectedCommune);
    return villages;
  }, [selectedCommune, villages]);

  // ── Progress ──
  const answeredCount = useMemo(() => countAnswered(answers), [answers]);

  // ── Styles ──
  const sectionColors: Record<string, string> = {
    A: '#5D4037', B: '#2E7D32', C: '#1565C0', D: '#E65100', E: '#7B1FA2',
  };

  // ── Render question input ──
  const renderInput = (q: QuestionDef) => {
    const val = answers[q.code];

    if (q.type === 'text_auto') {
      return (
        <input
          type="text"
          value={(val as string) || ''}
          readOnly
          style={{ background: '#F5F0EB', cursor: 'not-allowed' }}
        />
      );
    }

    if (q.type === 'text') {
      return (
        <input
          type="text"
          value={(val as string) || ''}
          onChange={e => setAnswer(q.code, e.target.value)}
          placeholder={lang === 'vi' ? 'Nhập...' : 'Enter...'}
        />
      );
    }

    if (q.type === 'number') {
      return (
        <input
          type="number"
          value={val !== undefined && val !== null ? String(val) : ''}
          onChange={e => setAnswer(q.code, e.target.value ? Number(e.target.value) : null)}
          min={q.min}
          max={q.max}
          placeholder={q.min !== undefined && q.max !== undefined ? `${q.min} – ${q.max}` : lang === 'vi' ? 'Nhập số...' : 'Enter number...'}
          style={q.collection === 'farmer_income' ? { textAlign: 'right' } : undefined}
        />
      );
    }

    if (q.type === 'select') {
      // Special: Province
      if (q.field === '_province') {
        return (
          <select
            value={(val as string) || ''}
            onChange={e => {
              setAnswer(q.code, e.target.value);
              setAnswer('FQ_A11', '');
              setAnswer('FQ_A12', '');
            }}
          >
            <option value="">{lang === 'vi' ? '— Chọn tỉnh —' : '— Select province —'}</option>
            {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        );
      }
      // Special: Commune
      if (q.field === '_commune') {
        return (
          <select
            value={(val as string) || ''}
            onChange={e => {
              setAnswer(q.code, e.target.value);
              setAnswer('FQ_A12', '');
            }}
          >
            <option value="">{lang === 'vi' ? '— Chọn xã —' : '— Select commune —'}</option>
            {filteredCommunes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        );
      }
      // Special: Village
      if (q.field === 'village_id') {
        return (
          <select
            value={(val as string) || ''}
            onChange={e => setAnswer(q.code, e.target.value)}
          >
            <option value="">{lang === 'vi' ? '— Chọn thôn —' : '— Select village —'}</option>
            {filteredVillages.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        );
      }
      // Normal select
      return (
        <select
          value={(val as string) || ''}
          onChange={e => setAnswer(q.code, e.target.value)}
        >
          <option value="">{lang === 'vi' ? '— Chọn —' : '— Select —'}</option>
          {q.options?.map(o => (
            <option key={o.value} value={o.value}>{lang === 'vi' ? o.vi : o.en}</option>
          ))}
        </select>
      );
    }

    if (q.type === 'multi_select') {
      const selected = (val as string[]) || [];
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {q.options?.map(o => (
            <label key={o.value} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
              borderRadius: 8, border: selected.includes(o.value) ? '2px solid #5D4037' : '1.5px solid #D7CCC8',
              background: selected.includes(o.value) ? '#EFEBE9' : 'white',
              cursor: 'pointer', fontSize: 13, fontWeight: selected.includes(o.value) ? 600 : 400,
              transition: 'all 0.15s',
            }}>
              <input
                type="checkbox"
                checked={selected.includes(o.value)}
                onChange={() => toggleMultiSelect(q.code, o.value)}
                style={{ display: 'none' }}
              />
              {selected.includes(o.value) ? <CheckCircle2 size={16} color="#5D4037" /> : <div style={{
                width: 16, height: 16, borderRadius: 4, border: '1.5px solid #D7CCC8',
              }} />}
              {lang === 'vi' ? o.vi : o.en}
            </label>
          ))}
        </div>
      );
    }

    if (q.type === 'bool') {
      const bVal = val === true;
      return (
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            type="button"
            onClick={() => setAnswer(q.code, true)}
            style={{
              padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              border: bVal ? '2px solid #2E7D32' : '1.5px solid #D7CCC8',
              background: bVal ? '#E8F5E9' : 'white',
              color: bVal ? '#2E7D32' : '#8D6E63',
              transition: 'all 0.15s',
            }}
          >
            {lang === 'vi' ? 'Có' : 'Yes'}
          </button>
          <button
            type="button"
            onClick={() => setAnswer(q.code, false)}
            style={{
              padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              border: val === false ? '2px solid #C62828' : '1.5px solid #D7CCC8',
              background: val === false ? '#FFEBEE' : 'white',
              color: val === false ? '#C62828' : '#8D6E63',
              transition: 'all 0.15s',
            }}
          >
            {lang === 'vi' ? 'Không' : 'No'}
          </button>
        </div>
      );
    }

    return null;
  };

  // ── RENDER ─────────────────────────────────────────────────

  return (
    <div className="animate-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ClipboardList size={28} color="#5D4037" />
            {lang === 'vi' ? 'Phiếu Điều Tra Nông Hộ (FQ)' : 'Farmer Questionnaire (FQ)'}
          </h1>
          <p className="page-subtitle">
            {lang === 'vi' ? '41 câu hỏi — 5 phần' : '41 questions — 5 sections'}
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={handleAdd}>
            <Plus size={16} /> {lang === 'vi' ? 'Tạo phiếu mới' : 'New Questionnaire'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16, marginBottom: 24,
      }}>
        {[
          {
            label: lang === 'vi' ? 'Tổng phiếu' : 'Total Filled',
            value: statsTotal,
            icon: <FileText size={20} />,
            color: '#5D4037', bg: '#EFEBE9',
          },
          {
            label: lang === 'vi' ? 'Tháng này' : 'This Month',
            value: statsMonth,
            icon: <Calendar size={20} />,
            color: '#2E7D32', bg: '#E8F5E9',
          },
          {
            label: lang === 'vi' ? 'Chưa hoàn thành' : 'Pending',
            value: statsPending,
            icon: <Clock size={20} />,
            color: '#E65100', bg: '#FFF3E0',
          },
        ].map((s, i) => (
          <div key={i} className="card" style={{
            padding: 20, display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12, background: s.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color,
            }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#3E2723' }}>{s.value}</div>
              <div style={{ fontSize: 12, color: '#8D6E63', fontWeight: 500 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ position: 'relative', maxWidth: 400 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#8D6E63' }} />
          <input
            type="text"
            placeholder={lang === 'vi' ? 'Tìm theo tên, mã nông dân...' : 'Search by farmer name, code...'}
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{
              width: '100%', padding: '10px 12px 10px 36px', border: '1.5px solid #D7CCC8',
              borderRadius: 8, fontSize: 14, background: 'white',
            }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F5F0EB', borderBottom: '2px solid #D7CCC8' }}>
                {[
                  '#',
                  lang === 'vi' ? 'Họ và tên' : 'Farmer Name',
                  lang === 'vi' ? 'Ngày tạo' : 'Date',
                  lang === 'vi' ? 'Tiến độ' : 'Progress',
                  lang === 'vi' ? 'Trạng thái' : 'Status',
                  '',
                ].map((h, i) => (
                  <th key={i} style={{
                    padding: '12px 10px', textAlign: 'left', fontWeight: 600,
                    color: '#5D4037', whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#8D6E63' }}>
                  <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', marginRight: 8, display: 'inline-block' }} />
                  {lang === 'vi' ? 'Đang tải...' : 'Loading...'}
                </td></tr>
              ) : entries.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 60, textAlign: 'center' }}>
                  <ClipboardList size={48} color="#D7CCC8" style={{ marginBottom: 12 }} />
                  <div style={{ color: '#8D6E63', fontSize: 15, fontWeight: 500 }}>
                    {lang === 'vi' ? 'Chưa có phiếu điều tra nào' : 'No questionnaire entries yet'}
                  </div>
                  <div style={{ color: '#A1887F', fontSize: 13, marginTop: 4 }}>
                    {lang === 'vi' ? 'Nhấn "Tạo phiếu mới" để bắt đầu' : 'Click "New Questionnaire" to start'}
                  </div>
                </td></tr>
              ) : entries.map((entry, idx) => {
                const progress = entry.progress || countAnswered(entry.answers || {});
                const pct = Math.round((progress / TOTAL_QUESTIONS) * 100);
                return (
                  <tr key={entry.id} style={{
                    borderBottom: '1px solid #EFEBE9',
                    background: idx % 2 === 0 ? 'white' : '#FAFAF8',
                    transition: 'background 0.15s',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#F5F0EB')}
                    onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? 'white' : '#FAFAF8')}
                  >
                    <td style={{ padding: '10px', color: '#A1887F' }}>{(page - 1) * 20 + idx + 1}</td>
                    <td style={{ padding: '10px', fontWeight: 600, color: '#2C2C2C' }}>
                      {entry.expand?.farmer_id?.full_name || '-'}
                    </td>
                    <td style={{ padding: '10px', color: '#8D6E63' }}>
                      {formatDate(entry.created, lang)}
                    </td>
                    <td style={{ padding: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 80, height: 6, borderRadius: 3, background: '#EFEBE9', overflow: 'hidden',
                        }}>
                          <div style={{
                            width: `${pct}%`, height: '100%', borderRadius: 3,
                            background: pct === 100 ? '#2E7D32' : pct >= 50 ? '#F57F17' : '#C62828',
                            transition: 'width 0.3s',
                          }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#5D4037' }}>
                          {progress}/{TOTAL_QUESTIONS}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span style={{
                        padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                        background: entry.status === 'complete' ? '#E8F5E9' : '#FFF3E0',
                        color: entry.status === 'complete' ? '#2E7D32' : '#E65100',
                      }}>
                        {entry.status === 'complete'
                          ? (lang === 'vi' ? 'Hoàn thành' : 'Complete')
                          : (lang === 'vi' ? 'Bản nháp' : 'Draft')}
                      </span>
                    </td>
                    <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>
                      <button onClick={() => setViewEntry(entry)} style={{
                        background: 'none', border: 'none', cursor: 'pointer', color: '#1565C0', padding: 4,
                      }} title={lang === 'vi' ? 'Xem' : 'View'}><Eye size={15} /></button>
                      <button onClick={() => handleEdit(entry)} style={{
                        background: 'none', border: 'none', cursor: 'pointer', color: '#5D4037', padding: 4,
                      }} title={lang === 'vi' ? 'Sửa' : 'Edit'}><Pencil size={15} /></button>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteId(entry.id); }} style={{
                        background: 'none', border: 'none', cursor: 'pointer', color: '#C62828', padding: 4,
                      }} title={lang === 'vi' ? 'Xóa' : 'Delete'}><Trash2 size={15} /></button>
                    </td>
                  </tr>
                );
              })}
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
              style={{
                padding: '6px 12px', border: '1px solid #D7CCC8', borderRadius: 6,
                background: 'white', cursor: page > 1 ? 'pointer' : 'default', opacity: page > 1 ? 1 : 0.4,
              }}><ChevronLeft size={16} /></button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              style={{
                padding: '6px 12px', border: '1px solid #D7CCC8', borderRadius: 6,
                background: 'white', cursor: page < totalPages ? 'pointer' : 'default', opacity: page < totalPages ? 1 : 0.4,
              }}><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>

      {/* ── Add/Edit Modal ── */}
      {showModal && (
        <div className="modal-overlay" style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowModal(false)}>
          <div className="animate-in" style={{
            background: 'white', borderRadius: 16, width: '90vw', maxWidth: 860,
            maxHeight: '90vh', overflow: 'auto', padding: 0,
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }} onClick={e => e.stopPropagation()}>

            {/* Modal header */}
            <div style={{
              padding: '20px 28px', borderBottom: '1px solid #EFEBE9',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'linear-gradient(135deg, #F5F0EB, #EFEBE9)',
              borderRadius: '16px 16px 0 0', position: 'sticky', top: 0, zIndex: 10,
            }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#3E2723', margin: 0 }}>
                  <ClipboardList size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                  {editEntry
                    ? (lang === 'vi' ? 'Sửa phiếu điều tra' : 'Edit Questionnaire')
                    : (lang === 'vi' ? 'Tạo phiếu điều tra mới' : 'New Questionnaire')}
                </h2>
                <div style={{ fontSize: 12, color: '#8D6E63', marginTop: 4 }}>
                  {wizardStep === 1
                    ? (lang === 'vi' ? 'Bước 1: Chọn nông dân' : 'Step 1: Select farmer')
                    : (lang === 'vi' ? `Bước 2: Trả lời câu hỏi (${answeredCount}/${TOTAL_QUESTIONS})` : `Step 2: Answer questions (${answeredCount}/${TOTAL_QUESTIONS})`)}
                </div>
              </div>
              <button onClick={() => setShowModal(false)} style={{
                background: 'none', border: 'none', cursor: 'pointer', color: '#999',
              }}><X size={20} /></button>
            </div>

            <div style={{ padding: '24px 28px' }}>
              {/* Step 1: Select Farmer */}
              {wizardStep === 1 && (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#5D4037', display: 'block', marginBottom: 8 }}>
                      <Users size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                      {lang === 'vi' ? 'Tìm và chọn nông dân' : 'Search and select a farmer'}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#8D6E63' }} />
                      <input
                        type="text"
                        value={farmerSearch}
                        onChange={e => setFarmerSearch(e.target.value)}
                        placeholder={lang === 'vi' ? 'Nhập tên hoặc mã nông dân...' : 'Enter farmer name or code...'}
                        autoFocus
                        style={{
                          width: '100%', padding: '10px 12px 10px 36px', border: '1.5px solid #D7CCC8',
                          borderRadius: 8, fontSize: 14, background: 'white',
                        }}
                      />
                    </div>
                  </div>

                  {/* Selected farmer */}
                  {selectedFarmer && (
                    <div style={{
                      padding: 16, borderRadius: 10, background: '#E8F5E9', border: '2px solid #2E7D32',
                      marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#2E7D32' }}>
                          <CheckCircle2 size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                          {selectedFarmer.full_name}
                        </div>
                        <div style={{ fontSize: 12, color: '#558B2F', fontFamily: 'monospace', marginTop: 2 }}>
                          {selectedFarmer.code}
                        </div>
                      </div>
                      <button onClick={() => setSelectedFarmer(null)} style={{
                        background: 'none', border: 'none', cursor: 'pointer', color: '#2E7D32',
                      }}><X size={16} /></button>
                    </div>
                  )}

                  {/* Farmer list */}
                  <div style={{
                    maxHeight: 360, overflowY: 'auto', border: '1px solid #EFEBE9',
                    borderRadius: 8,
                  }}>
                    {farmerOptions.length === 0 ? (
                      <div style={{ padding: 40, textAlign: 'center', color: '#A1887F', fontSize: 13 }}>
                        {lang === 'vi' ? 'Nhập tên để tìm kiếm...' : 'Type to search...'}
                      </div>
                    ) : farmerOptions.map(f => (
                      <div
                        key={f.id}
                        onClick={() => populateFromFarmer(f)}
                        style={{
                          padding: '12px 16px', cursor: 'pointer',
                          borderBottom: '1px solid #EFEBE9',
                          background: selectedFarmer?.id === f.id ? '#E8F5E9' : 'white',
                          transition: 'background 0.15s',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}
                        onMouseEnter={e => { if (selectedFarmer?.id !== f.id) e.currentTarget.style.background = '#F5F0EB'; }}
                        onMouseLeave={e => { if (selectedFarmer?.id !== f.id) e.currentTarget.style.background = 'white'; }}
                      >
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#3E2723' }}>{f.full_name}</div>
                          <div style={{ fontSize: 12, color: '#8D6E63', fontFamily: 'monospace' }}>{f.code}</div>
                        </div>
                        {selectedFarmer?.id === f.id && <CheckCircle2 size={18} color="#2E7D32" />}
                      </div>
                    ))}
                  </div>

                  {/* Next button */}
                  <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      className="btn btn-primary"
                      disabled={!selectedFarmer}
                      onClick={() => setWizardStep(2)}
                      style={{ opacity: selectedFarmer ? 1 : 0.5 }}
                    >
                      {lang === 'vi' ? 'Tiếp theo' : 'Next'} <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Questions */}
              {wizardStep === 2 && (
                <div>
                  {/* Farmer info bar */}
                  {selectedFarmer && (
                    <div style={{
                      padding: '10px 16px', borderRadius: 8, background: '#F5F0EB',
                      marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12,
                      fontSize: 13,
                    }}>
                      <Users size={16} color="#5D4037" />
                      <span style={{ fontWeight: 700, color: '#3E2723' }}>{selectedFarmer.full_name}</span>
                      <span style={{ color: '#8D6E63', fontFamily: 'monospace', fontSize: 12 }}>{selectedFarmer.code}</span>
                      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{
                          width: 60, height: 6, borderRadius: 3, background: '#D7CCC8', overflow: 'hidden',
                        }}>
                          <div style={{
                            width: `${Math.round((answeredCount / TOTAL_QUESTIONS) * 100)}%`,
                            height: '100%', borderRadius: 3,
                            background: answeredCount === TOTAL_QUESTIONS ? '#2E7D32' : '#F57F17',
                            transition: 'width 0.3s',
                          }} />
                        </div>
                        <span style={{ fontWeight: 600, color: '#5D4037', fontSize: 12 }}>
                          {answeredCount}/{TOTAL_QUESTIONS}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Sections */}
                  {SECTIONS.map(section => {
                    const expanded = expandedSections[section.key] || false;
                    const sectionAnswered = section.questions.filter(q => {
                      const v = answers[q.code];
                      return v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0);
                    }).length;
                    const sectionTotal = section.questions.length;
                    const sColor = sectionColors[section.key] || '#5D4037';

                    return (
                      <div key={section.key} style={{
                        marginBottom: 12, border: '1.5px solid #EFEBE9',
                        borderRadius: 12, overflow: 'hidden',
                        borderLeftWidth: 4, borderLeftColor: sColor,
                      }}>
                        {/* Section header */}
                        <div
                          onClick={() => toggleSection(section.key)}
                          style={{
                            padding: '14px 20px', cursor: 'pointer',
                            background: expanded ? '#FAFAF8' : 'white',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            transition: 'background 0.15s',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 20 }}>{section.icon}</span>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 14, color: '#3E2723' }}>
                                {section.key}. {lang === 'vi' ? section.vi : section.en}
                              </div>
                              <div style={{ fontSize: 11, color: '#8D6E63' }}>
                                {sectionAnswered}/{sectionTotal} {lang === 'vi' ? 'câu đã trả lời' : 'answered'}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {sectionAnswered === sectionTotal && (
                              <CheckCircle2 size={18} color="#2E7D32" />
                            )}
                            {expanded ? <ChevronUp size={18} color="#8D6E63" /> : <ChevronDown size={18} color="#8D6E63" />}
                          </div>
                        </div>

                        {/* Section body */}
                        {expanded && (
                          <div style={{ padding: '4px 20px 20px' }}>
                            {section.questions.map(q => {
                              if (!isVisible(q)) return null;
                              const hasValue = (() => {
                                const v = answers[q.code];
                                return v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0);
                              })();
                              return (
                                <div key={q.code} className="form-group" style={{
                                  marginBottom: 16, padding: '12px 16px',
                                  borderRadius: 8, background: hasValue ? '#FAFAF8' : 'white',
                                  border: `1px solid ${hasValue ? '#D7CCC8' : '#EFEBE9'}`,
                                  transition: 'all 0.15s',
                                }}>
                                  <label style={{
                                    display: 'flex', alignItems: 'baseline', gap: 8,
                                    marginBottom: 8, fontSize: 13,
                                  }}>
                                    <span style={{
                                      fontFamily: 'monospace', fontSize: 11, fontWeight: 700,
                                      color: sColor, background: `${sColor}15`,
                                      padding: '2px 6px', borderRadius: 4,
                                    }}>{q.code}</span>
                                    <span style={{ fontWeight: 600, color: '#3E2723' }}>
                                      {lang === 'vi' ? q.vi : q.en}
                                      {q.required && <span style={{ color: '#C62828', marginLeft: 2 }}>*</span>}
                                    </span>
                                    <span style={{ fontSize: 11, color: '#A1887F', fontStyle: 'italic' }}>
                                      {lang === 'vi' ? q.en : q.vi}
                                    </span>
                                  </label>
                                  {renderInput(q)}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Actions */}
                  <div style={{
                    marginTop: 20, display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', gap: 12,
                  }}>
                    {!editEntry && (
                      <button
                        className="btn btn-secondary"
                        onClick={() => setWizardStep(1)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        <ChevronLeft size={16} /> {lang === 'vi' ? 'Quay lại' : 'Back'}
                      </button>
                    )}
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
                      <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                        {lang === 'vi' ? 'Hủy' : 'Cancel'}
                      </button>
                      <button className="btn btn-primary" onClick={handleSave} disabled={saving}
                        style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {saving ? (
                          <>
                            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                            {lang === 'vi' ? 'Đang lưu...' : 'Saving...'}
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={16} />
                            {lang === 'vi' ? 'Lưu phiếu' : 'Save Questionnaire'}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── View Detail Modal ── */}
      {viewEntry && (
        <div className="modal-overlay" style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setViewEntry(null)}>
          <div className="animate-in" style={{
            background: 'white', borderRadius: 16, width: '90vw', maxWidth: 800,
            maxHeight: '90vh', overflow: 'auto', padding: 0,
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }} onClick={e => e.stopPropagation()}>

            <div style={{
              padding: '20px 28px', borderBottom: '1px solid #EFEBE9',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'linear-gradient(135deg, #F5F0EB, #EFEBE9)',
              borderRadius: '16px 16px 0 0', position: 'sticky', top: 0, zIndex: 10,
            }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#3E2723', margin: 0 }}>
                  <Eye size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                  {lang === 'vi' ? 'Chi tiết phiếu điều tra' : 'Questionnaire Detail'}
                </h2>
                <div style={{ fontSize: 12, color: '#8D6E63', marginTop: 4 }}>
                  {viewEntry.expand?.farmer_id?.full_name} — {viewEntry.expand?.farmer_id?.code}
                </div>
              </div>
              <button onClick={() => setViewEntry(null)} style={{
                background: 'none', border: 'none', cursor: 'pointer', color: '#999',
              }}><X size={20} /></button>
            </div>

            <div style={{ padding: '24px 28px' }}>
              {/* Progress */}
              <div style={{
                padding: '12px 16px', borderRadius: 8, background: '#F5F0EB', marginBottom: 20,
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#5D4037' }}>
                  {lang === 'vi' ? 'Tiến độ:' : 'Progress:'}
                </span>
                <div style={{
                  flex: 1, height: 8, borderRadius: 4, background: '#D7CCC8', overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${Math.round(((viewEntry.progress || 0) / TOTAL_QUESTIONS) * 100)}%`,
                    height: '100%', borderRadius: 4,
                    background: (viewEntry.progress || 0) === TOTAL_QUESTIONS ? '#2E7D32' : '#F57F17',
                  }} />
                </div>
                <span style={{ fontWeight: 700, fontSize: 13, color: '#3E2723' }}>
                  {viewEntry.progress || 0}/{TOTAL_QUESTIONS}
                </span>
              </div>

              {/* Sections */}
              {SECTIONS.map(section => {
                const sColor = sectionColors[section.key] || '#5D4037';
                const viewAnswers = viewEntry.answers || {};
                return (
                  <div key={section.key} style={{ marginBottom: 20 }}>
                    <h3 style={{
                      fontSize: 15, fontWeight: 700, color: sColor, marginBottom: 12,
                      display: 'flex', alignItems: 'center', gap: 8,
                      borderBottom: `2px solid ${sColor}20`, paddingBottom: 8,
                    }}>
                      <span style={{ fontSize: 18 }}>{section.icon}</span>
                      {section.key}. {lang === 'vi' ? section.vi : section.en}
                    </h3>
                    <div style={{
                      display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                      gap: 8,
                    }}>
                      {section.questions.map(q => {
                        const rawVal = viewAnswers[q.code];
                        let displayVal: string;
                        if (rawVal === undefined || rawVal === null || rawVal === '') {
                          displayVal = '-';
                        } else if (q.type === 'bool') {
                          displayVal = rawVal === true
                            ? (lang === 'vi' ? 'Có' : 'Yes')
                            : (lang === 'vi' ? 'Không' : 'No');
                        } else if (q.type === 'multi_select' && Array.isArray(rawVal)) {
                          displayVal = (rawVal as string[]).map(v => {
                            const opt = q.options?.find(o => o.value === v);
                            return opt ? (lang === 'vi' ? opt.vi : opt.en) : v;
                          }).join(', ');
                        } else if (q.type === 'select' && q.options) {
                          const opt = q.options.find(o => o.value === rawVal);
                          displayVal = opt ? (lang === 'vi' ? opt.vi : opt.en) : String(rawVal);
                        } else if (q.collection === 'farmer_income' && typeof rawVal === 'number') {
                          displayVal = formatVND(rawVal);
                        } else {
                          displayVal = String(rawVal);
                        }

                        return (
                          <div key={q.code} style={{
                            padding: '8px 12px', borderRadius: 6,
                            background: displayVal !== '-' ? '#FAFAF8' : 'white',
                            border: '1px solid #EFEBE9',
                          }}>
                            <div style={{ fontSize: 11, color: '#A1887F', marginBottom: 2 }}>
                              <span style={{
                                fontFamily: 'monospace', fontWeight: 700, color: sColor, marginRight: 6,
                              }}>{q.code}</span>
                              {lang === 'vi' ? q.vi : q.en}
                            </div>
                            <div style={{
                              fontSize: 13, fontWeight: displayVal !== '-' ? 600 : 400,
                              color: displayVal !== '-' ? '#3E2723' : '#D7CCC8',
                            }}>
                              {displayVal}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ── */}
      {deleteId && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div className="animate-in" style={{
            background: 'white', borderRadius: 16, padding: 28, width: 400, textAlign: 'center',
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>
              <AlertCircle size={48} color="#C62828" />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: '#3E2723' }}>
              {lang === 'vi' ? 'Xác nhận xóa phiếu?' : 'Delete questionnaire?'}
            </h3>
            <p style={{ color: '#8D6E63', fontSize: 14, marginBottom: 20 }}>
              {lang === 'vi' ? 'Hành động này không thể hoàn tác.' : 'This action cannot be undone.'}
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>
                {lang === 'vi' ? 'Hủy' : 'Cancel'}
              </button>
              <button className="btn" onClick={handleDelete} style={{
                background: '#C62828', color: 'white', border: 'none', padding: '8px 20px',
                borderRadius: 8, fontWeight: 600, cursor: 'pointer',
              }}>
                {lang === 'vi' ? 'Xóa' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
