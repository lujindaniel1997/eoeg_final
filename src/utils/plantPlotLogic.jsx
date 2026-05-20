// plantPlotLogic.js — hardened for missing keys, empty traces, and missing bounds
import Plotly from 'plotly.js';

const fallbackColors = [
  '#4F46E5', // Indigo
  '#06B6D4', // Cyan
  '#10B981', // Green
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#22C55E', // Light Green
  '#0EA5E9', // Sky
  '#F97316'  // Orange
];

const PLANT_RED = '#EF4444'; // ✅ Standard vivid red color for Plant Data

function colorway() {
  const cfg = Plotly?.Colors?.PlotlyConfig?.colorway;
  if (Array.isArray(cfg) && cfg.length) return cfg;

  const d3range = Plotly?.d3?.scale?.category10?.()?.range?.();
  if (Array.isArray(d3range) && d3range.length) return d3range;

  return fallbackColors;
}

function isValidRange(r) {
  return (
    Array.isArray(r) &&
    r.length === 2 &&
    r[0] !== null &&
    r[1] !== null &&
    r[0] !== undefined &&
    r[1] !== undefined &&
    !Number.isNaN(r[0]) &&
    !Number.isNaN(r[1])
  );
}

function resolveRange(varName, bounds_dict, opts = {}) {
  const { cumEO_varname } = opts;
  if (!bounds_dict || !varName) return undefined;
  if (isValidRange(bounds_dict[varName])) return bounds_dict[varName];

  const altKey = `${varName}_range`;
  if (isValidRange(bounds_dict[altKey])) return bounds_dict[altKey];

  if (cumEO_varname && varName === cumEO_varname && isValidRange(bounds_dict.cumEO_range)) {
    return bounds_dict.cumEO_range;
  }

  const v = String(varName).toLowerCase();
  const isCEPercent =
    v.includes('selectivity') ||
    v.includes('efficiency') ||
    v.includes('actual plant efficiency') ||
    v.includes('co2 efficiency') ||
    v.includes('o2 efficiency') ||
    /\bce\b/.test(v);

  if (isCEPercent && isValidRange(bounds_dict.CE_range)) {
    return bounds_dict.CE_range;
  }

  const isTST =
    v.includes('top shell') ||
    v.includes('shell temperature') ||
    v.includes('tst') ||
    v.includes('inlet coolant');

  if (isTST && isValidRange(bounds_dict.TST_range)) {
    return bounds_dict.TST_range;
  }

  return undefined;
}

