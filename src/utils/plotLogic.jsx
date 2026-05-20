// utils/plotLogic.js
import {
  Button
} from '@mui/material';
 
/**
* Replicates the core logic of plot_multiple_y from plots.py
* Generates the `data` and `layout` objects for react-plotly.js
* @param {Array} df_plot - The *converted* data array
* @param {string} axis_choice - e.g., "Months"
* @param {Array} case_selected - e.g., ["Case1", "Case2"]
* @param {string} cumEO_varname - The name of the cumEO column
* @param {Object} bounds_dict - The axis bounds
* @param {Array} yvar_list - The Y-axis variables to plot
* @param {string} plot_format - e.g., "NX1"
* @returns {Object} { data: [...], layout: {...} }
* 
*/

// utils/plotLogic.js

// utils/plotLogic.js

/**
 * Generates Plotly `data` and `layout` objects
 * Supports both light and dark themes
 */



export function createPlotData(
  df_plot,
  axis_choice,
  case_selected,
  cumEO_varname,
  bounds_dict,
  yvar_list,
  plot_format = 'NX1',
  themeVariant = 'light'
) {
  // -----------------------------
  // 1. Determine X-axis variable
  // -----------------------------
  let x_var, x_title;
  switch (axis_choice) {
    case 'Months':
      x_var = 'm';
      x_title = 'Months';
      break;
    case 'Cumulative EO':
      x_var = cumEO_varname;
      x_title = cumEO_varname;
      break;
    case 'Time on Stream [Days]':
      x_var = 't';
      x_title = 'Time on Stream [Days]';
      break;
    default:
      x_var = 'm';
      x_title = 'Months';
  }

  // -----------------------------
  // 2. Theme (Light / Dark)
  // -----------------------------
  const isDark = themeVariant === 'dark';

  const baseFontColor = isDark ? '#FCF9F9' : '#1E1E1E';
  const baseBgColor   = isDark ? '#0A0A0A' : '#F5F6F8';
  const paperBgColor  = isDark ? '#121212' : '#FFFFFF';
  const gridColor     = isDark ? '#2A2A2A' : '#E0E0E0';

  // -----------------------------
  // 3. Filter data by selected cases
  // -----------------------------
  const filtered_df = df_plot.filter(row =>
    case_selected.includes(row.Case)
  );

  // -----------------------------
  // 4. Plot traces
  // -----------------------------
  const plotData = [];
  const n_vars = yvar_list.length;
  const colors = ['#00E5FF', '#FF4081', '#69F0AE', '#FFD740', '#7C4DFF'];

  const spacing = 0.05;
  const y_axes = {};
  const x_axes = {};

  // X-axis bounds
  const xRangeCandidate =
    bounds_dict?.[x_var] && Array.isArray(bounds_dict[x_var])
      ? bounds_dict[x_var]
      : undefined;

  for (let i = 0; i < n_vars; i++) {
    const y_axis_id = i === 0 ? 'yaxis' : `yaxis${i + 1}`;
    const x_axis_id = i === 0 ? 'xaxis' : `xaxis${i + 1}`;

    const domain_bottom =
      (1 / n_vars) * (n_vars - 1 - i) + (i === n_vars - 1 ? 0 : spacing / 2);
    const domain_top =
      (1 / n_vars) * (n_vars - i) - (i === 0 ? 0 : spacing / 2);

    const yName = yvar_list[i];
    const yRangeCandidate =
      bounds_dict?.[yName] && Array.isArray(bounds_dict[yName])
        ? bounds_dict[yName]
        : undefined;

    y_axes[y_axis_id] = {
      title: { text: yName, font: { size: 14, color: baseFontColor } },
      domain: [domain_bottom, domain_top],
      showgrid: true,
      gridcolor: gridColor,
      zeroline: true,
      showline: true,
      linecolor: gridColor,
      mirror: true,
      tickformat: '.2f',
      automargin: true,
      ...(yRangeCandidate ? { range: yRangeCandidate } : {}),
    };

    x_axes[x_axis_id] = {
      anchor: y_axis_id,
      showgrid: true,
      gridcolor: gridColor,
      zeroline: true,
      showline: true,
      linecolor: gridColor,
      mirror: true,
      automargin: true,
      ...(xRangeCandidate ? { range: xRangeCandidate } : {}),
      ...(i === n_vars - 1
        ? { title: { text: x_title, font: { size: 14, color: baseFontColor } } }
        : {}),
    };
  }

  case_selected.forEach((caseName, caseIndex) => {
    const case_data = filtered_df
      .filter(row => row.Case === caseName)
      .sort((a, b) => a[x_var] - b[x_var]);

    const x_values = case_data.map(row => row[x_var]);

    yvar_list.forEach((yvar, yIndex) => {
      plotData.push({
        x: x_values,
        y: case_data.map(row => row[yvar]),
        mode: 'lines',
        type: 'scatter',
        name: caseName,
        line: {
          color: colors[caseIndex % colors.length],
          width: 2,
        },
        xaxis: yIndex === 0 ? 'x' : `x${yIndex + 1}`,
        yaxis: yIndex === 0 ? 'y' : `y${yIndex + 1}`,
        showlegend: yIndex === 0,
        hoverinfo: 'y+text+name',
        hovertext: case_data.map(
          row => `t: ${row.t?.toFixed(2)}, m: ${row.m?.toFixed(2)}`
        ),
        hoverlabel: {
          bgcolor: isDark ? '#333' : '#FFF',
          font: { size: 13, color: isDark ? '#FFF' : '#000' },
          bordercolor: isDark ? '#555' : '#CCC',
        },
      });
    });
  });

  // -----------------------------
  // 5. Layout
  // -----------------------------
  const plotLayout = {
    ...y_axes,
    ...x_axes,

    paper_bgcolor: paperBgColor,
    plot_bgcolor: baseBgColor,

    font: {
      family: 'Roboto, sans-serif',
      size: 14,
      color: baseFontColor,
    },

    height: n_vars * 500,
    autosize: true,

    showlegend: true,
    legend: {
      orientation: 'h',
      yanchor: 'bottom',
      y: 1.02,
      xanchor: 'center',
      x: 0.5,
      bgcolor: 'rgba(0,0,0,0)',
      bordercolor: baseFontColor,
      borderwidth: 1,
    },

    margin: { l: 60, r: 30, t: 80, b: 50 },
    hovermode: 'x unified',
    modebar: { orientation: 'v' },
  };

  return { data: plotData, layout: plotLayout };
}

// --------------------------------------
// Extract plot data for CSV download
// --------------------------------------
export function extractPlotDataForDownload(
  df_plot,
  axis_choice,
  case_selected,
  cumEO_varname,
  yvar_list
) {
  let x_var;
  switch (axis_choice) {
    case 'Months':
      x_var = 'm';
      break;
    case 'Cumulative EO':
      x_var = cumEO_varname;
      break;
    case 'Time on Stream [Days]':
      x_var = 't';
      break;
    default:
      x_var = 'm';
  }

  return df_plot
    .filter(row => case_selected.includes(row.Case))
    .map(row => {
      const out = { Case: row.Case, row:[x_var] };
      yvar_list.forEach(y => (out[y] = row[y]));
      return out;
    });
}

// --------------------------------------
// CSV Download helper
// --------------------------------------
export function downloadCSV(data, filename = 'plot_data.csv') {
  if (!data?.length) return;

  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(','),
    ...data.map(row => headers.map(h => row[h] ?? '').join(',')),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default {
  createPlotData,
  extractPlotDataForDownload,
  downloadCSV,
};
