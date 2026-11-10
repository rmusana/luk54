import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Chart, registerables } from 'chart.js';
import { supabase } from '../../lib/supabaseClient.js';
import { audit } from '../../lib/audit.js';
import { formatDate, formatNumber, todayEAT } from '../../lib/format.js';
import { canWrite } from '../../lib/finance.js';
import { Badge, DataTable, EmptyState, Field, Modal, useConfirm, useToast } from '../../components/ui.jsx';
import { Icon } from '../../components/shell.jsx';

Chart.register(...registerables);

const PROJECT = 'LUK54';
const READINGS_PER_PAGE = 10;
const SPARK_RANGES = [
  { value: 7, label: '7D' },
  { value: 30, label: '30D' },
  { value: 90, label: '90D' },
  { value: 'all', label: 'All' },
];
const BLOCK_COLORS = ['#1a7a45', '#2563eb', '#d97706', '#7c3aed', '#dc2626', '#0891b2', '#65a30d', '#db2777'];

const n = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const dateKey = (value) => {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value || '').slice(0, 10);
};

const monthShort = (value) => new Date(value + 'T00:00:00Z')
  .toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });

const totalEggs = (row) => n(row.production_trays) * 30 + n(row.unbundled_eggs);

const pctChange = (current, previous) => (previous > 0 ? ((current - previous) / previous) * 100 : null);

const signedPct = (value, digits = 1) => {
  if (value == null) return '—';
  return (value > 0 ? '+' : '') + Number(value).toFixed(digits) + '%';
};

const signedEggs = (value) => {
  if (value == null) return '—';
  return (value > 0 ? '+' : '') + formatNumber(value);
};

const trays = (eggs) => n(eggs) / 30;

const formatTrays = (eggs, digits = 1) => formatNumber(trays(eggs), digits);

const signedTrays = (eggs) => {
  if (eggs == null) return '—';
  const value = trays(eggs);
  return (value > 0 ? '+' : '') + formatNumber(value, 1);
};

const pctClass = (value) => {
  if (value == null) return 'growth-flat';
  return value > 0 ? 'growth-up' : value < 0 ? 'growth-down' : 'growth-flat';
};

function BlockSparkline({ dates, values, color, max }) {
  if (!dates.length) return null;
  const width = 200;
  const height = 40;
  const pad = 3;
  const usable = height - pad * 2;
  const xFor = (index) => (dates.length === 1 ? width / 2 : (index / (dates.length - 1)) * width);
  const yFor = (value) => height - pad - (max > 0 ? (value / max) * usable : 0);
  let path = '';
  let drawing = false;
  let lastIndex = -1;
  let lastValue = null;
  dates.forEach((date, index) => {
    const value = values[date];
    if (value == null) {
      drawing = false;
      return;
    }
    const x = xFor(index);
    const y = yFor(value);
    path += (drawing ? ' L ' : ' M ') + x.toFixed(1) + ' ' + y.toFixed(1);
    drawing = true;
    lastIndex = index;
    lastValue = value;
  });
  return (
    <svg className="growth-spark" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="Daily production sparkline">
      <line x1="0" y1={height - pad} x2={width} y2={height - pad} className="growth-spark-base" />
      {path && (
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      )}
      {lastIndex >= 0 && <circle cx={xFor(lastIndex)} cy={yFor(lastValue)} r="2.5" fill={color} />}
    </svg>
  );
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function weekStartKey(dateStr) {
  const key = dateKey(dateStr);
  const d = new Date(key + 'T00:00:00Z');
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - ((day + 6) % 7));
  return d.toISOString().slice(0, 10);
}

function weekLabel(startKey) {
  return formatDate(startKey) + ' – ' + formatDate(addDays(startKey, 6));
}

function buildSeries(rows) {
  const sorted = [...rows].sort((a, b) => dateKey(a.date).localeCompare(dateKey(b.date)));
  let previousTotal = null;
  return sorted.map((row) => {
    const total = totalEggs(row);
    const hasPrevious = previousTotal != null;
    const eggDelta = hasPrevious ? total - previousTotal : null;
    const dailyPct = hasPrevious ? pctChange(total, previousTotal) : null;
    const result = {
      ...row,
      date: dateKey(row.date),
      total,
      eggDelta,
      dailyPct,
      hasPrevious,
      isDecrement: dailyPct != null && dailyPct < 0,
      isIncrement: dailyPct != null && dailyPct > 0,
    };
    previousTotal = total;
    return result;
  });
}

function buildWeekly(series, block) {
  const groups = new Map();
  series.forEach((row) => {
    const key = weekStartKey(row.date);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  });
  const weeks = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  let previousClosing = null;
  return weeks.map(([weekStart, rows]) => {
    const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
    const opening = sorted[0].total;
    const closing = sorted[sorted.length - 1].total;
    const netEggs = closing - opening;
    const netPct = pctChange(closing, opening);
    const wowPct = previousClosing != null ? pctChange(closing, previousClosing) : null;
    const daily = sorted.map((row) => row.dailyPct).filter((value) => value != null);
    const incrementDays = daily.filter((value) => value > 0).length;
    const decrementDays = daily.filter((value) => value < 0).length;
    let status = 'flat';
    if (netEggs < 0) status = 'decline';
    else if (netEggs > 0) status = decrementDays > 0 ? 'mixed' : 'growth';
    else if (incrementDays > 0 && decrementDays > 0) status = 'mixed';
    const result = {
      id: block.id + ':' + weekStart,
      weekStart,
      weekEnd: addDays(weekStart, 6),
      weekLabel: weekLabel(weekStart),
      blockId: block.id,
      blockName: block.name,
      blockColor: block.color,
      blockSort: block.sort_order,
      opening,
      closing,
      netEggs,
      netPct,
      wowPct,
      status,
    };
    previousClosing = closing;
    return result;
  });
}