function formatLabel(label) {
  if (!label) return '';
  let clean = String(label);
  clean = clean.replace(/plant/gi, '');
  clean = clean.replace(/_/g, ' ');
  clean = clean.replace(/\s+/g, ' ').trim();
  return clean
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getXValue(row, x_var, cumEO_varname) {
  if (x_var !== cumEO_varname) {
    return row?.[x_var];
  }
  return (
    row?.[cumEO_varname] ||
    row?.['Eocat'] || 
    row?.['Cumulative EO (cat.) [klb/ft3]'] ||
    row?.['Cumulative EO (bed based) [klb/ft3]']
  );
}

function getManualRange(axisRanges, key) {
  const r = axisRanges?.[key];
  if (!r) return null;
  const min = r.min;
  const max = r.max;
  if (min === undefined || max === undefined) return null;
  if (Number.isNaN(min) || Number.isNaN(max)) return null;
  return [Number(min), Number(max)];
}

/**
 * Multi-Y scatter (stacked rows, shared X) - Tabs 0 & 1
 */
export function plotMultipleY_Plant(
  df_plot,
  axis_choice,
  case_selected,
  cumEO_varname,
  bounds_dict,
  yvar_list,
  color_var = 'Case',
  axisRanges = {}
) {
  if (!Array.isArray(df_plot) || df_plot.length === 0) {
    return { data: [], layout: { title: 'No data to plot' } };
  }

  let x_var, x_title;
  if (axis_choice === 'Months') {
    x_var = 'm';
    x_title = 'Months';
  } else if (axis_choice === 'Cumulative EO') {
    x_var = cumEO_varname;
    x_title = cumEO_varname.includes('Cumulative EO') ? cumEO_varname : 'Cumulative EO (klb/ft3)';
  } else {
    x_var = 't';
    x_title = 'Time on Stream [Days]';
  }

  const selectedSet = new Set(case_selected || []);
  const filtered_df = df_plot.filter(row => selectedSet.has(row?.[color_var]));

  if (filtered_df.length === 0) {
    return { data: [], layout: { title: 'No rows match current selection' } };
  }

  const groupedData = {};
  filtered_df.forEach(row => {
    const key = row?.[color_var];
    if (!key) return;
    if (!groupedData[key]) groupedData[key] = [];
    groupedData[key].push(row);
  });

  const xCache = new Map();
  filtered_df.forEach(row => {
    const xv = getXValue(row, x_var, cumEO_varname);
    if (xv != null && !Number.isNaN(xv)) {
      xCache.set(row, xv);
    }
  });

  const availableKeys = new Set(filtered_df.flatMap(r => Object.keys(r || {})));
  const safeYvars = (yvar_list || []).filter(y => availableKeys.has(y));

  if (safeYvars.length === 0) {
    return { data: [], layout: { title: 'No matching variables in data' } };
  }

  const colors = colorway();
  const n_vars = safeYvars.length;

  const allX = filtered_df.map(r => xCache.get(r));
  let xAutoRange;
  if (allX.length > 0) {
    const minX = Math.min(...allX);
    const maxX = Math.max(...allX);
    const padX = (maxX - minX || 1) * 0.05;
    xAutoRange = [minX - padX, maxX + padX];
  }

  const manualX = getManualRange(axisRanges, x_var);
  let validManualX = null;
  if (manualX && allX.length > 0) {
    const minData = Math.min(...allX);
    const maxData = Math.max(...allX);
    const [mMin, mMax] = manualX;
    if (!(mMax < minData || mMin > maxData)) {
      validManualX = manualX;
    }
  }
  const resolvedX = resolveRange(x_var, bounds_dict, { cumEO_varname });
  const xRange = validManualX || (isValidRange(resolvedX) ? resolvedX : undefined) || xAutoRange;

  const gap = 0.06;
  const h = (1 - (n_vars - 1) * gap) / n_vars;

  const layoutAxes = {};
  const subplotBoxes = [];

  const axisRef = safeYvars.map((_y, i) => {
    const idx = i + 1;
    return {
      idx,
      xTrace: idx === 1 ? 'x' : `x${idx}`,
      yTrace: idx === 1 ? 'y' : `y${idx}`,
      xLayout: idx === 1 ? 'xaxis' : `xaxis${idx}`,
      yLayout: idx === 1 ? 'yaxis' : `yaxis${idx}`
    };
  });

  safeYvars.forEach((yvar, i) => {
    const { idx, xLayout, yLayout } = axisRef[i];
    const top = 1 - i * (h + gap);
    const bottom = top - h;

    subplotBoxes.push({
      type: 'rect', xref: 'paper', yref: 'paper', x0: 0, x1: 1, y0: bottom, y1: top,
      line: { color: '#D1D5DB', width: 1 }, fillcolor: 'rgba(0,0,0,0)', layer: 'below'
    });

    const allY = filtered_df.map(r => r?.[yvar]).filter(v => v !== undefined && v !== null && !Number.isNaN(v));
    let yAutoRange;
    if (allY.length > 0) {
      const minY = Math.min(...allY);
      const maxY = Math.max(...allY);
      const padY = (maxY - minY || 1) * 0.10;
      yAutoRange = [minY - padY, maxY + padY];
    }

    const manualY = getManualRange(axisRanges, yvar);
    let validManualY = null;
    if (manualY && allY.length > 0) {
      const minData = Math.min(...allY);
      const maxData = Math.max(...allY);
      const [mMin, mMax] = manualY;
      if (!(mMax < minData || mMin > maxData)) {
        validManualY = manualY;
      }
    }
    const resolvedY = resolveRange(yvar, bounds_dict, { cumEO_varname });
    const yRange = validManualY || (isValidRange(resolvedY) ? resolvedY : undefined) || yAutoRange;

    layoutAxes[yLayout] = {
      domain: [bottom, top], automargin: true, showgrid: true, gridcolor: '#E5E7EB', zeroline: false,
      mirror: true, ticks: 'outside', autorange: !isValidRange(yRange),
      ...(isValidRange(yRange) ? { range: yRange } : {}),
      title: { text: formatLabel(safeYvars[i]?.replace(/\s*\[.*?\]/, '')) }
    };

    layoutAxes[xLayout] = {
      domain: [0, 1], anchor: idx === 1 ? 'y' : `y${idx}`, automargin: true, showgrid: true, gridcolor: '#E5E7EB', zeroline: false,
      mirror: true, ticks: 'outside', autorange: !isValidRange(xRange),
      ...(isValidRange(xRange) ? { range: xRange } : {}),
      matches: 'x', showticklabels: true, title: { text: formatLabel(x_title) }
    };
  });

  if (layoutAxes.xaxis) {
    layoutAxes.xaxis.matches = undefined;
  }

  const plotData = [];
  Object.entries(groupedData).forEach(([item, rows], idx) => {
    safeYvars.forEach((yvar, yIndex) => {
      const { xTrace, yTrace } = axisRef[yIndex];
      const xvals = [];
      const yvals = [];

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const xv = xCache.get(r);
        const yv = r?.[yvar];
        if (xv != null && yv != null && !Number.isNaN(yv)) {
          xvals.push(xv);
          yvals.push(yv);
        }
      }

      const MAX_POINTS = 1500;
      const step = xvals.length > MAX_POINTS ? Math.ceil(xvals.length / MAX_POINTS) : 1;
      const xReduced = [];
      const yReduced = [];

      for (let i = 0; i < xvals.length; i += step) {
        xReduced.push(xvals[i]);
        yReduced.push(yvals[i]);
      }

      const isPlantData = String(item).toLowerCase() === 'plant data' || String(item).toLowerCase().includes('eg1_');
      const traceColor = isPlantData ? PLANT_RED : colors[idx % colors.length];

      plotData.push({
        x: xReduced,
        y: yReduced,
        mode: 'markers',
        type: 'scatter',
        name: item,
        marker: {
          size: 8,
          color: traceColor
        },
        xaxis: xTrace,
        yaxis: yTrace,
        showlegend: yIndex === 0
      });
    });
  });

  if (plotData.length === 0) {
    return { data: [], layout: { title: 'No valid data points to plot' } };
  }

  const plotLayout = {
    ...layoutAxes,
    shapes: subplotBoxes,
    font: { family: 'Segoe UI, Roboto, sans-serif', size: 14, color: '#111827' },
    hovermode: 'x unified',
    legend: { orientation: 'h', yanchor: 'bottom', y: 1.08, xanchor: 'center', x: 0.5 },
    margin: { l: 90, r: 30, t: 70, b: 60 },
    height: Math.max(n_vars * 320, 500),
    showlegend: true
  };

  return { data: plotData, layout: plotLayout };
}

