/**
 * FarmDetail.tsx — Full Farm Detail Page
 * Displays all 83 farm fields in organized collapsible sections.
 * CRUD modals for EUDR assessments, sales transactions, and budgets.
 * Edit modal for farm info with all fields.
 * Author: Lộc Vũ Trung
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, Sprout, MapPin, CheckSquare, ShoppingCart, DollarSign,
  ChevronRight, ChevronDown, ChevronUp, TreePine, Droplets,
  Mountain, Building2, Leaf, Shield, ClipboardList, Pencil, Plus,
  Trash2, X, Save, AlertTriangle, Info,
} from 'lucide-react';
import pb from '../../lib/pocketbase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Farm {
  id: string;
  [key: string]: any;
  expand?: {
    farmer_id?: { id: string; code: string; full_name: string; group_id?: string; village_id?: string };
  };
}

interface EUDRAssessment {
  id: string;
  [key: string]: any;
}

interface TradeItem {
  id: string;
  [key: string]: any;
}

interface BudgetItem {
  id: string;
  [key: string]: any;
}

type TabKey = 'info' | 'eudr' | 'trade' | 'budget';
type ModalMode = 'add' | 'edit';

// ─── Field Definitions ────────────────────────────────────────────────────────

interface FieldDef {
  key: string;
  vi: string;
  en: string;
  type: 'text' | 'number' | 'bool' | 'date' | 'select' | 'json' | 'relation';
  options?: string[];
  required?: boolean;
  suffix?: string;
}

const SECTION_FIELDS: { icon: React.ReactNode; vi: string; en: string; color: string; fields: FieldDef[] }[] = [
  {
    icon: <Info size={16} />, vi: 'Thông tin chung', en: 'General', color: '#5D4037',
    fields: [
      { key: 'code', vi: 'Mã nông trại', en: 'Farm code', type: 'text', required: true },
      { key: 'farmer_id', vi: 'Nông dân', en: 'Farmer', type: 'relation', required: true },
      { key: 'plot_name', vi: 'Tên lô', en: 'Plot name', type: 'text' },
      { key: 'plot_name_en', vi: 'Tên lô (EN)', en: 'Plot name (EN)', type: 'text' },
      { key: 'farm_label', vi: 'Nhãn', en: 'Label', type: 'text' },
      { key: 'location_name', vi: 'Tên vị trí', en: 'Location name', type: 'text' },
      { key: 'status', vi: 'Trạng thái', en: 'Status', type: 'select', options: ['active', 'inactive', 'draft', 'archived'] },
      { key: 'notes', vi: 'Ghi chú', en: 'Notes', type: 'text' },
    ],
  },
  {
    icon: <MapPin size={16} />, vi: 'Vị trí & Bản đồ', en: 'Location & Map', color: '#1565C0',
    fields: [
      { key: 'latitude', vi: 'Vĩ độ', en: 'Latitude', type: 'number' },
      { key: 'longitude', vi: 'Kinh độ', en: 'Longitude', type: 'number' },
      { key: 'altitude', vi: 'Độ cao (m)', en: 'Altitude (m)', type: 'number', suffix: 'm' },
      { key: 'polygon', vi: 'Đa giác', en: 'Polygon', type: 'json' },
      { key: 'polygon_source', vi: 'Nguồn polygon', en: 'Polygon source', type: 'select', options: ['gps', 'satellite', 'manual', 'imported'] },
      { key: 'location_method', vi: 'Phương pháp', en: 'Method', type: 'text' },
      { key: 'map_sheet', vi: 'Tờ bản đồ', en: 'Map sheet', type: 'text' },
      { key: 'group_code', vi: 'Mã nhóm', en: 'Group code', type: 'text' },
    ],
  },
  {
    icon: <Mountain size={16} />, vi: 'Diện tích', en: 'Area', color: '#2E7D32',
    fields: [
      { key: 'total_area', vi: 'Tổng diện tích (ha)', en: 'Total area (ha)', type: 'number', suffix: 'ha' },
      { key: 'coffee_area', vi: 'Diện tích cà phê (ha)', en: 'Coffee area (ha)', type: 'number', suffix: 'ha' },
      { key: 'certified_area', vi: 'Diện tích chứng nhận (ha)', en: 'Certified area (ha)', type: 'number', suffix: 'ha' },
      { key: 'shade_tree_area', vi: 'DT cây che bóng (ha)', en: 'Shade tree area (ha)', type: 'number', suffix: 'ha' },
      { key: 'other_crop_area', vi: 'DT cây trồng khác (ha)', en: 'Other crop area (ha)', type: 'number', suffix: 'ha' },
      { key: 'fallow_area', vi: 'DT bỏ hoang (ha)', en: 'Fallow area (ha)', type: 'number', suffix: 'ha' },
      { key: 'natural_vegetation_pct', vi: '% thảm thực vật', en: '% natural vegetation', type: 'number', suffix: '%' },
    ],
  },
  {
    icon: <Sprout size={16} />, vi: 'Cà phê & Giống', en: 'Coffee & Variety', color: '#6A1B9A',
    fields: [
      { key: 'coffee_type', vi: 'Loại cà phê', en: 'Coffee type', type: 'select', options: ['robusta', 'arabica', 'liberica', 'mixed'] },
      { key: 'coffee_variety', vi: 'Giống', en: 'Variety', type: 'text' },
      { key: 'coffee_variety_detail', vi: 'Chi tiết giống', en: 'Variety detail', type: 'text' },
      { key: 'planting_year', vi: 'Năm trồng', en: 'Planting year', type: 'number' },
      { key: 'tree_age', vi: 'Tuổi cây (năm)', en: 'Tree age (years)', type: 'number', suffix: 'năm' },
      { key: 'tree_count', vi: 'Số cây', en: 'Tree count', type: 'number' },
      { key: 'density_per_ha', vi: 'Mật độ (cây/ha)', en: 'Density (trees/ha)', type: 'number', suffix: 'cây/ha' },
      { key: 'production_yield', vi: 'Sản lượng (tấn)', en: 'Production yield (ton)', type: 'number', suffix: 'tấn' },
      { key: 'yield_per_ha', vi: 'Năng suất (tấn/ha)', en: 'Yield/ha (ton/ha)', type: 'number', suffix: 'tấn/ha' },
      { key: 'tree_age_distribution', vi: 'Phân bố tuổi cây', en: 'Tree age distribution', type: 'json' },
    ],
  },
  {
    icon: <Mountain size={16} />, vi: 'Đất & Địa hình', en: 'Soil & Terrain', color: '#795548',
    fields: [
      { key: 'soil_type', vi: 'Loại đất', en: 'Soil type', type: 'select', options: ['basalt', 'alluvial', 'clay', 'sandy', 'mixed', 'other'] },
      { key: 'terrain', vi: 'Địa hình', en: 'Terrain', type: 'select', options: ['flat', 'gentle_slope', 'steep_slope', 'valley', 'hillside'] },
      { key: 'land_before_2014', vi: 'Đất trước 2014', en: 'Land before 2014', type: 'select', options: ['forest', 'agriculture', 'bare', 'other'] },
      { key: 'land_ownership', vi: 'Sở hữu', en: 'Land ownership', type: 'select', options: ['owned', 'rented', 'shared', 'community', 'government'] },
      { key: 'land_use_type', vi: 'Kiểu canh tác', en: 'Land use type', type: 'select', options: ['monoculture', 'agroforestry', 'intercrop', 'mixed'] },
    ],
  },
  {
    icon: <Droplets size={16} />, vi: 'Tưới tiêu', en: 'Irrigation', color: '#0277BD',
    fields: [
      { key: 'irrigation_source', vi: 'Nguồn tưới', en: 'Irrigation source', type: 'select', options: ['rain_fed', 'well', 'river', 'reservoir', 'spring', 'drip'] },
      { key: 'has_water_source', vi: 'Có nguồn nước', en: 'Has water source', type: 'bool' },
    ],
  },
  {
    icon: <TreePine size={16} />, vi: 'Che bóng & Xen canh', en: 'Shade & Intercrop', color: '#33691E',
    fields: [
      { key: 'has_shade_trees', vi: 'Có cây che bóng', en: 'Has shade trees', type: 'bool' },
      { key: 'shade_tree_species', vi: 'Loài cây', en: 'Species', type: 'text' },
      { key: 'shade_tree_count', vi: 'Số cây', en: 'Count', type: 'number' },
      { key: 'shade_coverage_pct', vi: '% che phủ', en: '% coverage', type: 'number', suffix: '%' },
      { key: 'num_shade_tree_species', vi: 'Số loài', en: 'Num species', type: 'number' },
      { key: 'num_shade_trees_before', vi: 'Số cây trước', en: 'Trees before', type: 'number' },
      { key: 'shade_tree_species_before', vi: 'Loài trước', en: 'Species before', type: 'text' },
      { key: 'total_trees_supported', vi: 'Tổng cây hỗ trợ', en: 'Total supported', type: 'number' },
      { key: 'seedlings_received_from', vi: 'Nguồn cây giống', en: 'Seedlings from', type: 'text' },
      { key: 'has_ground_cover', vi: 'Có lớp phủ đất', en: 'Has ground cover', type: 'bool' },
      { key: 'intercrop_count', vi: 'Số cây xen canh', en: 'Intercrop count', type: 'number' },
      { key: 'intercrop_types', vi: 'Số loại xen canh', en: 'Intercrop types', type: 'number' },
      { key: 'intercrop_names', vi: 'Tên cây xen canh', en: 'Intercrop names', type: 'text' },
    ],
  },
  {
    icon: <Building2 size={16} />, vi: 'Cơ sở vật chất', en: 'Infrastructure', color: '#424242',
    fields: [
      { key: 'has_processing_area', vi: 'Có khu chế biến', en: 'Has processing area', type: 'bool' },
      { key: 'has_drying_yard', vi: 'Có sân phơi', en: 'Has drying yard', type: 'bool' },
      { key: 'has_storage', vi: 'Có kho', en: 'Has storage', type: 'bool' },
      { key: 'has_road_access', vi: 'Có đường vào', en: 'Has road access', type: 'bool' },
    ],
  },
  {
    icon: <Leaf size={16} />, vi: 'Môi trường', en: 'Environment', color: '#1B5E20',
    fields: [
      { key: 'near_forest', vi: 'Giáp rừng', en: 'Near forest', type: 'bool' },
      { key: 'forest_distance_m', vi: 'Khoảng cách rừng (m)', en: 'Forest distance (m)', type: 'number', suffix: 'm' },
      { key: 'near_water_body', vi: 'Giáp nguồn nước', en: 'Near water body', type: 'bool' },
      { key: 'near_river', vi: 'Giáp sông', en: 'Near river', type: 'bool' },
      { key: 'has_buffer_zone', vi: 'Có vùng đệm', en: 'Has buffer zone', type: 'bool' },
      { key: 'buffer_zone_width', vi: 'Chiều rộng vùng đệm (m)', en: 'Buffer zone width (m)', type: 'number', suffix: 'm' },
      { key: 'fuel_gasoline', vi: 'Xăng (lít)', en: 'Gasoline (L)', type: 'number', suffix: 'L' },
      { key: 'fuel_diesel', vi: 'Dầu diesel (lít)', en: 'Diesel (L)', type: 'number', suffix: 'L' },
      { key: 'fuel_electric', vi: 'Điện (kWh)', en: 'Electricity (kWh)', type: 'number', suffix: 'kWh' },
      { key: 'processing_water', vi: 'Nước chế biến (m³)', en: 'Processing water (m³)', type: 'number', suffix: 'm³' },
      { key: 'processing_waste_water', vi: 'Nước thải (m³)', en: 'Waste water (m³)', type: 'number', suffix: 'm³' },
    ],
  },
  {
    icon: <Shield size={16} />, vi: 'Chứng nhận & EUDR', en: 'Certification & EUDR', color: '#0D47A1',
    fields: [
      { key: 'certification_status', vi: 'Trạng thái chứng nhận', en: 'Certification status', type: 'text' },
      { key: 'certification_body', vi: 'Tổ chức chứng nhận', en: 'Certification body', type: 'text' },
      { key: 'last_inspection_date', vi: 'Ngày kiểm tra', en: 'Last inspection date', type: 'date' },
      { key: 'inspection_result', vi: 'Kết quả', en: 'Result', type: 'text' },
      { key: 'eudr_eligible', vi: 'Đủ điều kiện EUDR', en: 'EUDR eligible', type: 'bool' },
      { key: 'eudr_polygon_id', vi: 'Mã polygon EUDR', en: 'EUDR polygon ID', type: 'text' },
      { key: 'eudr_verified_date', vi: 'Ngày xác minh EUDR', en: 'EUDR verified date', type: 'date' },
      { key: 'deforestation_status', vi: 'Tình trạng phá rừng', en: 'Deforestation status', type: 'text' },
    ],
  },
  {
    icon: <ClipboardList size={16} />, vi: 'Quản lý', en: 'Management', color: '#E65100',
    fields: [
      { key: 'surveyed_by', vi: 'Người khảo sát', en: 'Surveyed by', type: 'text' },
      { key: 'survey_date', vi: 'Ngày khảo sát', en: 'Survey date', type: 'date' },
      { key: 'verified_by', vi: 'Người xác minh', en: 'Verified by', type: 'text' },
      { key: 'verified_date', vi: 'Ngày xác minh', en: 'Verified date', type: 'date' },
      { key: 'extra_data', vi: 'Dữ liệu mở rộng', en: 'Extra data', type: 'json' },
    ],
  },
];

// EUDR Assessment fields for modal
const EUDR_FIELDS: FieldDef[] = [
  { key: 'assessment_code', vi: 'Mã đánh giá', en: 'Assessment code', type: 'text' },
  { key: 'assessment_date', vi: 'Ngày đánh giá', en: 'Assessment date', type: 'date' },
  { key: 'assessor_name', vi: 'Người đánh giá', en: 'Assessor name', type: 'text' },
  { key: 'assessor_org', vi: 'Tổ chức', en: 'Organization', type: 'text' },
  { key: 'risk_level', vi: 'Mức rủi ro', en: 'Risk level', type: 'select', options: ['low', 'standard', 'high'] },
  { key: 'total_score', vi: 'Tổng điểm', en: 'Total score', type: 'number' },
  { key: 'max_score', vi: 'Điểm tối đa', en: 'Max score', type: 'number' },
  { key: 'compliance_pct', vi: '% tuân thủ', en: '% compliance', type: 'number', suffix: '%' },
  { key: 'deforestation_free', vi: 'Không phá rừng', en: 'Deforestation free', type: 'bool' },
  { key: 'cutoff_date', vi: 'Ngày cắt', en: 'Cutoff date', type: 'date' },
  { key: 'recommendation', vi: 'Khuyến nghị', en: 'Recommendation', type: 'text' },
  { key: 'next_assessment_date', vi: 'Ngày đánh giá tiếp', en: 'Next assessment date', type: 'date' },
  { key: 'notes', vi: 'Ghi chú', en: 'Notes', type: 'text' },
  { key: 'status', vi: 'Trạng thái', en: 'Status', type: 'text' },
];

// Trade/Sales fields for modal
const TRADE_FIELDS: FieldDef[] = [
  { key: 'code', vi: 'Mã', en: 'Code', type: 'text' },
  { key: 'transaction_date', vi: 'Ngày giao dịch', en: 'Transaction date', type: 'date' },
  { key: 'transaction_type', vi: 'Loại giao dịch', en: 'Transaction type', type: 'select', options: ['direct', 'cooperative', 'collector', 'auction'] },
  { key: 'total_quantity', vi: 'Tổng số lượng', en: 'Total quantity', type: 'number' },
  { key: 'total_amount', vi: 'Tổng tiền', en: 'Total amount', type: 'number' },
  { key: 'currency', vi: 'Đơn vị tiền', en: 'Currency', type: 'text' },
  { key: 'payment_method', vi: 'Phương thức thanh toán', en: 'Payment method', type: 'text' },
  { key: 'payment_status', vi: 'Trạng thái thanh toán', en: 'Payment status', type: 'text' },
  { key: 'receipt_number', vi: 'Số biên nhận', en: 'Receipt number', type: 'text' },
  { key: 'delivery_location', vi: 'Nơi giao', en: 'Delivery location', type: 'text' },
  { key: 'notes', vi: 'Ghi chú', en: 'Notes', type: 'text' },
  { key: 'status', vi: 'Trạng thái', en: 'Status', type: 'text' },
];

// Budget fields for modal
const BUDGET_FIELDS: FieldDef[] = [
  { key: 'code', vi: 'Mã', en: 'Code', type: 'text' },
  { key: 'category', vi: 'Danh mục', en: 'Category', type: 'text' },
  { key: 'description', vi: 'Mô tả', en: 'Description', type: 'text' },
  { key: 'amount', vi: 'Giá trị', en: 'Amount', type: 'number' },
  { key: 'budget_date', vi: 'Ngày', en: 'Date', type: 'date' },
  { key: 'source', vi: 'Nguồn', en: 'Source', type: 'text' },
  { key: 'status', vi: 'Trạng thái', en: 'Status', type: 'text' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (val: string | undefined | null): string => {
  if (!val) return '—';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  } catch {
    return val;
  }
};

const fmtBool = (val: any): string => (val ? '✅' : '❌');

const fmtValue = (val: any, field: FieldDef): string => {
  if (val === undefined || val === null || val === '') return '—';
  if (field.type === 'bool') return fmtBool(val);
  if (field.type === 'date') return fmtDate(val);
  if (field.type === 'json') {
    if (typeof val === 'object') return JSON.stringify(val, null, 2);
    return String(val);
  }
  if (field.type === 'number' && typeof val === 'number') {
    const formatted = val.toLocaleString();
    return field.suffix ? `${formatted} ${field.suffix}` : formatted;
  }
  return String(val);
};

const toInputDate = (val: string | undefined | null): string => {
  if (!val) return '';
  try {
    return new Date(val).toISOString().slice(0, 10);
  } catch {
    return '';
  }
};

// ─── Status Badge ─────────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: string }) => {
  const colorMap: Record<string, { bg: string; fg: string }> = {
    active: { bg: '#E8F5E9', fg: '#2E7D32' },
    inactive: { bg: '#FFEBEE', fg: '#C62828' },
    draft: { bg: '#FFF8E1', fg: '#F57F17' },
    archived: { bg: '#EFEBE9', fg: '#5D4037' },
  };
  const c = colorMap[status] || colorMap.active;
  return (
    <span style={{ padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: c.bg, color: c.fg }}>
      {status || 'active'}
    </span>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FarmDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const lang = i18n.language;

  const [farm, setFarm] = useState<Farm | null>(null);
  const [assessments, setAssessments] = useState<EUDRAssessment[]>([]);
  const [trades, setTrades] = useState<TradeItem[]>([]);
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('info');
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0, 1, 2, 3]));

  // Modal state
  const [showEditFarm, setShowEditFarm] = useState(false);
  const [editFarmData, setEditFarmData] = useState<Record<string, any>>({});
  const [modalTab, setModalTab] = useState<'eudr' | 'trade' | 'budget' | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>('add');
  const [modalData, setModalData] = useState<Record<string, any>>({});
  const [modalItemId, setModalItemId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ tab: 'eudr' | 'trade' | 'budget'; id: string } | null>(null);

  // ─── Data Loading ─────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const f = await pb.collection('farms').getOne(id, { expand: 'farmer_id' });
      setFarm(f as unknown as Farm);

      try {
        const eudrResult = await pb.collection('eudr_assessments').getList(1, 50, {
          filter: `farm_id="${id}"`, sort: '-assessment_date',
        });
        setAssessments(eudrResult.items as unknown as EUDRAssessment[]);
      } catch { /* collection may not exist */ }

      try {
        const tradeResult = await pb.collection('sales_transactions').getList(1, 50, {
          filter: `farm_id="${id}"`, sort: '-transaction_date',
        });
        setTrades(tradeResult.items as unknown as TradeItem[]);
      } catch { /* */ }

      try {
        const farmData = f as any;
        let budgetFilter = `farm_id="${id}"`;
        if (farmData.farmer_id) {
          budgetFilter = `farm_id="${id}" || farmer_id="${farmData.farmer_id}"`;
        }
        const budgetResult = await pb.collection('support_distributions').getList(1, 50, {
          filter: budgetFilter, sort: '-distribution_date',
        });
        setBudgets(budgetResult.items.map((b: any) => ({
          id: b.id, code: b.code, category: b.support_type,
          amount: b.value_vnd, description: b.item_name,
          budget_date: b.distribution_date, source: b.source, status: b.status,
        })) as BudgetItem[]);
      } catch { /* */ }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Section Toggle ─────────────────────────────────────────────────────────

  const toggleSection = (idx: number) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  // ─── Farm Edit Modal ────────────────────────────────────────────────────────

  const openEditFarm = () => {
    if (!farm) return;
    const data: Record<string, any> = {};
    SECTION_FIELDS.forEach(section => {
      section.fields.forEach(f => {
        if (f.key === 'farmer_id') {
          data[f.key] = farm.farmer_id || '';
        } else if (f.type === 'date') {
          data[f.key] = toInputDate(farm[f.key]);
        } else if (f.type === 'json') {
          data[f.key] = typeof farm[f.key] === 'object' ? JSON.stringify(farm[f.key], null, 2) : (farm[f.key] || '');
        } else {
          data[f.key] = farm[f.key] ?? '';
        }
      });
    });
    setEditFarmData(data);
    setShowEditFarm(true);
  };

  const saveFarm = async () => {
    if (!farm) return;
    setSaving(true);
    try {
      const payload: Record<string, any> = { ...editFarmData };
      // Parse JSON fields
      SECTION_FIELDS.forEach(section => {
        section.fields.forEach(f => {
          if (f.type === 'json' && typeof payload[f.key] === 'string') {
            try { payload[f.key] = JSON.parse(payload[f.key]); } catch { /* keep as string */ }
          }
          if (f.type === 'number' && payload[f.key] !== '' && payload[f.key] !== undefined) {
            payload[f.key] = Number(payload[f.key]);
          }
          if (f.type === 'bool') {
            payload[f.key] = payload[f.key] === true || payload[f.key] === 'true';
          }
        });
      });
      await pb.collection('farms').update(farm.id, payload);
      setShowEditFarm(false);
      await loadData();
    } catch (e) {
      console.error('Save error:', e);
      alert(lang === 'vi' ? 'Lỗi khi lưu!' : 'Error saving!');
    }
    setSaving(false);
  };

  // ─── Tab CRUD Modal ─────────────────────────────────────────────────────────

  const openAddModal = (tab: 'eudr' | 'trade' | 'budget') => {
    const data: Record<string, any> = {};
    if (tab === 'eudr') {
      data.farm_id = id;
      data.farmer_id = farm?.farmer_id || '';
    } else if (tab === 'trade') {
      data.farm_id = id;
      data.farmer_id = farm?.farmer_id || '';
    } else {
      data.farmer_id = farm?.farmer_id || '';
    }
    setModalData(data);
    setModalMode('add');
    setModalItemId(null);
    setModalTab(tab);
  };

  const openEditModal = (tab: 'eudr' | 'trade' | 'budget', item: any) => {
    const fields = tab === 'eudr' ? EUDR_FIELDS : tab === 'trade' ? TRADE_FIELDS : BUDGET_FIELDS;
    const data: Record<string, any> = {};
    fields.forEach(f => {
      if (f.type === 'date') data[f.key] = toInputDate(item[f.key]);
      else data[f.key] = item[f.key] ?? '';
    });
    setModalData(data);
    setModalMode('edit');
    setModalItemId(item.id);
    setModalTab(tab);
  };

  const saveTabItem = async () => {
    if (!modalTab) return;
    setSaving(true);
    try {
      const collection = modalTab === 'eudr' ? 'eudr_assessments'
        : modalTab === 'trade' ? 'sales_transactions' : 'support_distributions';
      const fields = modalTab === 'eudr' ? EUDR_FIELDS : modalTab === 'trade' ? TRADE_FIELDS : BUDGET_FIELDS;
      const payload: Record<string, any> = { ...modalData };

      // Set relation fields
      if (modalTab === 'eudr' || modalTab === 'trade') {
        payload.farm_id = id;
        payload.farmer_id = farm?.farmer_id || '';
      } else {
        payload.farmer_id = farm?.farmer_id || '';
      }

      // Type coercion
      fields.forEach(f => {
        if (f.type === 'number' && payload[f.key] !== '' && payload[f.key] !== undefined) {
          payload[f.key] = Number(payload[f.key]);
        }
        if (f.type === 'bool') {
          payload[f.key] = payload[f.key] === true || payload[f.key] === 'true';
        }
      });

      // Map budget fields back to support_distributions schema
      if (modalTab === 'budget') {
        payload.support_type = payload.category || '';
        payload.item_name = payload.description || '';
        payload.value_vnd = payload.amount || 0;
        payload.distribution_date = payload.budget_date || '';
      }

      if (modalMode === 'add') {
        await pb.collection(collection).create(payload);
      } else if (modalItemId) {
        await pb.collection(collection).update(modalItemId, payload);
      }
      setModalTab(null);
      await loadData();
    } catch (e) {
      console.error('Save tab item error:', e);
      alert(lang === 'vi' ? 'Lỗi khi lưu!' : 'Error saving!');
    }
    setSaving(false);
  };

  const deleteTabItem = async () => {
    if (!deleteConfirm) return;
    setSaving(true);
    try {
      const collection = deleteConfirm.tab === 'eudr' ? 'eudr_assessments'
        : deleteConfirm.tab === 'trade' ? 'sales_transactions' : 'support_distributions';
      await pb.collection(collection).delete(deleteConfirm.id);
      setDeleteConfirm(null);
      await loadData();
    } catch (e) {
      console.error('Delete error:', e);
      alert(lang === 'vi' ? 'Lỗi khi xóa!' : 'Error deleting!');
    }
    setSaving(false);
  };

  // ─── Rendering ──────────────────────────────────────────────────────────────

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#8D6E63' }}>Loading...</div>;
  if (!farm) return <div style={{ padding: 40, textAlign: 'center', color: '#8D6E63' }}>{lang === 'vi' ? 'Không tìm thấy nông trại' : 'Farm not found'}</div>;

  const farmer = farm.expand?.farmer_id;

  const tabs: { key: TabKey; label: string; count: number; icon: React.ReactNode; color: string }[] = [
    { key: 'info', label: lang === 'vi' ? 'Thông tin' : 'Info', count: 0, icon: <Sprout size={14} />, color: '#2E7D32' },
    { key: 'eudr', label: 'EUDR', count: assessments.length, icon: <CheckSquare size={14} />, color: '#1565C0' },
    { key: 'trade', label: lang === 'vi' ? 'Thương mại' : 'Trade', count: trades.length, icon: <ShoppingCart size={14} />, color: '#C62828' },
    { key: 'budget', label: lang === 'vi' ? 'Ngân sách' : 'Budget', count: budgets.length, icon: <DollarSign size={14} />, color: '#E65100' },
  ];

  const emptyState = (icon: React.ReactNode, msg: string) => (
    <div style={{ textAlign: 'center', padding: 40, color: '#A1887F' }}>
      <div style={{ marginBottom: 10, opacity: 0.5 }}>{icon}</div>
      <div style={{ fontSize: 14 }}>{msg}</div>
      <div style={{ fontSize: 12, marginTop: 6, color: '#BCAAA4' }}>{lang === 'vi' ? 'Dữ liệu sẽ hiển thị khi có bản ghi' : 'Data appears when records exist'}</div>
    </div>
  );

  const infoRow = (label: string, value: string) => (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '7px 0', borderBottom: '1px solid #F5F0EB' }}>
      <span style={{ fontSize: 13, color: '#8D6E63', minWidth: 160, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: '#3E2723', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{value}</span>
    </div>
  );

  // ─── Render Form Field ─────────────────────────────────────────────────────

  const renderFormField = (field: FieldDef, data: Record<string, any>, setData: (d: Record<string, any>) => void) => {
    const val = data[field.key];
    const label = lang === 'vi' ? field.vi : field.en;

    const inputStyle: React.CSSProperties = {
      padding: '8px 12px', border: '1px solid #D7CCC8', borderRadius: 8,
      fontSize: 13, color: '#3E2723', background: '#fff', width: '100%', outline: 'none',
    };

    if (field.type === 'bool') {
      return (
        <div key={field.key} style={{ marginBottom: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#5D4037', cursor: 'pointer' }}>
            <input type="checkbox" checked={!!val} onChange={e => setData({ ...data, [field.key]: e.target.checked })}
              style={{ width: 16, height: 16, accentColor: '#6D4C41' }} />
            {label}
          </label>
        </div>
      );
    }

    if (field.type === 'select' && field.options) {
      return (
        <div key={field.key} style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#5D4037', marginBottom: 4, display: 'block' }}>{label}{field.required && ' *'}</label>
          <select value={val || ''} onChange={e => setData({ ...data, [field.key]: e.target.value })} style={inputStyle}>
            <option value="">—</option>
            {field.options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      );
    }

    if (field.type === 'date') {
      return (
        <div key={field.key} style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#5D4037', marginBottom: 4, display: 'block' }}>{label}</label>
          <input type="date" value={val || ''} onChange={e => setData({ ...data, [field.key]: e.target.value })} style={inputStyle} />
        </div>
      );
    }

    if (field.type === 'json') {
      return (
        <div key={field.key} style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#5D4037', marginBottom: 4, display: 'block' }}>{label}</label>
          <textarea value={val || ''} onChange={e => setData({ ...data, [field.key]: e.target.value })}
            style={{ ...inputStyle, minHeight: 60, resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }} />
        </div>
      );
    }

    return (
      <div key={field.key} style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#5D4037', marginBottom: 4, display: 'block' }}>{label}{field.required && ' *'}</label>
        <input
          type={field.type === 'number' ? 'number' : 'text'}
          step={field.type === 'number' ? 'any' : undefined}
          value={val ?? ''}
          onChange={e => setData({ ...data, [field.key]: e.target.value })}
          style={inputStyle}
        />
      </div>
    );
  };

  // ─── Modal Component ───────────────────────────────────────────────────────

  const renderModal = (
    title: string,
    fields: FieldDef[],
    data: Record<string, any>,
    setData: (d: Record<string, any>) => void,
    onSave: () => void,
    onClose: () => void,
  ) => (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 640 }}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0 16px' }}>
            {fields.map(f => renderFormField(f, data, setData))}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>
            {lang === 'vi' ? 'Hủy' : 'Cancel'}
          </button>
          <button className="btn btn-primary" onClick={onSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Save size={14} /> {saving ? '...' : (lang === 'vi' ? 'Lưu' : 'Save')}
          </button>
        </div>
      </div>
    </div>
  );

  // ─── Action Buttons for Tab Tables ──────────────────────────────────────────

  const actionCell = (tab: 'eudr' | 'trade' | 'budget', item: any) => (
    <td style={{ whiteSpace: 'nowrap' }}>
      <button onClick={() => openEditModal(tab, item)} title={lang === 'vi' ? 'Sửa' : 'Edit'}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#6D4C41' }}>
        <Pencil size={14} />
      </button>
      <button onClick={() => setDeleteConfirm({ tab, id: item.id })} title={lang === 'vi' ? 'Xóa' : 'Delete'}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#C62828', marginLeft: 4 }}>
        <Trash2 size={14} />
      </button>
    </td>
  );

  // ─── Add Button ─────────────────────────────────────────────────────────────

  const addButton = (tab: 'eudr' | 'trade' | 'budget') => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
      <button className="btn btn-primary btn-sm" onClick={() => openAddModal(tab)} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Plus size={14} /> {lang === 'vi' ? 'Thêm' : 'Add'}
      </button>
    </div>
  );

  // ─── JSX ────────────────────────────────────────────────────────────────────

  return (
    <div className="animate-in">
      {/* Back */}
      <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#8D6E63', cursor: 'pointer', fontSize: 14, fontWeight: 500, marginBottom: 16 }}>
        <ArrowLeft size={18} /> {lang === 'vi' ? 'Quay lại' : 'Back'}
      </button>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', padding: '10px 16px', background: '#F5F0EB', borderRadius: 10, marginBottom: 16, fontSize: 13, color: '#5D4037' }}>
        <span style={{ cursor: 'pointer', color: '#8D6E63' }} onClick={() => navigate('/dashboard')}>Dashboard</span>
        <ChevronRight size={14} style={{ color: '#A1887F' }} />
        <span style={{ cursor: 'pointer', color: '#8D6E63' }} onClick={() => navigate('/farmers')}>{lang === 'vi' ? 'Nông dân' : 'Farmers'}</span>
        {farmer && (<>
          <ChevronRight size={14} style={{ color: '#A1887F' }} />
          <span style={{ cursor: 'pointer', color: '#8D6E63' }} onClick={() => navigate(`/farmers/${farmer.id}`)}>{farmer.full_name}</span>
        </>)}
        <ChevronRight size={14} style={{ color: '#A1887F' }} />
        <span style={{ fontWeight: 700, color: '#3E2723' }}>{farm.code}</span>
      </div>

      {/* Farm Header Card */}
      <div className="card" style={{ marginBottom: 20, padding: '24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: 'linear-gradient(135deg, #2E7D32, #81C784)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>
            <Sprout size={28} />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#2C2C2C', margin: 0 }}>{farm.code}</h1>
              {farm.plot_name && <span style={{ fontSize: 14, color: '#8D6E63' }}>— {farm.plot_name}</span>}
            </div>
            <div style={{ fontSize: 14, color: '#8D6E63', fontWeight: 600, marginTop: 4 }}>
              {farmer && (
                <span style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationColor: '#D7CCC8' }} onClick={() => navigate(`/farmers/${farmer.id}`)}>
                  {farmer.full_name} ({farmer.code})
                </span>
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
              {[
                { label: lang === 'vi' ? 'Cà phê' : 'Coffee', value: `${farm.coffee_area || 0} ha`, color: '#2E7D32' },
                { label: lang === 'vi' ? 'Tổng' : 'Total', value: `${farm.total_area || 0} ha`, color: '#5D4037' },
                { label: lang === 'vi' ? 'Số cây' : 'Trees', value: `${farm.tree_count || 0}`, color: '#E65100' },
                { label: lang === 'vi' ? 'Năng suất' : 'Yield', value: farm.yield_per_ha ? `${farm.yield_per_ha} t/ha` : '—', color: '#0277BD' },
                { label: lang === 'vi' ? 'Giống' : 'Variety', value: farm.coffee_variety || '—', color: '#6A1B9A' },
              ].map((stat, i) => (
                <span key={i} style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: `${stat.color}12`, color: stat.color }}>
                  {stat.label}: {stat.value}
                </span>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <StatusBadge status={farm.status} />
            <button onClick={openEditFarm} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Pencil size={14} /> {lang === 'vi' ? 'Sửa' : 'Edit'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="detail-tabs" style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 16 }}>
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '8px 12px', border: 'none', cursor: 'pointer',
              borderRadius: '8px 8px 0 0', fontWeight: 600, fontSize: 12,
              background: activeTab === tab.key ? tab.color : '#F5F0EB',
              color: activeTab === tab.key ? 'white' : '#8D6E63',
              transition: 'all 0.2s', flex: '1 1 auto', justifyContent: 'center',
              minWidth: 0,
            }}
          >
            {tab.icon}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tab.label}</span>
            {tab.count > 0 && <span style={{ padding: '1px 5px', borderRadius: 8, fontSize: 10, fontWeight: 700, background: activeTab === tab.key ? 'rgba(255,255,255,0.25)' : '#E8E0D8' }}>{tab.count}</span>}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="card" style={{ padding: '16px 16px', overflow: 'hidden' }}>

        {/* ─── INFO TAB ─── */}
        {activeTab === 'info' && (
          <div className="farm-info-grid">
            {SECTION_FIELDS.map((section, sIdx) => (
              <div key={sIdx} style={{ marginBottom: 8, border: '1px solid #EFEBE9', borderRadius: 10, overflow: 'hidden' }}>
                {/* Section Header */}
                <button onClick={() => toggleSection(sIdx)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '12px 16px', background: expandedSections.has(sIdx) ? `${section.color}0A` : '#FAFAF8',
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  borderBottom: expandedSections.has(sIdx) ? '1px solid #EFEBE9' : 'none',
                }}>
                  <span style={{ color: section.color, display: 'flex', alignItems: 'center' }}>{section.icon}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#3E2723', flex: 1 }}>
                    {lang === 'vi' ? section.vi : section.en}
                  </span>
                  <span style={{ fontSize: 11, color: '#A1887F', marginRight: 4 }}>{section.fields.length}</span>
                  {expandedSections.has(sIdx) ? <ChevronUp size={16} style={{ color: '#A1887F' }} /> : <ChevronDown size={16} style={{ color: '#A1887F' }} />}
                </button>

                {/* Section Body */}
                {expandedSections.has(sIdx) && (
                  <div style={{ padding: '8px 16px 12px' }}>
                    {section.fields.map(f => {
                      if (f.key === 'farmer_id') {
                        const fName = farmer ? `${farmer.full_name} (${farmer.code})` : (farm.farmer_id || '—');
                        return <div key={f.key}>{infoRow(lang === 'vi' ? f.vi : f.en, fName)}</div>;
                      }
                      return <div key={f.key}>{infoRow(lang === 'vi' ? f.vi : f.en, fmtValue(farm[f.key], f))}</div>;
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ─── EUDR TAB ─── */}
        {activeTab === 'eudr' && (
          <div>
            {addButton('eudr')}
            {assessments.length === 0
              ? emptyState(<CheckSquare size={36} />, lang === 'vi' ? 'Chưa có đánh giá EUDR cho farm này' : 'No EUDR assessments for this farm')
              : <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', margin: '0 -8px', padding: '0 8px' }}>
                  <table style={{ minWidth: 700 }}>
                    <thead><tr>
                      <th>{lang === 'vi' ? 'Mã' : 'Code'}</th>
                      <th>{lang === 'vi' ? 'Ngày' : 'Date'}</th>
                      <th>{lang === 'vi' ? 'Người ĐG' : 'Assessor'}</th>
                      <th>{lang === 'vi' ? 'Rủi ro' : 'Risk'}</th>
                      <th>{lang === 'vi' ? 'Điểm' : 'Score'}</th>
                      <th>% {lang === 'vi' ? 'tuân thủ' : 'compl.'}</th>
                      <th>{lang === 'vi' ? 'Phá rừng' : 'Deforest.'}</th>
                      <th>{lang === 'vi' ? 'TT' : 'Status'}</th>
                      <th></th>
                    </tr></thead>
                    <tbody>
                      {assessments.map(a => (
                        <tr key={a.id}>
                          <td style={{ fontWeight: 600 }}>{a.assessment_code || a.code || '—'}</td>
                          <td>{fmtDate(a.assessment_date)}</td>
                          <td>{a.assessor_name || '—'}</td>
                          <td>
                            <span style={{
                              padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                              background: a.risk_level === 'low' ? '#E8F5E9' : a.risk_level === 'high' ? '#FFEBEE' : '#FFF8E1',
                              color: a.risk_level === 'low' ? '#2E7D32' : a.risk_level === 'high' ? '#C62828' : '#F57F17',
                            }}>{a.risk_level || '—'}</span>
                          </td>
                          <td>{a.total_score ?? '—'}{a.max_score ? `/${a.max_score}` : ''}</td>
                          <td>{a.compliance_pct != null ? `${a.compliance_pct}%` : '—'}</td>
                          <td>{a.deforestation_free != null ? fmtBool(a.deforestation_free) : '—'}</td>
                          <td>{a.status || a.overall_status || '—'}</td>
                          {actionCell('eudr', a)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            }
          </div>
        )}

        {/* ─── TRADE TAB ─── */}
        {activeTab === 'trade' && (
          <div>
            {addButton('trade')}
            {trades.length === 0
              ? emptyState(<ShoppingCart size={36} />, lang === 'vi' ? 'Chưa có giao dịch thương mại' : 'No trade transactions')
              : <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', margin: '0 -8px', padding: '0 8px' }}>
                  <table style={{ minWidth: 750 }}>
                    <thead><tr>
                      <th>{lang === 'vi' ? 'Mã' : 'Code'}</th>
                      <th>{lang === 'vi' ? 'Ngày' : 'Date'}</th>
                      <th>{lang === 'vi' ? 'Loại' : 'Type'}</th>
                      <th>{lang === 'vi' ? 'Số lượng' : 'Qty'}</th>
                      <th>{lang === 'vi' ? 'Tổng tiền' : 'Total'}</th>
                      <th>{lang === 'vi' ? 'Thanh toán' : 'Payment'}</th>
                      <th>{lang === 'vi' ? 'TT' : 'Status'}</th>
                      <th></th>
                    </tr></thead>
                    <tbody>
                      {trades.map(t => (
                        <tr key={t.id}>
                          <td style={{ fontWeight: 600 }}>{t.code || '—'}</td>
                          <td>{fmtDate(t.transaction_date)}</td>
                          <td>
                            <span style={{ padding: '2px 8px', borderRadius: 8, fontSize: 11, background: '#FCE4EC', color: '#C62828' }}>
                              {t.transaction_type || t.product_type || '—'}
                            </span>
                          </td>
                          <td>{t.total_quantity?.toLocaleString() ?? t.quantity_kg?.toLocaleString() ?? '—'}</td>
                          <td style={{ fontWeight: 700, color: '#2E7D32' }}>
                            {(t.total_amount ?? t.total_value)?.toLocaleString() ?? '—'} {t.currency || '₫'}
                          </td>
                          <td>{t.payment_status || '—'}</td>
                          <td>{t.status || '—'}</td>
                          {actionCell('trade', t)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            }
          </div>
        )}

        {/* ─── BUDGET TAB ─── */}
        {activeTab === 'budget' && (
          <div>
            {addButton('budget')}
            {budgets.length === 0
              ? emptyState(<DollarSign size={36} />, lang === 'vi' ? 'Chưa có ngân sách đầu tư' : 'No budget/investment records')
              : <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', margin: '0 -8px', padding: '0 8px' }}>
                  <table style={{ minWidth: 600 }}>
                    <thead><tr>
                      <th>{lang === 'vi' ? 'Mã' : 'Code'}</th>
                      <th>{lang === 'vi' ? 'Loại' : 'Category'}</th>
                      <th>{lang === 'vi' ? 'Mô tả' : 'Description'}</th>
                      <th>{lang === 'vi' ? 'Giá trị' : 'Amount'}</th>
                      <th>{lang === 'vi' ? 'Ngày' : 'Date'}</th>
                      <th>{lang === 'vi' ? 'Nguồn' : 'Source'}</th>
                      <th></th>
                    </tr></thead>
                    <tbody>
                      {budgets.map(b => (
                        <tr key={b.id}>
                          <td style={{ fontWeight: 600 }}>{b.code || '—'}</td>
                          <td><span style={{ padding: '2px 8px', borderRadius: 8, fontSize: 11, background: '#FFF3E0', color: '#E65100' }}>{b.category || '—'}</span></td>
                          <td>{b.description || '—'}</td>
                          <td style={{ fontWeight: 700, color: '#2E7D32' }}>{b.amount?.toLocaleString() || '—'} ₫</td>
                          <td>{fmtDate(b.budget_date)}</td>
                          <td>{b.source || '—'}</td>
                          {actionCell('budget', b)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            }
          </div>
        )}
      </div>

      {/* ═══ MODALS ═══ */}

      {/* Farm Edit Modal */}
      {showEditFarm && renderModal(
        lang === 'vi' ? 'Chỉnh sửa nông trại' : 'Edit Farm',
        SECTION_FIELDS.flatMap(s => s.fields),
        editFarmData,
        setEditFarmData,
        saveFarm,
        () => setShowEditFarm(false),
      )}

      {/* EUDR Add/Edit Modal */}
      {modalTab === 'eudr' && renderModal(
        modalMode === 'add'
          ? (lang === 'vi' ? 'Thêm đánh giá EUDR' : 'Add EUDR Assessment')
          : (lang === 'vi' ? 'Sửa đánh giá EUDR' : 'Edit EUDR Assessment'),
        EUDR_FIELDS,
        modalData,
        setModalData,
        saveTabItem,
        () => setModalTab(null),
      )}

      {/* Trade Add/Edit Modal */}
      {modalTab === 'trade' && renderModal(
        modalMode === 'add'
          ? (lang === 'vi' ? 'Thêm giao dịch' : 'Add Transaction')
          : (lang === 'vi' ? 'Sửa giao dịch' : 'Edit Transaction'),
        TRADE_FIELDS,
        modalData,
        setModalData,
        saveTabItem,
        () => setModalTab(null),
      )}

      {/* Budget Add/Edit Modal */}
      {modalTab === 'budget' && renderModal(
        modalMode === 'add'
          ? (lang === 'vi' ? 'Thêm ngân sách' : 'Add Budget')
          : (lang === 'vi' ? 'Sửa ngân sách' : 'Edit Budget'),
        BUDGET_FIELDS,
        modalData,
        setModalData,
        saveTabItem,
        () => setModalTab(null),
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setDeleteConfirm(null); }}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={18} style={{ color: '#C62828' }} />
                {lang === 'vi' ? 'Xác nhận xóa' : 'Confirm Delete'}
              </h3>
              <button className="modal-close" onClick={() => setDeleteConfirm(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 14, color: '#5D4037' }}>
                {lang === 'vi' ? 'Bạn có chắc chắn muốn xóa bản ghi này? Hành động này không thể hoàn tác.' : 'Are you sure you want to delete this record? This action cannot be undone.'}
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)} disabled={saving}>
                {lang === 'vi' ? 'Hủy' : 'Cancel'}
              </button>
              <button className="btn btn-danger" onClick={deleteTabItem} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Trash2 size={14} /> {saving ? '...' : (lang === 'vi' ? 'Xóa' : 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
