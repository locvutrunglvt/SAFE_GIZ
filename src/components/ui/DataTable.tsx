import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

interface Column {
  key: string;
  label: string;
  render?: (value: unknown, row: Record<string, unknown>) => ReactNode;
}

interface DataTableProps {
  columns: Column[];
  data: Record<string, unknown>[];
  searchPlaceholder?: string;
}

export default function DataTable({ columns, data, searchPlaceholder }: DataTableProps) {
  const { t } = useTranslation();

  return (
    <div className="data-table-container">
      {/* Toolbar */}
      <div className="data-table-toolbar">
        <div className="data-table-search">
          <Search size={16} className="data-table-search-icon" />
          <input
            className="input-field"
            placeholder={searchPlaceholder || t('common.search')}
            type="text"
          />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm">{t('common.filter')}</button>
          <button className="btn btn-secondary btn-sm">{t('common.export')}</button>
        </div>
      </div>

      {/* Table */}
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
            <th style={{ textAlign: 'right' }}>{t('common.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? (
            data.map((row, idx) => (
              <tr key={idx}
                onClick={() => typeof row._onClick === 'function' && (row._onClick as () => void)()}
                style={{ cursor: typeof row._onClick === 'function' ? 'pointer' : 'default' }}
              >
                {columns.map((col) => (
                  <td key={col.key}>
                    {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '')}
                  </td>
                ))}
                <td style={{ textAlign: 'right' }}>
                  <button className="btn btn-ghost btn-sm">{t('common.view')}</button>
                  <button className="btn btn-ghost btn-sm">{t('common.edit')}</button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length + 1} style={{ textAlign: 'center', padding: '48px' }}>
                <div style={{ color: 'var(--color-text-muted)' }}>{t('common.noData')}</div>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Footer */}
      <div className="data-table-footer">
        <span>
          {t('common.showing')} {data.length} {t('common.records')}
        </span>
        <div className="pagination">
          <button className="pagination-btn">
            <ChevronLeft size={14} />
          </button>
          <button className="pagination-btn active">1</button>
          <button className="pagination-btn">2</button>
          <button className="pagination-btn">3</button>
          <button className="pagination-btn">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
