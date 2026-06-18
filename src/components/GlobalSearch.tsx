import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, X, Users, MapPin, FileCheck, ShieldCheck, GraduationCap, Package, Loader2 } from 'lucide-react';
import pb from '../lib/pocketbase';

interface SearchResult {
  id: string;
  category: string;
  title: string;
  subtitle: string;
  path: string;
  icon: React.ReactNode;
}

interface CategoryConfig {
  collection: string;
  labelVi: string;
  labelEn: string;
  icon: React.ReactNode;
  fields: string[];
  getTitle: (item: any) => string;
  getSubtitle: (item: any) => string;
  getPath: (item: any) => string;
}

const CATEGORIES: CategoryConfig[] = [
  {
    collection: 'farmers',
    labelVi: 'Nông dân',
    labelEn: 'Farmers',
    icon: <Users size={16} />,
    fields: ['full_name', 'code', 'phone', 'national_id'],
    getTitle: (item) => item.full_name || item.code,
    getSubtitle: (item) => [item.code, item.phone].filter(Boolean).join(' · '),
    getPath: (item) => `/farmers/${item.id}`,
  },
  {
    collection: 'farms',
    labelVi: 'Nông trại',
    labelEn: 'Farms',
    icon: <MapPin size={16} />,
    fields: ['plot_name', 'code'],
    getTitle: (item) => item.plot_name || item.code,
    getSubtitle: (item) => item.code || '',
    getPath: (item) => `/farms/${item.id}`,
  },
  {
    collection: 'risk_assessments',
    labelVi: 'Đánh giá rủi ro',
    labelEn: 'Risk Assessments',
    icon: <FileCheck size={16} />,
    fields: ['assessment_code'],
    getTitle: (item) => item.assessment_code,
    getSubtitle: () => '',
    getPath: (item) => `/eudr`,
  },
  {
    collection: 'eudr_compliance',
    labelVi: 'Tuân thủ EUDR',
    labelEn: 'EUDR Compliance',
    icon: <ShieldCheck size={16} />,
    fields: ['assessment_code'],
    getTitle: (item) => item.assessment_code,
    getSubtitle: () => '',
    getPath: (item) => `/eudr-compliance`,
  },
  {
    collection: 'training_sessions',
    labelVi: 'Đào tạo',
    labelEn: 'Training',
    icon: <GraduationCap size={16} />,
    fields: ['title', 'code'],
    getTitle: (item) => item.title || item.code,
    getSubtitle: (item) => item.code || '',
    getPath: (item) => `/training`,
  },
  {
    collection: 'support_distributions',
    labelVi: 'Hỗ trợ',
    labelEn: 'Support',
    icon: <Package size={16} />,
    fields: ['code'],
    getTitle: (item) => item.code,
    getSubtitle: () => '',
    getPath: (item) => `/support`,
  },
];

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setSelectedIndex(-1);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const searchAll = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const escaped = searchQuery.replace(/"/g, '\\"');
    const allResults: SearchResult[] = [];

    const promises = CATEGORIES.map(async (cat) => {
      try {
        const filterParts = cat.fields.map(f => `${f}~"${escaped}"`);
        const filter = filterParts.join(' || ');
        const res = await pb.collection(cat.collection).getList(1, 5, { filter });
        return res.items.map((item: any) => ({
          id: item.id,
          category: lang === 'vi' ? cat.labelVi : cat.labelEn,
          title: cat.getTitle(item),
          subtitle: cat.getSubtitle(item),
          path: cat.getPath(item),
          icon: cat.icon,
        }));
      } catch {
        return [];
      }
    });

    const settled = await Promise.allSettled(promises);
    settled.forEach((result) => {
      if (result.status === 'fulfilled') {
        allResults.push(...result.value);
      }
    });

    setResults(allResults);
    setSelectedIndex(-1);
    setLoading(false);
  }, [lang]);

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchAll(value), 300);
  };

  const handleSelect = (result: SearchResult) => {
    onClose();
    navigate(result.path);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0 && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    }
  };

  useEffect(() => {
    if (selectedIndex >= 0 && resultsRef.current) {
      const el = resultsRef.current.children[selectedIndex] as HTMLElement;
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.category]) acc[r.category] = [];
    acc[r.category].push(r);
    return acc;
  }, {});

  let flatIndex = -1;

  return (
    <div className="gs-overlay" onClick={onClose}>
      <div className="gs-modal" onClick={e => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div className="gs-input-wrap">
          <Search size={20} className="gs-input-icon" />
          <input
            ref={inputRef}
            type="text"
            className="gs-input"
            placeholder={lang === 'vi' ? 'Tìm kiếm nông dân, nông trại, đánh giá...' : 'Search farmers, farms, assessments...'}
            value={query}
            onChange={e => handleInputChange(e.target.value)}
          />
          {query && (
            <button className="gs-clear-btn" onClick={() => { setQuery(''); setResults([]); inputRef.current?.focus(); }}>
              <X size={16} />
            </button>
          )}
          <div className="gs-shortcut-badge">ESC</div>
        </div>

        <div className="gs-results" ref={resultsRef}>
          {loading && (
            <div className="gs-loading">
              <Loader2 size={20} className="gs-spinner" />
              <span>{lang === 'vi' ? 'Đang tìm kiếm...' : 'Searching...'}</span>
            </div>
          )}

          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <div className="gs-empty">
              <Search size={32} style={{ opacity: 0.3 }} />
              <span>{lang === 'vi' ? 'Không tìm thấy kết quả' : 'No results found'}</span>
            </div>
          )}

          {!loading && query.trim().length > 0 && query.trim().length < 2 && (
            <div className="gs-empty">
              <span>{lang === 'vi' ? 'Nhập ít nhất 2 ký tự để tìm kiếm' : 'Type at least 2 characters to search'}</span>
            </div>
          )}

          {!loading && Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="gs-group">
              <div className="gs-group-label">{category}</div>
              {items.map((item) => {
                flatIndex++;
                const idx = flatIndex;
                return (
                  <div
                    key={`${item.id}-${idx}`}
                    className={`gs-result-item ${selectedIndex === idx ? 'gs-result-active' : ''}`}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <div className="gs-result-icon">{item.icon}</div>
                    <div className="gs-result-text">
                      <div className="gs-result-title">{item.title}</div>
                      {item.subtitle && <div className="gs-result-sub">{item.subtitle}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {results.length > 0 && (
          <div className="gs-footer">
            <span>↑↓ {lang === 'vi' ? 'di chuyển' : 'navigate'}</span>
            <span>↵ {lang === 'vi' ? 'chọn' : 'select'}</span>
            <span>esc {lang === 'vi' ? 'đóng' : 'close'}</span>
          </div>
        )}
      </div>

      <style>{`
        .gs-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(62, 39, 35, 0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding-top: 10vh;
          animation: gs-fadeIn 0.15s ease;
        }
        @keyframes gs-fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes gs-slideIn { from { opacity: 0; transform: translateY(-12px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes gs-spin { to { transform: rotate(360deg); } }

        .gs-modal {
          width: 90%;
          max-width: 640px;
          background: #FFFFFF;
          border-radius: 16px;
          box-shadow: 0 25px 60px rgba(62, 39, 35, 0.3), 0 0 0 1px rgba(93, 64, 55, 0.08);
          overflow: hidden;
          animation: gs-slideIn 0.2s ease;
        }

        .gs-input-wrap {
          display: flex;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid #D7CCC8;
          gap: 12px;
        }
        .gs-input-icon { color: #8D6E63; flex-shrink: 0; }
        .gs-input {
          flex: 1;
          border: none;
          outline: none;
          font-size: 16px;
          color: #3E2723;
          background: transparent;
          font-family: inherit;
        }
        .gs-input::placeholder { color: #A1887F; }
        .gs-clear-btn {
          background: #EFEBE9;
          border: none;
          border-radius: 6px;
          padding: 4px;
          cursor: pointer;
          color: #5D4037;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .gs-clear-btn:hover { background: #D7CCC8; }
        .gs-shortcut-badge {
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 5px;
          background: #EFEBE9;
          color: #8D6E63;
          font-weight: 600;
          border: 1px solid #D7CCC8;
          flex-shrink: 0;
        }

        .gs-results {
          max-height: 400px;
          overflow-y: auto;
          padding: 8px 0;
        }
        .gs-results::-webkit-scrollbar { width: 6px; }
        .gs-results::-webkit-scrollbar-track { background: transparent; }
        .gs-results::-webkit-scrollbar-thumb { background: #D7CCC8; border-radius: 3px; }

        .gs-loading, .gs-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 32px 20px;
          color: #8D6E63;
          font-size: 14px;
        }
        .gs-empty { flex-direction: column; gap: 8px; }
        .gs-spinner { animation: gs-spin 0.8s linear infinite; }

        .gs-group { padding: 4px 0; }
        .gs-group-label {
          padding: 6px 20px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #A1887F;
        }

        .gs-result-item {
          display: flex;
          align-items: center;
          padding: 10px 20px;
          cursor: pointer;
          gap: 12px;
          transition: background 0.1s;
        }
        .gs-result-item:hover, .gs-result-active {
          background: #EFEBE9;
        }
        .gs-result-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: #D7CCC8;
          color: #5D4037;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .gs-result-active .gs-result-icon {
          background: #8D6E63;
          color: #FFFFFF;
        }
        .gs-result-text { min-width: 0; }
        .gs-result-title {
          font-size: 14px;
          font-weight: 600;
          color: #3E2723;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .gs-result-sub {
          font-size: 12px;
          color: #8D6E63;
          margin-top: 1px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .gs-footer {
          display: flex;
          gap: 16px;
          padding: 10px 20px;
          border-top: 1px solid #D7CCC8;
          background: #EFEBE9;
          justify-content: center;
        }
        .gs-footer span {
          font-size: 11px;
          color: #8D6E63;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}
