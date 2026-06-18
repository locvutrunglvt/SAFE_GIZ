import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, Download, FileSpreadsheet, CheckCircle, AlertTriangle, X, Loader2, ChevronDown } from 'lucide-react';
import pb from '../../lib/pocketbase';

interface ImportResult {
  collection: string;
  total: number;
  success: number;
  errors: string[];
}

// Collections that support import
const IMPORTABLE = [
  { key: 'farmers', label: 'Nông dân', labelEn: 'Farmers', icon: '👨‍🌾' },
  { key: 'farms', label: 'Nông trại', labelEn: 'Farms', icon: '🏔️' },
  { key: 'farmer_groups', label: 'Nhóm hộ', labelEn: 'Farmer Groups', icon: '👥' },
  { key: 'communes', label: 'Xã', labelEn: 'Communes', icon: '🌍' },
  { key: 'villages', label: 'Thôn', labelEn: 'Villages', icon: '🏘️' },
  { key: 'eudr_criteria', label: 'Tiêu chí EUDR', labelEn: 'EUDR Criteria', icon: '✅' },
  { key: 'eudr_assessments', label: 'Đánh giá EUDR', labelEn: 'EUDR Assessments', icon: '📋' },
  { key: 'support_distributions', label: 'Hỗ trợ', labelEn: 'Support', icon: '📦' },
  { key: 'trainings', label: 'Tập huấn', labelEn: 'Trainings', icon: '📚' },
  { key: 'training_participants', label: 'Người tham gia TH', labelEn: 'Training Participants', icon: '🎓' },
  { key: 'sales_transactions', label: 'Giao dịch', labelEn: 'Transactions', icon: '💰' },
  { key: 'personnel', label: 'Nhân sự', labelEn: 'Personnel', icon: '👤' },
  { key: 'materials', label: 'Vật tư', labelEn: 'Materials', icon: '🔧' },
  { key: 'farm_fertilizers', label: 'Phân bón', labelEn: 'Fertilizers', icon: '🌱' },
  { key: 'farm_pesticides', label: 'Thuốc BVTV', labelEn: 'Pesticides', icon: '🧪' },
  { key: 'farm_pests', label: 'Sâu bệnh', labelEn: 'Pests', icon: '🐛' },
  { key: 'farm_irrigation', label: 'Tưới nước', labelEn: 'Irrigation', icon: '💧' },
  { key: 'farmer_labor', label: 'Lao động', labelEn: 'Labor', icon: '👷' },
  { key: 'farmer_income', label: 'Thu nhập', labelEn: 'Income', icon: '💵' },
  { key: 'budgets', label: 'Ngân sách', labelEn: 'Budgets', icon: '💰' },
  { key: 'expenditures', label: 'Chi phí', labelEn: 'Expenditures', icon: '📊' },
];

// Parse CSV from Excel-exported format
function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows: Record<string, string>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      if (vals[idx] && vals[idx] !== '') row[h] = vals[idx];
    });
    if (Object.keys(row).length > 0) rows.push(row);
  }
  return { headers, rows };
}