/**
 * Plant vs Prediction Standalone Cards - Tab 2 (PV Prediction)
 */
export function plotPlantOnly(df_final_plot, bounds_dict, cumEO_varname, default_y, axisRanges = {}) {
  const [CE_var, TST_var] = default_y;
  const isSinglePlot = !CE_var || !TST_var;
  const activeVar = CE_var || TST_var;

  const models = [...new Set((df_final_plot || []).map(row => row?.Model || row?.modelname))].filter(Boolean);
  const colors = colorway();
  const plotData = [];

  const findKey = (row, target) => {
    if (!row || !target) return null;
    if (row[target] !== undefined) return target;
    const base = target.split(' [')[0].toLowerCase();
    return Object.keys(row).find(k => k.toLowerCase().startsWith(base));
  };

  models.forEach((model, mIdx) => {
    const rows = (df_final_plot || []).filter(r => (r?.Model || r?.modelname) === model);
    const x1 = [], y1 = [], x2 = [], y2 = [];

    rows.forEach(r => {
      const xv = getXValue(r, cumEO_varname, cumEO_varname);
      const ceKey = findKey(r, CE_var);
      const tstKey = findKey(r, TST_var);
      const yv1 = ceKey ? r[ceKey] : null;
      const yv2 = tstKey ? r[tstKey] : null;

      if (xv != null && yv1 != null && !Number.isNaN(yv1)) { x1.push(xv); y1.push(yv1); }
      if (xv != null && yv2 != null && !Number.isNaN(yv2)) { x2.push(xv); y2.push(yv2); }
    });

    const isPlant = String(model).toLowerCase() === 'plant data';
    const traceColor = isPlant ? PLANT_RED : colors[mIdx % colors.length];

    if (x1.length > 0) {
      plotData.push({
        x: x1, y: y1, mode: 'markers', type: 'scattergl',
        name: model, marker: { color: traceColor, symbol: isPlant ? 'diamond' : 'circle', size: isPlant ? 10 : 8 },
        xaxis: 'x', yaxis: 'y',
        showlegend: true,
        hovertemplate: '<b>%{fullData.name}</b><br>X: %{x:.2f}<br>Y: %{y:.2f}<extra></extra>',
      });
    }
    if (x2.length > 0) {
      plotData.push({
        x: x2, y: y2, mode: 'markers', type: 'scattergl',
        name: model, marker: { color: traceColor, symbol: isPlant ? 'diamond' : 'circle', size: isPlant ? 10 : 8 },
        xaxis: isSinglePlot ? 'x' : 'x2',
        yaxis: isSinglePlot ? 'y' : 'y2',
        showlegend: isSinglePlot,
        hovertemplate: '<b>%{fullData.name}</b><br>X: %{x:.2f}<br>Y: %{y:.2f}<extra></extra>',
      });
    }
  });

  const manualXMin = axisRanges?.[activeVar]?.x?.min;
  const manualXMax = axisRanges?.[activeVar]?.x?.max;
  const manualYMin = axisRanges?.[activeVar]?.y?.min;
  const manualYMax = axisRanges?.[activeVar]?.y?.max;

  const xRange = (manualXMin !== undefined && manualXMax !== undefined) ? [Number(manualXMin), Number(manualXMax)] : bounds_dict?.cumEO_range;
  let fallbackYRange = bounds_dict?.CE_range;
  if (activeVar && (activeVar.includes('Temperature') || activeVar.includes('TST'))) {
    fallbackYRange = bounds_dict?.TST_range;
  }
  const yRange = (manualYMin !== undefined && manualYMax !== undefined) ? [Number(manualYMin), Number(manualYMax)] : fallbackYRange;

  const layout = {
    height: isSinglePlot ? 500 : 800,
    showlegend: true,
    legend: { orientation: 'h', yanchor: 'bottom', y: 1.02, xanchor: 'center', x: 0.5 },
    xaxis: { range: xRange, domain: [0, 1], title: { text: 'Cumulative EO (klb/ft3)' }, showline: true, mirror: true, linecolor: '#D1D5DB', ticks: 'outside' },
    yaxis: { title: { text: formatLabel(activeVar) }, range: yRange, domain: isSinglePlot ? [0, 1] : [0.55, 1], automargin: true, showline: true, mirror: true, linecolor: '#D1D5DB', ticks: 'outside' }
  };

  return { data: plotData, layout };
}