function weekStatusMeta(status) {
  if (status === 'decline') return { tone: 'critical', label: 'Decline', icon: Icon.trendDown };
  if (status === 'mixed') return { tone: 'caution', label: 'Mixed', icon: Icon.warn };
  if (status === 'growth') return { tone: 'positive', label: 'Growth', icon: Icon.trendUp };
  return { tone: 'neutral', label: 'Flat', icon: Icon.minus };
}

function nextBlockName(blocks) {
  const used = new Set(blocks.map((block) => String(block.name || '').trim().toUpperCase()));
  for (let code = 67; code <= 90; code += 1) {
    const name = String.fromCharCode(code);
    if (!used.has(name)) return name;
  }
  return 'Block ' + (blocks.length + 1);
}

function buildColorMap(blocks) {
  const map = {};
  blocks.forEach((block, index) => {
    map[block.id] = BLOCK_COLORS[index % BLOCK_COLORS.length];
  });
  return map;
}

export function ProductionTrackingSec({ role, setActions }) {
  const toast = useToast();
  const confirm = useConfirm();
  const writable = canWrite(role, 'production');
  const [blocks, setBlocks] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [setupError, setSetupError] = useState('');
  const [selectedBlock, setSelectedBlock] = useState('all');
  const [readingPage, setReadingPage] = useState(1);
  const [sparkRange, setSparkRange] = useState(30);
  const [entryForm, setEntryForm] = useState({ open: false, entry: null });
  const [blockForm, setBlockForm] = useState({ open: false, block: null });
  const [blockManagerOpen, setBlockManagerOpen] = useState(false);
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const mixChartRef = useRef(null);
  const mixChartInstance = useRef(null);

  async function load() {
    setLoading(true);
    setSetupError('');
    const [blockRes, entryRes] = await Promise.all([
      supabase.from('growth_blocks').select('*').eq('project_id', PROJECT).order('sort_order', { ascending: true }).order('name', { ascending: true }),
      supabase.from('growth_rate_entries').select('*').eq('project_id', PROJECT).order('date', { ascending: true }).limit(5000),
    ]);
    const error = blockRes.error || entryRes.error;
    if (error) {
      if (error.code === '42P01' || /does not exist/i.test(error.message || '')) {
        setSetupError('Production Tracking tables are not initialized. Apply supabase/migrations/010_growth_rate.sql.');
      } else {
        toast('error', error.message);
      }
      setBlocks([]);
      setEntries([]);
    } else {
      setBlocks(blockRes.data || []);
      setEntries(entryRes.data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    return () => setActions(null);
  }, [setActions]);

  useEffect(() => {
    if (!writable || setupError) {
      setActions(null);
      return;
    }
    setActions(
      <>
        <button className="btn btn-primary btn-sm" disabled={!blocks.length} onClick={() => setEntryForm({ open: true, entry: null })}>
          <span className="btn-icon">{Icon.plus}</span>
          Add entry
        </button>
        <button className="btn btn-secondary btn-sm" onClick={() => setBlockForm({ open: true, block: null })}>
          <span className="btn-icon">{Icon.layers}</span>
          Add block
        </button>
        <button className="btn btn-secondary btn-sm" onClick={() => setBlockManagerOpen(true)}>
          <span className="btn-icon">{Icon.sliders}</span>
          Manage blocks
        </button>
      </>
    );
  }, [writable, setupError, blocks.length, setActions]);

  const colorByBlock = useMemo(() => buildColorMap(blocks), [blocks]);

  const activeBlock = selectedBlock === 'all' || blocks.some((block) => block.id === selectedBlock) ? selectedBlock : 'all';

  const seriesByBlock = useMemo(() => {
    const map = {};
    blocks.forEach((block) => {
      map[block.id] = buildSeries(entries.filter((entry) => entry.block_id === block.id));
    });
    return map;
  }, [blocks, entries]);

  const allSeries = useMemo(() => blocks.flatMap((block) => (seriesByBlock[block.id] || []).map((row) => ({
    ...row,
    blockName: block.name,
    blockColor: colorByBlock[block.id],
    blockSort: block.sort_order,
  }))), [blocks, seriesByBlock, colorByBlock]);

  const entryCounts = useMemo(() => entries.reduce((map, row) => {
    map[row.block_id] = (map[row.block_id] || 0) + 1;
    return map;
  }, {}), [entries]);

  const displayEntries = useMemo(() => {
    const rows = activeBlock === 'all' ? allSeries : allSeries.filter((row) => row.block_id === activeBlock);
    return [...rows].sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return (a.blockSort || 0) - (b.blockSort || 0);
    });
  }, [allSeries, activeBlock]);

  useEffect(() => {
    setReadingPage(1);
  }, [activeBlock]);

  const readingPageCount = Math.max(1, Math.ceil(displayEntries.length / READINGS_PER_PAGE));
  const currentReadingPage = Math.min(readingPage, readingPageCount);
  const pagedEntries = displayEntries.slice(
    (currentReadingPage - 1) * READINGS_PER_PAGE,
    currentReadingPage * READINGS_PER_PAGE
  );

  const sparkData = useMemo(() => {
    const lastDate = allSeries.reduce((latest, row) => (!latest || row.date > latest ? row.date : latest), '');
    const cutoff = sparkRange === 'all' || !lastDate ? '' : addDays(lastDate, -(sparkRange - 1));
    const dateSet = new Set();
    allSeries.forEach((row) => {
      if (!cutoff || row.date >= cutoff) dateSet.add(row.date);
    });
    const dates = [...dateSet].sort();
    let max = 0;
    const blockData = blocks.map((block) => {
      const series = (seriesByBlock[block.id] || []).filter((row) => !cutoff || row.date >= cutoff);
      const values = {};
      series.forEach((row) => {
        const value = trays(row.total);
        values[row.date] = value;
        if (value > max) max = value;
      });
      return { block, values, latest: series.length ? series[series.length - 1] : null };
    });
    return { dates, max, blockData };
  }, [allSeries, blocks, seriesByBlock, sparkRange]);

  const heatData = useMemo(() => {
    const rows = activeBlock === 'all' ? allSeries : allSeries.filter((row) => row.block_id === activeBlock);
    if (!rows.length) return null;
    const lastDate = rows.reduce((latest, row) => (!latest || row.date > latest ? row.date : latest), '');
    const start = weekStartKey(addDays(lastDate, -83));
    const byDate = new Map();
    rows.forEach((row) => byDate.set(row.date, (byDate.get(row.date) || 0) + row.total));
    const days = [];
    let max = 0;
    for (let i = 0; i < 84; i += 1) {
      const date = addDays(start, i);
      const value = byDate.has(date) ? byDate.get(date) : null;
      if (value != null && value > max) max = value;
      days.push({ date, value });
    }
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
    return { weeks, max, lastDate };
  }, [allSeries, activeBlock]);

  const weeklyRows = useMemo(() => {
    const rows = blocks.flatMap((block) => buildWeekly(seriesByBlock[block.id] || [], { ...block, color: colorByBlock[block.id] }));
    const filtered = activeBlock === 'all' ? rows : rows.filter((row) => row.blockId === activeBlock);
    return filtered.sort((a, b) => {
      const weekCompare = b.weekStart.localeCompare(a.weekStart);
      if (weekCompare !== 0) return weekCompare;
      return (a.blockSort || 0) - (b.blockSort || 0);
    });
  }, [blocks, seriesByBlock, colorByBlock, activeBlock]);

  const weeklyWeekCount = new Set(weeklyRows.map((row) => row.weekStart)).size;

  const latestReadings = useMemo(() => blocks.map((block) => {
    const series = seriesByBlock[block.id] || [];
    return series.length ? series[series.length - 1] : null;
  }).filter(Boolean), [blocks, seriesByBlock]);

  const currentEggsTotal = Math.max(0, Math.round(latestReadings.reduce((sum, row) => sum + row.total, 0)));
  const latestDate = latestReadings.reduce((latest, row) => (!latest || row.date > latest ? row.date : latest), '');
  const sevenDaysAgo = addDays(todayEAT(), -6);
  const recentFlags = useMemo(() => allSeries
    .filter((row) => row.isDecrement && row.date >= sevenDaysAgo)
    .sort((a, b) => b.date.localeCompare(a.date)), [allSeries, sevenDaysAgo]);
  const growthDays = useMemo(() => allSeries.filter((row) => row.isIncrement && row.date >= sevenDaysAgo).length, [allSeries, sevenDaysAgo]);

  const chartHasData = activeBlock === 'all'
    ? blocks.some((block) => (seriesByBlock[block.id] || []).length > 0)
    : (seriesByBlock[activeBlock] || []).length > 0;
  const mixHasData = blocks.some((block) => (seriesByBlock[block.id] || []).length > 0);

  useEffect(() => {
    if (chartInstance.current) {
      chartInstance.current.destroy();
      chartInstance.current = null;
    }
    if (loading || setupError || !chartHasData) return;
    const canvas = chartRef.current;
    if (!canvas) return;
    const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    Chart.defaults.color = css('--color-text-secondary') || '#a9b6b0';
    Chart.defaults.borderColor = css('--color-border') || '#26332e';
    const ctx = canvas.getContext('2d');
    let labels = [];
    let datasets = [];
    if (activeBlock === 'all') {
      const dateSet = new Set();
      blocks.forEach((block) => (seriesByBlock[block.id] || []).forEach((row) => dateSet.add(row.date)));
      labels = [...dateSet].sort();
      datasets = blocks.filter((block) => (seriesByBlock[block.id] || []).length).map((block) => {
        const byDate = new Map((seriesByBlock[block.id] || []).map((row) => [row.date, row]));
        return {
          label: block.name,
          data: labels.map((date) => {
            const row = byDate.get(date);
            return row ? trays(row.total) : null;
          }),
          borderColor: colorByBlock[block.id],
          backgroundColor: colorByBlock[block.id] + '18',
          fill: false,
          tension: 0.32,
          pointRadius: 2,
          pointHoverRadius: 5,
          borderWidth: 2,
          spanGaps: true,
          yAxisID: 'y',
        };
      });
    } else {
      const series = seriesByBlock[activeBlock] || [];
      labels = series.map((row) => row.date);
      const accent = css('--color-accent') || '#45c58a';
      const gradient = ctx.createLinearGradient(0, 0, 0, 280);
      gradient.addColorStop(0, accent + '26');
      gradient.addColorStop(1, accent + '00');
      datasets = [
        {
          label: 'Trays',
          data: series.map((row) => trays(row.total)),
          borderColor: accent,
          backgroundColor: gradient,
          fill: true,
          tension: 0.32,
          pointRadius: 3,
          pointHoverRadius: 5,
          borderWidth: 2,
          yAxisID: 'y',
        },
      ];
    }
    const scales = {
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Production in trays' },
        grid: { color: css('--color-border') || '#26332e' },
        ticks: { precision: 1 },
      },
      x: {
        grid: { display: false },
        title: { display: true, text: 'Date' },
        ticks: {
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 10,
          callback: function (value) {
            return formatDate(this.getLabelForValue(value)).replace(/ \d{4}$/, '');
          },
        },
      },
    };
    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            align: 'end',
            labels: { usePointStyle: true, boxWidth: 8, boxHeight: 8, padding: 16 },
          },
          tooltip: {
            backgroundColor: css('--color-bg-elevated') || '#18201d',
            titleColor: css('--color-text') || '#eef3f0',
            bodyColor: css('--color-text-secondary') || '#a9b6b0',
            borderColor: css('--color-border') || '#26332e',
            borderWidth: 1,
            padding: 12,
            callbacks: {
              title: (items) => (items.length ? formatDate(labels[items[0].dataIndex]) : ''),
              label: (item) => {
                return item.dataset.label + ': ' + (item.parsed.y == null ? '—' : formatNumber(item.parsed.y, 1) + ' trays');
              },
            },
          },
        },
        scales,
      },
    });
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [loading, setupError, chartHasData, activeBlock, blocks, entries, seriesByBlock, colorByBlock]);

  useEffect(() => {
    if (mixChartInstance.current) {
      mixChartInstance.current.destroy();
      mixChartInstance.current = null;
    }
    if (loading || setupError || !mixHasData) return;
    const canvas = mixChartRef.current;
    if (!canvas) return;
    const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    Chart.defaults.color = css('--color-text-secondary') || '#a9b6b0';
    Chart.defaults.borderColor = css('--color-border') || '#26332e';
    const ctx = canvas.getContext('2d');
    const dateSet = new Set();
    blocks.forEach((block) => (seriesByBlock[block.id] || []).forEach((row) => dateSet.add(row.date)));
    const labels = [...dateSet].sort();
    const datasets = blocks.filter((block) => (seriesByBlock[block.id] || []).length).map((block) => {
      const byDate = new Map((seriesByBlock[block.id] || []).map((row) => [row.date, row]));
      return {
        label: block.name,
        data: labels.map((date) => {
          const row = byDate.get(date);
          return row ? trays(row.total) : 0;
        }),
        borderColor: colorByBlock[block.id],
        backgroundColor: colorByBlock[block.id] + '99',
        fill: true,
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 1.5,
      };
    });
    mixChartInstance.current = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            align: 'end',
            labels: { usePointStyle: true, boxWidth: 8, boxHeight: 8, padding: 16 },
          },
          tooltip: {
            backgroundColor: css('--color-bg-elevated') || '#18201d',
            titleColor: css('--color-text') || '#eef3f0',
            bodyColor: css('--color-text-secondary') || '#a9b6b0',
            borderColor: css('--color-border') || '#26332e',
            borderWidth: 1,
            padding: 12,
            callbacks: {
              title: (items) => (items.length ? formatDate(labels[items[0].dataIndex]) : ''),
              label: (item) => item.dataset.label + ': ' + formatNumber(item.parsed.y, 1) + ' trays',
              footer: (items) => 'Total: ' + formatNumber(items.reduce((sum, item) => sum + (item.parsed.y || 0), 0), 1) + ' trays',
            },
          },
        },
        scales: {
          y: {
            stacked: true,
            beginAtZero: true,
            title: { display: true, text: 'Production in trays' },
            grid: { color: css('--color-border') || '#26332e' },
            ticks: { precision: 1 },
          },
          x: {
            grid: { display: false },
            title: { display: true, text: 'Date' },
            ticks: {
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 10,
              callback: function (value) {
                return formatDate(this.getLabelForValue(value)).replace(/ \d{4}$/, '');
              },
            },
          },
        },
      },
    });
    return () => {
      if (mixChartInstance.current) {
        mixChartInstance.current.destroy();
        mixChartInstance.current = null;
      }
    };
  }, [loading, setupError, mixHasData, blocks, seriesByBlock, colorByBlock]);

  async function handleDeleteEntry(row) {
    const ok = await confirm({
      title: 'Delete production entry',
      message: 'Delete the ' + row.blockName + ' reading for ' + formatDate(row.date) + '? This cannot be undone.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    const { error } = await supabase.from('growth_rate_entries').delete().eq('id', row.id);
    if (error) {
      toast('error', error.message);
      return;
    }
    audit('DELETE', 'growth_rate_entries', row.id, 'Deleted ' + row.blockName + ' production entry ' + row.date);
    toast('success', 'Production entry deleted');
    load();
  }

  async function handleDeleteBlock(block) {
    const count = entryCounts[block.id] || 0;
    const detail = count ? ' and its ' + count + ' production ' + (count === 1 ? 'entry' : 'entries') : '';
    const ok = await confirm({
      title: 'Delete block',
      message: 'Delete block ' + block.name + detail + '? This cannot be undone.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    const { error } = await supabase.from('growth_blocks').delete().eq('id', block.id);
    if (error) {
      toast('error', error.message);
      return;
    }
    audit('DELETE', 'growth_blocks', block.id, 'Deleted production block ' + block.name);
    if (activeBlock === block.id) setSelectedBlock('all');
    toast('success', 'Block deleted');
    load();
  }

  async function handleEntrySaved() {
    setEntryForm({ open: false, entry: null });
    await load();
  }

  async function handleBlockSaved(saved) {
    setBlockForm({ open: false, block: null });
    await load();
    if (saved && saved.id) setSelectedBlock(saved.id);
  }

  if (loading) {
    return (
      <div>
        <div className="skeleton" style={{ height: 120, marginBottom: 16 }} />
        <div className="kpi-grid mb-4">
          {[0, 1, 2, 3].map((item) => <div key={item} className="skeleton" style={{ height: 110 }} />)}
        </div>
        <div className="skeleton" style={{ height: 320 }} />
      </div>
    );
  }

  if (setupError) {
    return (
      <div className="card growth-empty-card">
        <div className="growth-card-title">
          <span className="growth-card-icon" style={{ background: 'var(--color-critical-soft)', color: 'var(--color-critical)' }}>{Icon.warn}</span>
          <div>
            <h3 style={{ margin: 0 }}>Production Tracking setup required</h3>
            <p className="u-text-sm u-text-secondary" style={{ margin: '4px 0 0' }}>{setupError}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!blocks.length) {
    return (
      <>
        <div className="card growth-empty-card">
          <EmptyState
            title="No blocks yet"
            desc="Add a block to start recording daily production."
            actionLabel={writable ? 'Add block' : undefined}
            onAction={writable ? () => setBlockForm({ open: true, block: null }) : undefined}
          />
        </div>
        {blockForm.open && (
          <BlockForm
            block={blockForm.block}
            blocks={blocks}
            onClose={() => setBlockForm({ open: false, block: null })}
            onSaved={handleBlockSaved}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="growth-hero card">
        <div className="growth-hero-main">
          <div className="growth-hero-icon">{Icon.growth}</div>
          <div>
            <div className="growth-eyebrow">Production analytics</div>
            <h2>Production Tracking</h2>
            <p>Daily egg production trend by block, with weekly movement and decrement flags.</p>
          </div>
        </div>
        <div className="growth-hero-side">
          <div className="growth-hero-stat">
            <span>Latest reading</span>
            <strong>{latestDate ? formatDate(latestDate) : '—'}</strong>
          </div>
          <div className="growth-hero-stat">
            <span>Cumulative Production</span>
            <strong>{formatTrays(currentEggsTotal)} trays</strong>
          </div>
        </div>
      </div>

      <div className="kpi-grid mb-4">
        <div className="card kpi-card growth-kpi">
          <div className="growth-kpi-head">
            <span className="growth-kpi-icon">{Icon.egg}</span>
            <span className="kpi-label">Cumulative Production</span>
          </div>
          <div className="kpi-value">{formatTrays(currentEggsTotal)}<span className="growth-kpi-unit">trays</span></div>
          <div className="growth-kpi-foot">Latest reading per block</div>
        </div>
        <div className="card kpi-card growth-kpi">
          <div className="growth-kpi-head">
            <span className="growth-kpi-icon is-info">{Icon.layers}</span>
            <span className="kpi-label">Blocks tracked</span>
          </div>
          <div className="kpi-value">{blocks.length}</div>
          <div className="growth-kpi-foot">{blocks.map((block) => block.name).join(' · ')}</div>
        </div>
        <div className="card kpi-card growth-kpi">
          <div className="growth-kpi-head">
            <span className="growth-kpi-icon is-positive">{Icon.trendUp}</span>
            <span className="kpi-label">Increment readings</span>
          </div>
          <div className="kpi-value">{growthDays}</div>
          <div className="growth-kpi-foot">Last 7 days</div>
        </div>
        <div className="card kpi-card growth-kpi">
          <div className="growth-kpi-head">
            <span className={'growth-kpi-icon' + (recentFlags.length ? ' is-critical' : '')}>{Icon.flag}</span>
            <span className="kpi-label">Flagged decrements</span>
          </div>
          <div className="kpi-value" style={{ color: recentFlags.length ? 'var(--color-critical)' : undefined }}>{recentFlags.length}</div>
          <div className="growth-kpi-foot">Last 7 days</div>
        </div>
      </div>

      {recentFlags.length > 0 && (
        <div className="growth-flag-banner mb-4">
          <div className="growth-flag-icon">{Icon.warn}</div>
          <div className="growth-flag-copy">
            <strong>Decrement flagged</strong>
            <p>
              {recentFlags.slice(0, 3).map((row) => row.blockName + ' · ' + formatDate(row.date) + ' · ' + signedPct(row.dailyPct)).join('   ·   ')}
              {recentFlags.length > 3 ? '   ·   +' + (recentFlags.length - 3) + ' more' : ''}
            </p>
          </div>
          <Badge tone="critical">{recentFlags.length} in 7 days</Badge>
        </div>
      )}

      <div className="growth-toolbar mb-4">
        <div className="growth-block-tabs">
          <button className={'growth-block-tab' + (activeBlock === 'all' ? ' active' : '')} onClick={() => setSelectedBlock('all')}>
            <span className="growth-block-dot" style={{ background: 'var(--color-accent)' }} />
            All blocks
            <span className="growth-count">{entries.length}</span>
          </button>
          {blocks.map((block) => (
            <button key={block.id} className={'growth-block-tab' + (activeBlock === block.id ? ' active' : '')} onClick={() => setSelectedBlock(block.id)}>
              <span className="growth-block-dot" style={{ background: colorByBlock[block.id] }} />
              {block.name}
              <span className="growth-count">{entryCounts[block.id] || 0}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="card growth-chart-card mb-4">
        <div className="card-header">
          <div className="growth-card-title">
            <span className="growth-card-icon">{Icon.activity}</span>
            <div>
              <h3>Production Trend</h3>
              <p>{activeBlock === 'all' ? 'Trays by block across recorded days.' : 'Trays from the first reading.'}</p>
            </div>
          </div>
        </div>
        <div className="card-body">
          {chartHasData ? (
            <div className="chart-container" style={{ height: 300 }}>
              <canvas ref={chartRef} />
            </div>
          ) : (
            <EmptyState title="No chart data yet" desc="Add a daily reading to see the production trend." />
          )}
        </div>
      </div>

      <div className="growth-visual-grid mb-4">
        <div className="card growth-spark-card">
          <div className="card-header">
            <div className="growth-card-title">
              <span className="growth-card-icon">{Icon.layers}</span>
              <div>
                <h3>Block trends</h3>
                <p>Daily trays per block on a shared scale.</p>
              </div>
            </div>
            <div className="growth-range" role="group" aria-label="Block trend range">
              {SPARK_RANGES.map((range) => (
                <button
                  key={range.label}
                  type="button"
                  className={'growth-range-btn' + (sparkRange === range.value ? ' active' : '')}
                  onClick={() => setSparkRange(range.value)}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
          <div className="card-body">
            {sparkData.dates.length === 0 ? (
              <EmptyState title="No block data yet" desc="Add a reading to see per-block trends." />
            ) : (
              <div className="growth-spark-grid">
                {sparkData.blockData.map(({ block, values, latest }) => {
                  const color = colorByBlock[block.id];
                  return (
                    <button
                      key={block.id}
                      type="button"
                      className={'growth-spark-tile' + (activeBlock === block.id ? ' active' : '')}
                      onClick={() => setSelectedBlock(activeBlock === block.id ? 'all' : block.id)}
                      title={'View ' + block.name}
                    >
                      <div className="growth-spark-head">
                        <span className="growth-spark-name">
                          <span className="growth-block-dot" style={{ background: color }} />
                          {block.name}
                        </span>
                        <span className="growth-spark-value">
                          {latest ? formatTrays(latest.total) : '—'} <span>trays</span>
                        </span>
                      </div>
                      {latest ? (
                        <BlockSparkline dates={sparkData.dates} values={values} color={color} max={sparkData.max} />
                      ) : (
                        <div className="growth-spark-empty">No readings</div>
                      )}
                      <div className="growth-spark-foot">
                        <span className={pctClass(latest && latest.dailyPct)}>
                          {latest && latest.dailyPct != null ? signedPct(latest.dailyPct) : '—'}
                        </span>
                        <span>{sparkData.dates.length} days</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="card growth-heat-card">
          <div className="card-header">
            <div className="growth-card-title">
              <span className="growth-card-icon">{Icon.calendar}</span>
              <div>
                <h3>Production calendar</h3>
                <p>{activeBlock === 'all' ? 'Daily trays across all blocks, last 12 weeks.' : 'Daily trays for the selected block, last 12 weeks.'}</p>
              </div>
            </div>
          </div>
          <div className="card-body">
            {!heatData ? (
              <EmptyState title="No calendar data yet" desc="Daily readings appear here as a heatmap." />
            ) : (
              <div className="growth-heat">
                <div className="growth-heat-months">
                  {heatData.weeks.map((week, index) => {
                    const first = week[0];
                    const previous = index > 0 ? heatData.weeks[index - 1][0] : null;
                    const showMonth = !previous || first.date.slice(0, 7) !== previous.date.slice(0, 7);
                    return <span key={first.date} className="growth-heat-month">{showMonth ? monthShort(first.date) : ''}</span>;
                  })}
                </div>
                <div className="growth-heat-body">
                  <div className="growth-heat-days">
                    {['Mon', '', 'Wed', '', 'Fri', '', 'Sun'].map((label, index) => <span key={index}>{label}</span>)}
                  </div>
                  <div className="growth-heat-grid">
                    {heatData.weeks.flatMap((week) => week.map((day) => {
                      const level = day.value == null ? 0 : Math.max(1, Math.min(4, Math.ceil((day.value / (heatData.max || 1)) * 4)));
                      return (
                        <span
                          key={day.date}
                          className={'growth-heat-cell growth-heat-' + level}
                          title={formatDate(day.date) + ' · ' + (day.value == null ? 'no reading' : formatTrays(day.value) + ' trays')}
                        />
                      );
                    }))}
                  </div>
                </div>
                <div className="growth-heat-legend">
                  <span>Less</span>
                  {[0, 1, 2, 3, 4].map((level) => <span key={level} className={'growth-heat-cell growth-heat-' + level} />)}
                  <span>More</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card growth-chart-card mb-4">
        <div className="card-header">
          <div className="growth-card-title">
            <span className="growth-card-icon">{Icon.layers}</span>
            <div>
              <h3>Production mix</h3>
              <p>Total daily production and each block's share over time.</p>
            </div>
          </div>
        </div>
        <div className="card-body">
          {mixHasData ? (
            <div className="chart-container" style={{ height: 300 }}>
              <canvas ref={mixChartRef} />
            </div>
          ) : (
            <EmptyState title="No mix data yet" desc="Add daily readings to see the production mix." />
          )}
        </div>
      </div>

      <div className="card growth-table-card mb-4">
        <div className="card-header">
          <div className="growth-card-title">
            <span className="growth-card-icon">{Icon.egg}</span>
            <div>
              <h3>Daily readings</h3>
              <p>Production in trays and daily movement.</p>
            </div>
          </div>
          <Badge tone="neutral">{displayEntries.length} {displayEntries.length === 1 ? 'entry' : 'entries'}</Badge>
        </div>
        <div className="card-body">
          {displayEntries.length === 0 ? (
            <EmptyState title="No production entries yet" desc="Add the first daily reading to see daily movement." />
          ) : (
            <>
              <div className="table-wrap">
                <table className="data-table growth-readings-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Block</th>
                      <th>Production</th>
                      <th>Change</th>
                      {writable && <th />}
                    </tr>
                  </thead>
                  <tbody>
                    {pagedEntries.map((row) => (
                      <tr key={row.id}>
                        <td>{formatDate(row.date)}</td>
                        <td>
                          <span className="growth-reading-block">
                            <span className="growth-block-dot" style={{ background: row.blockColor }} />
                            {row.blockName}
                          </span>
                        </td>
                        <td><strong>{formatTrays(row.total)}</strong> <span className="u-text-muted">trays</span></td>
                        <td>
                          <span className={pctClass(row.dailyPct)}>
                            {signedTrays(row.eggDelta)} <span className="u-text-muted">trays</span>
                            {' · '}
                            {row.dailyPct == null ? '—' : signedPct(row.dailyPct)}
                          </span>
                        </td>
                        {writable && (
                          <td>
                            <div className="actions">
                              <button className="btn btn-ghost btn-sm" onClick={() => setEntryForm({ open: true, entry: row })} title="Edit entry">
                                <span className="btn-icon">{Icon.edit}</span>
                              </button>
                              <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteEntry(row)} title="Delete entry" style={{ color: 'var(--color-critical)' }}>
                                <span className="btn-icon">{Icon.trash}</span>
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="growth-pager">
                <span className="growth-pager-info">
                  Showing {(currentReadingPage - 1) * READINGS_PER_PAGE + 1}–{Math.min(currentReadingPage * READINGS_PER_PAGE, displayEntries.length)} of {displayEntries.length}
                </span>
                <div className="growth-pager-actions">
                  <button className="btn btn-secondary btn-sm" disabled={currentReadingPage <= 1} onClick={() => setReadingPage(currentReadingPage - 1)}>Previous</button>
                  <span className="growth-pager-page">Page {currentReadingPage} of {readingPageCount}</span>
                  <button className="btn btn-secondary btn-sm" disabled={currentReadingPage >= readingPageCount} onClick={() => setReadingPage(currentReadingPage + 1)}>Next</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="card growth-table-card">
        <div className="card-header">
          <div className="growth-card-title">
            <span className="growth-card-icon">{Icon.calendar}</span>
            <div>
              <h3>Weekly totals</h3>
              <p>Monday to Sunday, with closing totals and week-over-week movement.</p>
            </div>
          </div>
          <Badge tone="neutral">{weeklyWeekCount} {weeklyWeekCount === 1 ? 'week' : 'weeks'}</Badge>
        </div>
        <div className="card-body">
          {weeklyRows.length === 0 ? (
            <EmptyState title="No weekly totals yet" desc="Weekly totals appear once readings are recorded." />
          ) : (
            <div className="growth-weekly-grid">
              {weeklyRows.map((row) => {
                const statusMeta = weekStatusMeta(row.status);
                return (
                  <div key={row.id} className="growth-weekly-card">
                    <div className="growth-weekly-header">
                      <span className="growth-weekly-range">{row.weekLabel}</span>
                      <span className="growth-weekly-block">
                        <span className="growth-block-dot" style={{ background: row.blockColor }} />
                        {row.blockName}
                      </span>
                    </div>
                    <div className="growth-weekly-total">
                      <span className="growth-weekly-value">{formatTrays(row.closing)}</span>
                      <span className="growth-weekly-unit">closing trays</span>
                    </div>
                    <div className="growth-weekly-meta">
                      <span>Opening {formatTrays(row.opening)} trays</span>
                    </div>
                    <div className="growth-weekly-badges">
                      <span className={'growth-weekly-delta ' + pctClass(row.netPct)}>Week net {signedPct(row.netPct)}</span>
                      <span className={'growth-weekly-delta ' + pctClass(row.wowPct)}>WoW {signedPct(row.wowPct)}</span>
                      <Badge tone={statusMeta.tone}><span className="growth-badge">{statusMeta.icon}{statusMeta.label}</span></Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {entryForm.open && (
        <EntryForm
          entry={entryForm.entry}
          blocks={blocks}
          defaultBlockId={activeBlock !== 'all' ? activeBlock : (blocks[0] && blocks[0].id)}
          seriesByBlock={seriesByBlock}
          onClose={() => setEntryForm({ open: false, entry: null })}
          onSaved={handleEntrySaved}
        />
      )}

      {blockForm.open && (
        <BlockForm
          block={blockForm.block}
          blocks={blocks}
          onClose={() => setBlockForm({ open: false, block: null })}
          onSaved={handleBlockSaved}
        />
      )}

      {blockManagerOpen && (
        <BlockManager
          blocks={blocks}
          entryCounts={entryCounts}
          colorByBlock={colorByBlock}
          writable={writable}
          onClose={() => setBlockManagerOpen(false)}
          onAdd={() => {
            setBlockManagerOpen(false);
            setBlockForm({ open: true, block: null });
          }}
          onRename={(block) => {
            setBlockManagerOpen(false);
            setBlockForm({ open: true, block });
          }}
          onDelete={handleDeleteBlock}
        />
      )}
    </>
  );
}

function EntryForm({ entry, blocks, defaultBlockId, seriesByBlock, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({
    date: entry ? dateKey(entry.date) : todayEAT(),
    block_id: entry ? entry.block_id : (defaultBlockId || (blocks[0] && blocks[0].id) || ''),
    production_trays: entry ? String(entry.production_trays ?? '') : '',
    unbundled_eggs: entry ? String(entry.unbundled_eggs ?? '') : '',
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (key) => (event) => setF((current) => ({ ...current, [key]: event.target.value }));
  const total = n(f.production_trays) * 30 + n(f.unbundled_eggs);
  const series = seriesByBlock[f.block_id] || [];
  const previous = [...series]
    .filter((row) => row.id !== (entry && entry.id) && row.date < f.date)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  const previousTotal = previous ? previous.total : null;
  const eggDelta = previousTotal != null ? total - previousTotal : null;
  const dailyPct = previousTotal != null ? pctChange(total, previousTotal) : null;
  const blockName = (blocks.find((block) => block.id === f.block_id) || {}).name || '';

  async function save() {
    setErr('');
    if (!f.date) {
      setErr('Date is required.');
      return;
    }
    if (!f.block_id) {
      setErr('Block is required.');
      return;
    }
    if (String(f.production_trays).trim() === '' && String(f.unbundled_eggs).trim() === '') {
      setErr('Enter production in trays or unbundled eggs.');
      return;
    }
    const trays = n(f.production_trays);
    const unbundled = n(f.unbundled_eggs);
    if (trays < 0 || unbundled < 0) {
      setErr('Production values cannot be negative.');
      return;
    }
    setBusy(true);
    const payload = {
      project_id: PROJECT,
      block_id: f.block_id,
      date: f.date,
      production_trays: trays,
      unbundled_eggs: unbundled,
    };
    const res = entry
      ? await supabase.from('growth_rate_entries').update(payload).eq('id', entry.id).select('id').single()
      : await supabase.from('growth_rate_entries').insert(payload).select('id').single();
    setBusy(false);
    if (res.error) {
      if (res.error.code === '23505') {
        setErr('An entry already exists for this block and date. Edit the existing entry instead.');
      } else {
        setErr(res.error.message || 'Could not save the entry.');
      }
      return;
    }
    audit(entry ? 'UPDATE' : 'CREATE', 'growth_rate_entries', (res.data && res.data.id) || (entry && entry.id), (entry ? 'Updated' : 'Added') + ' production entry ' + blockName + ' ' + f.date);
    toast('success', entry ? 'Production entry updated' : 'Production entry added');
    onSaved();
  }

  return (
    <Modal
      title={entry ? 'Edit production entry' : 'Add production entry'}
      onClose={onClose}
      footer={(
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy} onClick={save}>
            <span className="btn-icon">{Icon.check}</span>
            {busy ? 'Saving…' : entry ? 'Update entry' : 'Save entry'}
          </button>
        </>
      )}
    >
      {err && <div className="form-error-global">{err}</div>}
      <div className="form-row">
        <Field label="Date" type="date" required value={f.date} onChange={set('date')} />
        <div className="form-group">
          <label className="form-label">Block<span className="required">*</span></label>
          <select className="form-select" value={f.block_id} onChange={set('block_id')}>
            {blocks.map((block) => <option key={block.id} value={block.id}>{block.name}</option>)}
          </select>
        </div>
      </div>
      <div className="form-row">
        <Field label="Production (trays)" type="number" min="0" step="0.1" value={f.production_trays} onChange={set('production_trays')} hint="Eggs collected in full trays." />
        <Field label="Unbundled eggs" type="number" min="0" step="1" value={f.unbundled_eggs} onChange={set('unbundled_eggs')} hint="Loose eggs outside full trays." />
      </div>
      <div className="growth-preview">
        <div className="growth-preview-item">
          <span>Total eggs</span>
          <strong>{formatNumber(total)}</strong>
        </div>
        <div className="growth-preview-item">
          <span>Egg change</span>
          <strong className={pctClass(eggDelta)}>{signedEggs(eggDelta)}</strong>
        </div>
        <div className="growth-preview-item">
          <span>Daily change</span>
          <strong className={pctClass(dailyPct)}>{dailyPct == null ? '—' : signedPct(dailyPct)}</strong>
        </div>
        <div className="growth-preview-note">
          {previous
            ? 'Previous reading: ' + formatDate(previous.date) + ' · ' + formatNumber(previous.total) + ' eggs'
            : 'First recorded reading for this block.'}
        </div>
      </div>
    </Modal>
  );
}

function BlockForm({ block, blocks, onClose, onSaved }) {
  const toast = useToast();
  const [name, setName] = useState(block ? block.name : nextBlockName(blocks));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function save() {
    setErr('');
    const clean = String(name || '').trim();
    if (!clean) {
      setErr('Block name is required.');
      return;
    }
    const duplicate = blocks.some((item) => item.id !== (block && block.id) && String(item.name).trim().toUpperCase() === clean.toUpperCase());
    if (duplicate) {
      setErr('A block with this name already exists.');
      return;
    }
    setBusy(true);
    let res;
    if (block) {
      res = await supabase.from('growth_blocks').update({ name: clean }).eq('id', block.id).select('*').single();
    } else {
      const maxSort = blocks.reduce((max, item) => Math.max(max, Number(item.sort_order) || 0), 0);
      res = await supabase.from('growth_blocks').insert({ project_id: PROJECT, name: clean, sort_order: maxSort + 1 }).select('*').single();
    }
    setBusy(false);
    if (res.error) {
      if (res.error.code === '23505') {
        setErr('A block with this name already exists.');
      } else {
        setErr(res.error.message || 'Could not save the block.');
      }
      return;
    }
    audit(block ? 'UPDATE' : 'CREATE', 'growth_blocks', (res.data && res.data.id) || (block && block.id), block ? 'Renamed production block ' + block.name + ' to ' + clean : 'Added production block ' + clean);
    toast('success', block ? 'Block renamed' : 'Block added');
    onSaved(res.data);
  }

  return (
    <Modal
      title={block ? 'Rename block' : 'Add block'}
      onClose={onClose}
      footer={(
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy} onClick={save}>
            <span className="btn-icon">{Icon.check}</span>
            {busy ? 'Saving…' : block ? 'Rename block' : 'Add block'}
          </button>
        </>
      )}
    >
      {err && <div className="form-error-global">{err}</div>}
      <Field
        label="Block name"
        required
        value={name}
        onChange={(event) => setName(event.target.value)}
        hint="Use a short label such as C, D or E."
      />
    </Modal>
  );
}

function BlockManager({ blocks, entryCounts, colorByBlock, writable, onClose, onAdd, onRename, onDelete }) {
  return (
    <Modal
      title="Manage blocks"
      size="lg"
      onClose={onClose}
      footer={(
        <>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          {writable && (
            <button className="btn btn-primary" onClick={onAdd}>
              <span className="btn-icon">{Icon.plus}</span>
              Add block
            </button>
          )}
        </>
      )}
    >
      <DataTable
        columns={[
          {
            key: 'block',
            label: 'Block',
            accessor: (row) => (
              <span className="growth-block-tag">
                <span className="growth-block-dot" style={{ background: colorByBlock[row.id] }} />
                {row.name}
              </span>
            ),
          },
          { key: 'entries', label: 'Entries', accessor: (row) => formatNumber(entryCounts[row.id] || 0) },
          { key: 'created', label: 'Created', accessor: (row) => formatDate(row.created_at) },
        ]}
        rows={blocks}
        actions={writable ? [
          { id: 'rename', label: 'Rename', icon: Icon.edit },
          { id: 'delete', label: 'Delete', danger: true, icon: Icon.trash },
        ] : null}
        onAction={(action, row) => {
          if (action === 'rename') onRename(row);
          if (action === 'delete') onDelete(row);
        }}
        emptyMessage="No blocks yet."
      />
    </Modal>
  );
}
