import React from 'react';
import {
  PieChart, Pie, Cell, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import { CHART_COLORS } from '../theme';

const TIER_COLORS = {
  bronze: '#cd7f32', silver: '#c0c0c0', gold: '#ffd700',
  platinum: '#e5e4e2', diamond: '#b9f2ff'
};

const PKG_COLORS = {
  essentials: '#3D4A3E',
  premium: '#D4956A',
  white_glove: '#5A8A7A'
};

const TOOLTIP_STYLE = {
  backgroundColor: 'rgba(255,255,255,0.95)',
  border: '1px solid rgba(61,74,62,0.12)',
  borderRadius: '10px',
  fontSize: '12px'
};

const fmtCurrency = (v) => `$${(v || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const MarketReportLayout = React.forwardRef(({ trendData, tierData, pkgData }, ref) => {
  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        left: '-9999px',
        top: 0,
        width: '800px',
        background: '#fff',
        fontFamily: 'Helvetica, Arial, sans-serif'
      }}
    >
      {/* Revenue Trend */}
      <div data-chart="revenue-trend" style={{ width: 760, height: 280, padding: '10px 20px', background: '#fff' }}>
        {trendData && trendData.length > 0 ? (
          <AreaChart width={720} height={260} data={trendData}>
            <defs>
              <linearGradient id="pdfGradRev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.tertiary} stopOpacity={0.3} />
                <stop offset="95%" stopColor={CHART_COLORS.tertiary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(61,74,62,0.08)" />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#5C6B5E' }} axisLine={{ stroke: 'rgba(61,74,62,0.12)' }} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#5C6B5E' }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => [fmtCurrency(value), 'Revenue']} />
            <Area
              type="monotone" dataKey="revenue" stroke={CHART_COLORS.tertiary}
              strokeWidth={2.5} fill="url(#pdfGradRev)" name="Revenue"
              dot={false} isAnimationActive={false}
            />
          </AreaChart>
        ) : (
          <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5C6B5E' }}>
            No trend data
          </div>
        )}
      </div>

      {/* Tier Distribution */}
      <div data-chart="tier-distribution" style={{ width: 380, height: 280, padding: '10px 20px', background: '#fff', display: 'inline-block' }}>
        {tierData && tierData.length > 0 ? (
          <PieChart width={340} height={260}>
            <Pie
              data={tierData} dataKey="value" nameKey="name"
              cx="50%" cy="45%" innerRadius={35} outerRadius={70}
              paddingAngle={3} cornerRadius={5} stroke="none"
              isAnimationActive={false}
            >
              {tierData.map((entry, i) => <Cell key={i} fill={entry.color || TIER_COLORS[entry.name?.toLowerCase()] || '#ccc'} />)}
            </Pie>
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
          </PieChart>
        ) : (
          <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5C6B5E' }}>
            No data
          </div>
        )}
      </div>

      {/* Care Package Mix */}
      <div data-chart="care-package" style={{ width: 380, height: 280, padding: '10px 20px', background: '#fff', display: 'inline-block' }}>
        {pkgData && pkgData.length > 0 ? (
          <BarChart width={340} height={260} data={pkgData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              {pkgData.map((entry, i) => (
                <linearGradient key={`pdfPkgGrad${i}`} id={`pdfPkgGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={entry.color || PKG_COLORS[entry.name?.toLowerCase()] || '#999'} stopOpacity={0.9} />
                  <stop offset="95%" stopColor={entry.color || PKG_COLORS[entry.name?.toLowerCase()] || '#999'} stopOpacity={0.4} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(61,74,62,0.08)" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#5C6B5E' }} axisLine={{ stroke: 'rgba(61,74,62,0.12)' }} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#5C6B5E' }} axisLine={false} tickLine={false} allowDecimals={false} domain={[0, (dataMax) => Math.ceil(dataMax * 2)]} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => [`${value} clients`, 'Count']} />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40} isAnimationActive={false}>
              {pkgData.map((entry, i) => <Cell key={i} fill={`url(#pdfPkgGrad${i})`} />)}
            </Bar>
          </BarChart>
        ) : (
          <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5C6B5E' }}>
            No data
          </div>
        )}
      </div>
    </div>
  );
});

MarketReportLayout.displayName = 'MarketReportLayout';

export default MarketReportLayout;
