import { ReactNode } from 'react';

interface StatsCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative';
  color: 'green' | 'blue' | 'orange' | 'purple' | 'teal' | 'red';
}

export default function StatsCard({ icon, label, value, change, changeType = 'positive', color }: StatsCardProps) {
  return (
    <div className={`stat-card ${color}`}>
      <div className="stat-card-header">
        <div className={`stat-card-icon ${color}`}>{icon}</div>
        {change && (
          <span className={`stat-card-change ${changeType}`}>
            {changeType === 'positive' ? '↑' : '↓'} {change}
          </span>
        )}
      </div>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
    </div>
  );
}
