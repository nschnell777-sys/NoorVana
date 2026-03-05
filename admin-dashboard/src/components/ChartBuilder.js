import React, { useState, useMemo, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import {
  Box, Typography, FormControl, InputLabel, Select, MenuItem, Button, IconButton
} from '@mui/material';
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import { frostedCardSx, CHART_COLORS } from '../theme';

const TOOLTIP_STYLE = {
  backgroundColor: 'rgba(255,255,255,0.95)',
  border: '1px solid rgba(61,74,62,0.12)',
  borderRadius: '10px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
  fontSize: '13px'
};

const CHART_TYPES = [
  { value: 'bar', label: 'Bar Chart' },
  { value: 'line', label: 'Line / Area Chart' },
  { value: 'pie', label: 'Pie / Donut Chart' }
];

const PIE_PALETTE = [
  CHART_COLORS.primary, CHART_COLORS.secondary, CHART_COLORS.tertiary,
  '#cd7f32', '#c0c0c0', '#ffd700', '#b9f2ff', '#e5e4e2', '#C1592E', '#8B6F47'
];

// Multi-series metric definitions
const MULTI_SERIES = {
  tier_distribution: {
    series: [
      { key: 'bronze_clients', label: 'Bronze', color: '#cd7f32' },
      { key: 'silver_clients', label: 'Silver', color: '#c0c0c0' },
      { key: 'gold_clients', label: 'Gold', color: '#ffd700' },
      { key: 'platinum_clients', label: 'Platinum', color: '#e5e4e2' },
      { key: 'diamond_clients', label: 'Diamond', color: '#b9f2ff' }
    ]
  },
  care_package_mix: {
    series: [
      { key: 'essentials_clients', label: 'Essentials', color: CHART_COLORS.primary },
      { key: 'premium_clients', label: 'Premium', color: CHART_COLORS.secondary },
      { key: 'white_glove_clients', label: 'White Glove', color: CHART_COLORS.tertiary }
    ]
  }
};

const GEOGRAPHIC_FIELDS = [
  { key: 'clients', label: 'Total Clients', type: 'numeric' },
  { key: 'active_clients', label: 'Active Clients', type: 'numeric' },
  { key: 'revenue', label: 'Revenue', type: 'numeric' },
  { key: 'avg_revenue_per_client', label: 'Avg Revenue/Client', type: 'numeric' },
  { key: 'avg_tenure_days', label: 'Avg Duration (days)', type: 'numeric' },
  { key: 'tier_distribution', label: 'Tier Distribution', type: 'multi' },
  { key: 'care_package_mix', label: 'Care Package Mix', type: 'multi' }
];

const CLIENT_FIELDS = [
  { key: 'lifetime_points', label: 'Lifetime Points', type: 'numeric' },
  { key: 'redeemable_points', label: 'Redeemable Points', type: 'numeric' },
  { key: 'lifetime_revenue', label: 'Lifetime Revenue', type: 'numeric' },
  { key: 'duration_days', label: 'Tenure (days)', type: 'numeric' }
];

const CLIENT_GROUP_FIELDS = [
  { key: 'care_package', label: 'Care Package' },
  { key: 'current_tier', label: 'Tier' },
  { key: 'is_active', label: 'Active Status' }
];

const selectSx = {
  minWidth: 170,
  '& .MuiOutlinedInput-root': {
    borderRadius: '10px',
    backgroundColor: '#fff',
    fontSize: '14px',
    '& fieldset': { borderColor: 'rgba(61,74,62,0.15)' },
    '&:hover fieldset': { borderColor: 'rgba(61,74,62,0.3)' },
    '&.Mui-focused fieldset': { borderColor: '#3D4A3E' }
  },
  '& .MuiInputLabel-root': { fontSize: '13px', color: '#5C6B5E' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#3D4A3E' }
};

const fmtValue = (v, key) => {
  if (key === 'revenue' || key === 'avg_revenue_per_client' || key === 'lifetime_revenue') {
    return `$${(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return (v || 0).toLocaleString();
};

const SingleChart = ({ config, data, level, onUpdate, onToggleReport, onRemove, chartIndex }) => {
  const { chartType, yAxis, groupBy, addedToReport } = config;
  const isTerritory = level === 'territory';
  const yFields = isTerritory ? CLIENT_FIELDS : GEOGRAPHIC_FIELDS;
  const groupFields = isTerritory ? CLIENT_GROUP_FIELDS : [];
  const multiDef = MULTI_SERIES[yAxis];

  // Build chart data — multi-series passes breakdown rows with all sub-keys
  const chartData = useMemo(() => {
    if (!yAxis) return [];

    if (multiDef) {
      const source = data?.breakdown || [];
      if (source.length === 0) return [];
      return source.map(item => {
        const row = { label: String(item.name || '').replace('_', ' ') };
        multiDef.series.forEach(s => { row[s.key] = parseInt(item[s.key], 10) || 0; });
        return row;
      });
    }

    const source = isTerritory ? (data?.clients || []) : (data?.breakdown || []);
    if (source.length === 0) return [];

    if (chartType === 'pie') {
      const groupKey = isTerritory ? (groupBy || 'current_tier') : 'name';
      const grouped = {};
      source.forEach(item => {
        const key = String(item[groupKey] || 'Unknown').replace('_', ' ');
        grouped[key] = (grouped[key] || 0) + (parseFloat(item[yAxis]) || 0);
      });
      return Object.entries(grouped).map(([name, value]) => ({ name, value }));
    }

    return source.map(item => ({
      label: String(item[isTerritory ? 'name' : 'name'] || '').replace('_', ' '),
      value: parseFloat(item[yAxis]) || 0
    }));
  }, [data, isTerritory, chartType, yAxis, groupBy, multiDef]);

  const yLabel = yFields.find(f => f.key === yAxis)?.label || 'Value';
  const hasChart = chartData.length > 0;

  const renderChart = () => {
    if (!hasChart) return null;

    // Multi-series: grouped bar chart
    if (multiDef) {
      return (
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(61,74,62,0.08)" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#5C6B5E' }} axisLine={{ stroke: 'rgba(61,74,62,0.12)' }} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#5C6B5E' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} formatter={(value) => <span style={{ color: '#2D2D2D' }}>{value}</span>} />
            {multiDef.series.map(s => (
              <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id={`cbBarGrad${chartIndex}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.9} />
                <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0.4} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(61,74,62,0.08)" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#5C6B5E' }} axisLine={{ stroke: 'rgba(61,74,62,0.12)' }} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#5C6B5E' }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtValue(v, yAxis)} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => [fmtValue(value, yAxis), yLabel]} />
            <Bar dataKey="value" fill={`url(#cbBarGrad${chartIndex})`} radius={[6, 6, 0, 0]} barSize={40} />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'line') {
      return (
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id={`cbAreaGrad${chartIndex}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.tertiary} stopOpacity={0.3} />
                <stop offset="95%" stopColor={CHART_COLORS.tertiary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(61,74,62,0.08)" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#5C6B5E' }} axisLine={{ stroke: 'rgba(61,74,62,0.12)' }} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#5C6B5E' }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtValue(v, yAxis)} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => [fmtValue(value, yAxis), yLabel]} />
            <Area
              type="monotone" dataKey="value" stroke={CHART_COLORS.tertiary}
              strokeWidth={2.5} fill={`url(#cbAreaGrad${chartIndex})`} name={yLabel}
              dot={{ r: 3, fill: '#fff', stroke: CHART_COLORS.tertiary, strokeWidth: 2 }}
              activeDot={{ r: 5, strokeWidth: 2, fill: '#fff' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'pie') {
      return (
        <ResponsiveContainer width="100%" height={320}>
          <PieChart>
            <Pie
              data={chartData} dataKey="value" nameKey="name"
              cx="50%" cy="45%" innerRadius={50} outerRadius={100}
              paddingAngle={3} cornerRadius={5} stroke="none"
            >
              {chartData.map((_, i) => <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />)}
            </Pie>
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => [fmtValue(value, yAxis), yLabel]} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} formatter={(value) => <span style={{ color: '#2D2D2D' }}>{value}</span>} />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    return null;
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Hide chart type for multi-series (always grouped bar) */}
          {!multiDef && (
            <FormControl size="small" sx={selectSx}>
              <InputLabel>Chart Type</InputLabel>
              <Select value={chartType} onChange={(e) => onUpdate({ chartType: e.target.value })} label="Chart Type">
                {CHART_TYPES.map(ct => (
                  <MenuItem key={ct.value} value={ct.value}>{ct.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <FormControl size="small" sx={selectSx}>
            <InputLabel>Metric</InputLabel>
            <Select value={yAxis} onChange={(e) => onUpdate({ yAxis: e.target.value })} label="Metric">
              <MenuItem value="">Select...</MenuItem>
              {yFields.map(f => (
                <MenuItem key={f.key} value={f.key}>{f.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {chartType === 'pie' && isTerritory && !multiDef && (
            <FormControl size="small" sx={selectSx}>
              <InputLabel>Group By</InputLabel>
              <Select value={groupBy || ''} onChange={(e) => onUpdate({ groupBy: e.target.value })} label="Group By">
                {groupFields.map(f => (
                  <MenuItem key={f.key} value={f.key}>{f.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {hasChart && (
            <Button
              size="small"
              startIcon={addedToReport ? <CheckCircleIcon /> : <AddCircleOutlineIcon />}
              onClick={() => onToggleReport()}
              sx={{
                fontWeight: 600, fontSize: '12px', textTransform: 'none',
                color: addedToReport ? '#5A8A7A' : '#D4956A',
                backgroundColor: addedToReport ? 'rgba(90,138,122,0.08)' : 'transparent',
                '&:hover': { backgroundColor: addedToReport ? 'rgba(90,138,122,0.15)' : 'rgba(212,149,106,0.08)' }
              }}
            >
              {addedToReport ? 'Added to Report' : 'Add to Report'}
            </Button>
          )}
          {chartIndex > 0 && (
            <IconButton size="small" onClick={onRemove} sx={{ color: '#C1592E' }}>
              <RemoveCircleOutlineIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      </Box>

      {hasChart ? (
        <Box sx={{ height: 320 }}>
          {renderChart()}
        </Box>
      ) : (
        <Box sx={{ height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px', backgroundColor: 'rgba(61,74,62,0.03)' }}>
          <Typography variant="body2" sx={{ color: '#5C6B5E' }}>
            Select a chart type and metric to generate a chart
          </Typography>
        </Box>
      )}
    </Box>
  );
};

const ChartBuilder = forwardRef(({ data, level }, ref) => {
  const [charts, setCharts] = useState([{ id: 0, chartType: 'bar', yAxis: '', groupBy: 'current_tier', addedToReport: false }]);
  const reportContainerRef = useRef(null);

  // Expose report container ref to parent
  useImperativeHandle(ref, () => ({
    getReportContainer: () => reportContainerRef.current,
    getReportCharts: () => charts.filter(c => c.addedToReport)
  }));

  // Reset yAxis when level changes (fields change)
  useEffect(() => {
    setCharts(prev => prev.map(c => ({ ...c, yAxis: '', addedToReport: false })));
  }, [level]);

  const isTerritory = level === 'territory';

  const handleUpdate = (id, updates) => {
    setCharts(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const handleToggleReport = (id) => {
    setCharts(prev => prev.map(c => c.id === id ? { ...c, addedToReport: !c.addedToReport } : c));
  };

  const handleRemove = (id) => {
    setCharts(prev => prev.filter(c => c.id !== id));
  };

  const handleAddMore = () => {
    setCharts(prev => [...prev, { id: Date.now(), chartType: 'bar', yAxis: '', groupBy: 'current_tier', addedToReport: false }]);
  };

  const reportCharts = charts.filter(c => c.addedToReport && c.yAxis);

  // Build chart data for a config (for hidden report rendering)
  const buildChartData = (config) => {
    if (!config.yAxis) return [];
    const multiDef = MULTI_SERIES[config.yAxis];

    if (multiDef) {
      const source = data?.breakdown || [];
      if (source.length === 0) return [];
      return source.map(item => {
        const row = { label: String(item.name || '').replace('_', ' ') };
        multiDef.series.forEach(s => { row[s.key] = parseInt(item[s.key], 10) || 0; });
        return row;
      });
    }

    const source = isTerritory ? (data?.clients || []) : (data?.breakdown || []);
    if (source.length === 0) return [];

    if (config.chartType === 'pie') {
      const groupKey = isTerritory ? (config.groupBy || 'current_tier') : 'name';
      const grouped = {};
      source.forEach(item => {
        const key = String(item[groupKey] || 'Unknown').replace('_', ' ');
        grouped[key] = (grouped[key] || 0) + (parseFloat(item[config.yAxis]) || 0);
      });
      return Object.entries(grouped).map(([name, value]) => ({ name, value }));
    }

    return source.map(item => ({
      label: String(item.name || '').replace('_', ' '),
      value: parseFloat(item[config.yAxis]) || 0
    }));
  };

  const yFields = isTerritory ? CLIENT_FIELDS : GEOGRAPHIC_FIELDS;

  return (
    <>
      <Box sx={{ ...frostedCardSx, p: 3, '&:hover': { transform: 'none' } }}>
        <Typography variant="h6" sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600, mb: 2 }}>
          Custom Chart Builder
        </Typography>

        {charts.map((config, idx) => (
          <SingleChart
            key={config.id}
            config={config}
            data={data}
            level={level}
            chartIndex={idx}
            onUpdate={(updates) => handleUpdate(config.id, updates)}
            onToggleReport={() => handleToggleReport(config.id)}
            onRemove={() => handleRemove(config.id)}
          />
        ))}

        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
          <Button
            startIcon={<AddCircleOutlineIcon />}
            onClick={handleAddMore}
            sx={{
              color: '#3D4A3E', fontWeight: 600, fontSize: '13px', textTransform: 'none',
              '&:hover': { backgroundColor: 'rgba(61,74,62,0.06)' }
            }}
          >
            Add More Charts
          </Button>
        </Box>
      </Box>

      {/* Hidden container for PDF capture of custom charts */}
      <div
        ref={reportContainerRef}
        style={{ position: 'absolute', left: '-9999px', top: 0, width: '800px', background: '#fff' }}
      >
        {reportCharts.map((config, idx) => {
          const chartData = buildChartData(config);
          const yLabel = yFields.find(f => f.key === config.yAxis)?.label || 'Value';
          const multiDef = MULTI_SERIES[config.yAxis];
          if (chartData.length === 0) return null;

          return (
            <div key={config.id} data-custom-chart={idx} style={{ width: 720, height: 280, padding: '10px 20px', background: '#fff' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#2D2D2D', marginBottom: 4 }}>
                {multiDef ? 'Grouped Bar Chart' : CHART_TYPES.find(t => t.value === config.chartType)?.label}: {yLabel}
              </div>
              {multiDef ? (
                <BarChart width={680} height={240} data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(61,74,62,0.08)" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#5C6B5E' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#5C6B5E' }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                  {multiDef.series.map(s => (
                    <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  ))}
                </BarChart>
              ) : config.chartType === 'bar' ? (
                <BarChart width={680} height={240} data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id={`pdfCbBar${idx}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.9} />
                      <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0.4} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(61,74,62,0.08)" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#5C6B5E' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#5C6B5E' }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill={`url(#pdfCbBar${idx})`} radius={[6, 6, 0, 0]} barSize={36} isAnimationActive={false} />
                </BarChart>
              ) : config.chartType === 'line' ? (
                <AreaChart width={680} height={240} data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id={`pdfCbArea${idx}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.tertiary} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={CHART_COLORS.tertiary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(61,74,62,0.08)" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#5C6B5E' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#5C6B5E' }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="value" stroke={CHART_COLORS.tertiary} strokeWidth={2} fill={`url(#pdfCbArea${idx})`} dot={false} isAnimationActive={false} />
                </AreaChart>
              ) : config.chartType === 'pie' ? (
                <PieChart width={680} height={240}>
                  <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="45%" innerRadius={35} outerRadius={75} paddingAngle={3} cornerRadius={5} stroke="none" isAnimationActive={false}>
                    {chartData.map((_, i) => <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                </PieChart>
              ) : null}
            </div>
          );
        })}
      </div>
    </>
  );
});

ChartBuilder.displayName = 'ChartBuilder';

export default ChartBuilder;
