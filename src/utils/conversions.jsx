/**
 * Normalize replace_string coming from conversions.json
 * It may be stored as "C" or "[C]" depending on your JSON.
 * We always return bracketed form like "[C]".
 */
function normalizeToken(replaceString, fallbackUnit) {
  const s = (replaceString ?? fallbackUnit ?? '').toString().trim();
  if (!s) return '';
  return s.startsWith('[') && s.endsWith(']') ? s : `[${s}]`;
}

/**
 * Replace a unit suffix reliably.
 * Prefer replacing the exact token (e.g. "[C]" -> "[F]").
 * If not found, replace the last "[...]" suffix at the end of the string.
 */
function replaceUnitSuffix(varName, fromToken, toToken) {
  if (typeof varName !== 'string') return varName;

  // 1) Best: direct token replacement
  if (fromToken && varName.includes(fromToken)) {
    return varName.replace(fromToken, toToken);
  }

  // 2) Fallback: replace trailing [unit] if present
  const suffixRegex = /\[[^\]]+\]\s*$/; // last bracket group
  if (suffixRegex.test(varName)) {
    return varName.replace(suffixRegex, toToken);
  }

  // 3) No suffix -> just append (rare)
  return `${varName} ${toToken}`;
}

/**
 * Safe numeric conversion
 */
function toNumber(v) {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Global conversion engine used by both Projection and Plant data
 */
export function convertUnitsJS(
  df_raw,
  plot_units,
  plot_units_var,
  unit_conversion_dict,
  if_gauge = false,
  atmp = 14.7
) {
  const tempTokenDefault = normalizeToken(unit_conversion_dict?.Temp_Unit?.replace_string, 'C');
  const presTokenDefault = normalizeToken(unit_conversion_dict?.Pres_Unit?.replace_string, 'psia');

  return (df_raw || []).map((row) => {
    const newRow = { ...row };

    // Gauge pressure adjustment
    if (if_gauge) {
      const pKey = `Inlet Pressure ${presTokenDefault}`;
      if (newRow[pKey] !== undefined) {
        newRow[pKey] = (toNumber(newRow[pKey]) ?? 0) - atmp;
      }
    }

    const unit_list = ['Temp_Unit', 'Pres_Unit', 'MassFlow_Unit', 'WorkRate_Unit', 'cumEO_unit'];
    
    for (const unit of unit_list) {
      const selected_unit = plot_units?.[unit];
      const conv = unit_conversion_dict?.[unit];
      if (!selected_unit || !conv) continue;

      const factor = conv[selected_unit];
      const fromToken = normalizeToken(conv.replace_string, conv.default);
      const toToken = `[${selected_unit}]`;

      /**
       * ✅ BROAD SCAN FIX: 
       * Instead of relying on a static list, we scan all keys in the row.
       * If a key contains the 'fromToken', we convert it.
       * This ensures Predicted, Scaled, and Projection variables are ALWAYS converted.
       */
      Object.keys(newRow).forEach(key => {
        if (key.includes(fromToken)) {
          const val = toNumber(newRow[key]);
          if (val !== null) {
            const newVal = val * factor.slope + factor.b;
            const newKey = key.replace(fromToken, toToken);
            newRow[newKey] = newVal;
            
            // Clean up old key if it changed
            if (newKey !== key) {
              delete newRow[key];
            }
          }
        }
      });
    }
    return newRow;
  });
}

/**
 * Converts units for plant-specific data and updates variable list
 */
export function convertUnitsPlantJS(
  df_raw,
  plot_units,
  plot_units_var,
  unit_conversion_dict,
  var_list,
  if_gauge = false,
  atmp = null
) {
  // Use the core engine to convert the data rows
  const df_conv = convertUnitsJS(
    df_raw, 
    plot_units, 
    plot_units_var, 
    unit_conversion_dict, 
    if_gauge, 
    atmp || 14.7
  );
  
  let var_list_final = [...(var_list || [])];

  // Update the variable list suffixes so the UI dropdowns match the new data keys
  const unit_list = ['Temp_Unit', 'Pres_Unit', 'cumEO_unit', 'MassFlow_Unit'];
  for (const unit of unit_list) {
    const selected = plot_units?.[unit];
    const conv = unit_conversion_dict?.[unit];
    if (selected && conv) {
      const from = normalizeToken(conv.replace_string, conv.default);
      const to = `[${selected}]`;
      
      if (from !== to) {
        var_list_final = var_list_final.map(v => {
          if (typeof v !== 'string') return v;
          return replaceUnitSuffix(v, from, to);
        });
      }
    }
  }

  return { df_plot: df_conv, var_list_final };
} 