/**
 * Common Scaling Standalone Cards - Tab 3 (Common Scaling)
 */
export function plotPlantSC(df_predicted, df_proj, bounds_dict, cumEO_varname, default_y_var, proj_varname, axisRanges = {}) {
  if (!default_y_var) return { data: [], layout: {} };

  const plants = [...new Set((df_predicted || []).map(row => row?.Plant))].filter(Boolean);
  const colors = colorway();
  
  // ✅ FIX 1: Since this tab handles cards individually, it is ALWAYS a single plot chart layout context
  const isSinglePlot = true; 
  const plotData = [];

  plants.forEach((plant, pIdx) => {
    const rows = (df_predicted || []).filter(r => r?.Plant === plant);
    const x = [], y = [];

    rows.forEach(r => {
      const xv = getXValue(r, cumEO_varname, cumEO_varname);
      const yv = r?.[default_y_var];
      if (xv != null && yv != null && !Number.isNaN(yv)) {
        x.push(xv);
        y.push(yv);
      }
    });

    const isPlant = String(plant).toLowerCase() === 'plant data';
    const traceColor = isPlant ? PLANT_RED : colors[pIdx % colors.length];

    if (y.length > 0) {
      plotData.push({
        x: x, y: y, mode: 'markers', type: 'scattergl',
        name: plant, marker: { color: traceColor, size: 8 },
        xaxis: 'x', yaxis: 'y',
      });
    }
  });

  const proj_sorted = [...(df_proj || [])].sort((a, b) => (getXValue(a, cumEO_varname, cumEO_varname) ?? 0) - (getXValue(b, cumEO_varname, cumEO_varname) ?? 0));
  if (proj_sorted.length > 0 && proj_varname) {
    const px = proj_sorted.map(r => getXValue(r, cumEO_varname, cumEO_varname)).filter(v => v != null);
    const py = proj_sorted.map(r => r?.[proj_varname]).filter(v => v != null);

    if (py.length > 0) {
      plotData.push({
        x: px, y: py, mode: 'lines', type: 'scattergl',
        name: `Projection ${formatLabel(proj_varname.replace('Projection ', ''))}`, 
        line: { color: '#374151', dash: 'dot', width: 2 },
        // ✅ FIX 2: Fixed duplication of layout keys properties to pass linting rules cleanly
        xaxis: 'x',
        yaxis: 'y',
        showlegend: true,
      });
    }
  }

  const manualXMin = axisRanges?.[default_y_var]?.x?.min;
  const manualXMax = axisRanges?.[default_y_var]?.x?.max;
  const manualYMin = axisRanges?.[default_y_var]?.y?.min;
  const manualYMax = axisRanges?.[default_y_var]?.y?.max;

  const xRange = (manualXMin !== undefined && manualXMax !== undefined) ? [Number(manualXMin), Number(manualXMax)] : bounds_dict?.cumEO_range;
  let fallbackYRange = bounds_dict?.CE_range;
  if (default_y_var.includes('Temperature') || default_y_var.includes('TST')) {
    fallbackYRange = bounds_dict?.TST_range;
  }
  const yRange = (manualYMin !== undefined && manualYMax !== undefined) ? [Number(manualYMin), Number(manualYMax)] : fallbackYRange;

  const layout = {
    height: isSinglePlot ? 500 : 800,
    showlegend: true,
    legend: { orientation: 'h', yanchor: 'bottom', y: 1.02, xanchor: 'center', x: 0.5 },
    xaxis: { domain: [0, 1], title: { text: 'Cumulative EO (klb/ft3)' }, range: xRange, showline: true, mirror: true, linecolor: '#D1D5DB', ticks: 'outside' },
    yaxis: { title: { text: formatLabel(default_y_var) }, range: yRange, automargin: true, showline: true, mirror: true, linecolor: '#D1D5DB', ticks: 'outside' },
    hovermode: 'closest',
  };

  return { data: plotData, layout };
}