// Parse XLSX using SheetJS (loaded from CDN)
async function parseXLSX(file: File): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        // @ts-ignore - XLSX loaded from CDN
        const XLSX = (window as any).XLSX;
        if (!XLSX) {
          // Fallback to CSV parsing
          const text = new TextDecoder().decode(e.target?.result as ArrayBuffer);
          resolve(parseCSV(text));
          return;
        }
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        
        if (json.length === 0) {
          resolve({ headers: [], rows: [] });
          return;
        }
        
        const headers = Object.keys(json[0]);
        resolve({ headers, rows: json });
      } catch {
        resolve({ headers: [], rows: [] });
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

export default function ImportExport() {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const fileRef = useRef<HTMLInputElement>(null);
  
  const [selectedCollection, setSelectedCollection] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [preview, setPreview] = useState<{ headers: string[]; rows: Record<string, string>[] } | null>(null);
  const [fileName, setFileName] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Download template
  const handleDownloadTemplate = () => {
    window.open('/SAFEGIZ_Import_Templates_v9.xlsx', '_blank');
  };

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setFileName(file.name);
    setResult(null);
    
    let parsed;
    if (file.name.endsWith('.csv')) {
      const text = await file.text();
      parsed = parseCSV(text);
    } else {
      parsed = await parseXLSX(file);
    }
    
    setPreview(parsed);
  };

  // Import data
  const handleImport = async () => {
    if (!selectedCollection || !preview || preview.rows.length === 0) return;
    
    setImporting(true);
    const errors: string[] = [];
    let success = 0;
    
    for (let i = 0; i < preview.rows.length; i++) {
      const row = preview.rows[i];
      // Clean row - remove empty values
      const cleaned: Record<string, any> = {};
      for (const [key, val] of Object.entries(row)) {
        if (val !== '' && val !== undefined && val !== null) {
          // Convert bool strings
          if (val === 'true') cleaned[key] = true;
          else if (val === 'false') cleaned[key] = false;
          // Convert numbers
          else if (!isNaN(Number(val)) && val !== '' && key !== 'code' && key !== 'phone' && key !== 'national_id') {
            cleaned[key] = Number(val);
          }
          else cleaned[key] = val;
        }
      }
      
      try {
        await pb.collection(selectedCollection).create(cleaned);
        success++;
      } catch (err: any) {
        const msg = err?.response?.data 
          ? `Row ${i + 1}: ${JSON.stringify(err.response.data).slice(0, 100)}`
          : `Row ${i + 1}: ${err.message || 'Unknown error'}`;
        errors.push(msg);
      }
    }
    
    setResult({
      collection: selectedCollection,
      total: preview.rows.length,
      success,
      errors,
    });
    setImporting(false);
  };

  const selectedItem = IMPORTABLE.find(c => c.key === selectedCollection);

  return (
    <div className="animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#2C2C2C', margin: 0 }}>
            <FileSpreadsheet size={24} style={{ verticalAlign: 'middle', marginRight: 8, color: '#2E7D32' }} />
            {lang === 'vi' ? 'Nhập/Xuất Dữ liệu' : 'Import/Export Data'}
          </h1>
          <p style={{ fontSize: 14, color: '#8D6E63', marginTop: 4 }}>
            {lang === 'vi' ? 'Nhập dữ liệu từ Excel template hoặc xuất template để điền' : 'Import data from Excel templates or export templates to fill'}
          </p>
        </div>
      </div>

      {/* Step 1: Download Template */}
      <div className="card" style={{ padding: '24px 28px', marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#3E2723', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 28, height: 28, borderRadius: '50%', background: '#2E7D32', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 }}>1</span>
          {lang === 'vi' ? 'Tải Template Excel' : 'Download Template'}
        </h2>
        <p style={{ fontSize: 13, color: '#8D6E63', marginBottom: 12 }}>
          {lang === 'vi' 
            ? 'File template có 24 sheet cho tất cả bảng dữ liệu. Mỗi sheet có hướng dẫn cột, loại dữ liệu và các trường bắt buộc.'
            : 'Template file has 24 sheets for all data tables. Each sheet has column guides, data types and required fields.'}
        </p>
        <button className="btn btn-primary" onClick={handleDownloadTemplate} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Download size={16} /> {lang === 'vi' ? 'Tải SAFEGIZ_Import_Templates_v9.xlsx' : 'Download Templates'}
        </button>
      </div>

      {/* Step 2: Select Collection */}
      <div className="card" style={{ padding: '24px 28px', marginBottom: 16, position: 'relative', zIndex: 10 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#3E2723', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 28, height: 28, borderRadius: '50%', background: '#E65100', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 }}>2</span>
          {lang === 'vi' ? 'Chọn bảng dữ liệu' : 'Select Collection'}
        </h2>
        
        <div style={{ position: 'relative', maxWidth: 400 }}>
          <button 
            onClick={() => setShowDropdown(!showDropdown)}
            style={{
              width: '100%', padding: '10px 16px', border: '2px solid #D7CCC8', borderRadius: 10,
              background: 'white', cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', fontSize: 14, fontWeight: 600, color: selectedCollection ? '#3E2723' : '#8D6E63',
            }}
          >
            <span>{selectedItem ? `${selectedItem.icon} ${lang === 'vi' ? selectedItem.label : selectedItem.labelEn} (${selectedItem.key})` : (lang === 'vi' ? 'Chọn bảng...' : 'Select table...')}</span>
            <ChevronDown size={16} />
          </button>
          {showDropdown && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
              background: 'white', border: '2px solid #D7CCC8', borderRadius: 10,
              maxHeight: 300, overflowY: 'auto', marginTop: 4, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            }}>
              {IMPORTABLE.map(c => (
                <div key={c.key}
                  onClick={() => { setSelectedCollection(c.key); setShowDropdown(false); }}
                  style={{
                    padding: '10px 16px', cursor: 'pointer', fontSize: 13,
                    background: selectedCollection === c.key ? '#E8F5E9' : 'transparent',
                    borderBottom: '1px solid #F5F0EB',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F5F0EB')}
                  onMouseLeave={e => (e.currentTarget.style.background = selectedCollection === c.key ? '#E8F5E9' : 'transparent')}
                >
                  {c.icon} <strong>{lang === 'vi' ? c.label : c.labelEn}</strong> <span style={{ color: '#A1887F', marginLeft: 4 }}>({c.key})</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Step 3: Upload File */}
      <div className="card" style={{ padding: '24px 28px', marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#3E2723', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 28, height: 28, borderRadius: '50%', background: '#1565C0', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 }}>3</span>
          {lang === 'vi' ? 'Tải file lên & Nhập' : 'Upload & Import'}
        </h2>
        
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileSelect} style={{ display: 'none' }} />
        
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn" onClick={() => fileRef.current?.click()}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F5F0EB', color: '#5D4037', border: '2px dashed #D7CCC8', padding: '10px 20px', borderRadius: 10, cursor: 'pointer', fontWeight: 600 }}
          >
            <Upload size={16} /> {lang === 'vi' ? 'Chọn file Excel/CSV' : 'Select Excel/CSV'}
          </button>
          
          {fileName && (
            <span style={{ fontSize: 13, color: '#5D4037', fontWeight: 600 }}>
              📄 {fileName}
            </span>
          )}
        </div>

        {/* Preview */}
        {preview && preview.rows.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 13, color: '#8D6E63', marginBottom: 8 }}>
              {lang === 'vi' ? `Xem trước: ${preview.rows.length} dòng, ${preview.headers.length} cột` : `Preview: ${preview.rows.length} rows, ${preview.headers.length} columns`}
            </div>
            <div style={{ overflowX: 'auto', maxHeight: 200, border: '1px solid #E8E0D8', borderRadius: 8 }}>
              <table style={{ fontSize: 12, width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '6px 10px', background: '#F5F0EB', position: 'sticky', top: 0 }}>#</th>
                    {preview.headers.slice(0, 8).map(h => (
                      <th key={h} style={{ padding: '6px 10px', background: '#F5F0EB', position: 'sticky', top: 0, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                    {preview.headers.length > 8 && <th style={{ padding: '6px 10px', background: '#F5F0EB' }}>+{preview.headers.length - 8}</th>}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.slice(0, 5).map((row, i) => (
                    <tr key={i}>
                      <td style={{ padding: '4px 10px', color: '#A1887F' }}>{i + 1}</td>
                      {preview.headers.slice(0, 8).map(h => (
                        <td key={h} style={{ padding: '4px 10px', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {String(row[h] || '')}
                        </td>
                      ))}
                      {preview.headers.length > 8 && <td style={{ color: '#A1887F' }}>...</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <button className="btn btn-primary" onClick={handleImport} disabled={!selectedCollection || importing}
              style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, opacity: (!selectedCollection || importing) ? 0.5 : 1 }}
            >
              {importing ? <Loader2 size={16} className="spin" /> : <Upload size={16} />}
              {importing 
                ? (lang === 'vi' ? 'Đang nhập...' : 'Importing...') 
                : (lang === 'vi' ? `Nhập ${preview.rows.length} dòng vào ${selectedCollection}` : `Import ${preview.rows.length} rows to ${selectedCollection}`)}
            </button>
          </div>
        )}
      </div>

      {/* Result */}
      {result && (
        <div className="card" style={{ padding: '24px 28px', borderLeft: `4px solid ${result.errors.length === 0 ? '#2E7D32' : '#E65100'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            {result.errors.length === 0 
              ? <CheckCircle size={24} style={{ color: '#2E7D32' }} />
              : <AlertTriangle size={24} style={{ color: '#E65100' }} />}
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: result.errors.length === 0 ? '#2E7D32' : '#E65100' }}>
              {lang === 'vi' ? 'Kết quả nhập dữ liệu' : 'Import Result'}
            </h3>
            <button onClick={() => setResult(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#A1887F' }}>
              <X size={18} />
            </button>
          </div>
          
          <div style={{ display: 'flex', gap: 24, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: '#8D6E63' }}>{lang === 'vi' ? 'Bảng' : 'Collection'}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#3E2723' }}>{result.collection}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#8D6E63' }}>{lang === 'vi' ? 'Tổng' : 'Total'}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#3E2723' }}>{result.total}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#8D6E63' }}>{lang === 'vi' ? 'Thành công' : 'Success'}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#2E7D32' }}>{result.success}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#8D6E63' }}>{lang === 'vi' ? 'Lỗi' : 'Errors'}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: result.errors.length > 0 ? '#C62828' : '#2E7D32' }}>{result.errors.length}</div>
            </div>
          </div>
          
          {result.errors.length > 0 && (
            <div style={{ background: '#FFF3E0', borderRadius: 8, padding: 12, maxHeight: 200, overflowY: 'auto' }}>
              {result.errors.slice(0, 20).map((err, i) => (
                <div key={i} style={{ fontSize: 12, color: '#E65100', padding: '2px 0', borderBottom: '1px solid #FFE0B2' }}>
                  {err}
                </div>
              ))}
              {result.errors.length > 20 && (
                <div style={{ fontSize: 12, color: '#BF360C', fontWeight: 700, marginTop: 4 }}>
                  +{result.errors.length - 20} {lang === 'vi' ? 'lỗi khác' : 'more errors'}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
