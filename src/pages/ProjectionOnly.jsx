import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import Plot from 'react-plotly.js';

import {
  Box,
  Tab,
  Tabs,
  CircularProgress,
  Typography,
  Link,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Divider,
  TextField,
  Switch,
  FormControlLabel,
  Paper,
} from '@mui/material';

import { convertUnitsJS } from '../utils/conversions';
import {
  createPlotData,
  extractPlotDataForDownload,
  downloadCSV,
} from '../utils/plotLogic';

import AppSidebar from '../components/AppSidebar';
import dowlogo from '../dowlogo.png';

const API_BASE_URL = 'http://localhost:3000';

const fetchParams = async () => {
  const { data } = await axios.get(`${API_BASE_URL}/api/params`);
  return data;
};

const fetchUsers = async () => {
  const { data } = await axios.get(`${API_BASE_URL}/api/users`);
  return data;
};

const fetchProjectionData = async (userKey, userDict) => {
  if (!userKey || !userDict) return null;
  const { data } = await axios.get(`${API_BASE_URL}/api/projection-data/${userKey}`);
  return data;
};

// -----------------------------
// Tab keys for per-tab caching
// -----------------------------
const TAB_KEYS = {
  EXPLORE: 0,
  TST: 1,
  CE: 2,
  '2X2': 3,
  '1X2': 4,
  '1X1': 5,
};

const TAB_NAMES = Object.fromEntries(
  Object.entries(TAB_KEYS).map(([k, v]) => [v, k])
);

export default function ProjectionOnly() {


 

  // -----------------------------
  // YVar definitions (fullName -> baseName)
  // -----------------------------
  const yVarOptions = {
    'Avg. Bed Temperature [C]': 'Avg. Bed Temperature',

    'C2H4 Consumption Rate [kg/s]': 'C2H4 Consumption Rate',
    'C2H4 Consumption Rate [lb/h]': 'C2H4 Consumption Rate',
    'CO2 Removal Efficiency [%]': 'CO2 Removal Efficiency',
    'Cumulative EO (cat.) [klb/ft3]': 'Cumulative EO (cat.)',
    'Cycle Gas Flow [kmole/hr]': 'Cycle Gas Flow',
    'dEO [%]': 'dEO',
    'EO Partial Pressure [kPa]': 'EO Partial Pressure',
    'EO Production [kg/s]': 'EO Production',
    'GHSV (bed based) [1/h]': 'GHSV (bed based)',
    'GHSV (cat. based) [1/h]': 'GHSV (cat. based)',
    'Inlet C2H4 [%]': 'Inlet C2H4',
    'Inlet CO2 [%]': 'Inlet CO2',
    'Inlet Gas Flow [t/hr]': 'Inlet Gas Flow',
    'Inlet Gas Temperature [C]': 'Inlet Gas Temperature',
    'Inlet O2 [%]': 'Inlet O2',
    'Inlet Pressure [psia]': 'Inlet Pressure',
    'O2 Consumption Rate [kg/s]': 'O2 Consumption Rate',
    'Outlet O2 [%]': 'Outlet O2',
    'Outlet Pressure [psia]': 'Outlet Pressure',
    'Pressure Drop [psia]': 'Pressure Drop',
    'Actual Plant Efficiency [%]': 'Selectivity',
    'Actual Top Shell Temperature [C]': 'Top Shell Temperature',
    'Actual Top Shell Temperature [F]': 'Top Shell Temperature',
    'Work Rate (bed based) [lb/h/ft3]': 'Work Rate (bed based)',
    'Work Rate (cat. based) [lb/h/ft3]': 'Work Rate (cat. based)',
  };

  const groupedYVars = useMemo(() => {
    const grouped = {};
    Object.entries(yVarOptions).forEach(([fullName, baseName]) => {
      if (!grouped[baseName]) grouped[baseName] = [];
      grouped[baseName].push(fullName);
    });
    return grouped;
  }, []);

  const yVarBaseKeys = useMemo(
    () => Object.keys(groupedYVars).sort(),
    [groupedYVars]
  );

  const DEFAULT_PLOT_UNITS = {
    TST_label: 'Top Shell Temperature',
    CE_label: 'Selectivity',
    Temp_Unit: 'C',
    Pres_Unit: 'psia',
    MassFlow_Unit: 'kg/s',
    WorkRate_Unit: 'lb/h/ft3',
    cumEO_unit: 'klb/ft3',
  };

  const [selectedUser, setSelectedUser] = useState('');
  const [plotUnits, setPlotUnits] = useState(DEFAULT_PLOT_UNITS);

  const [ifGauge, setIfGauge] = useState(false);
  const [atmp, setAtmp] = useState(14.7);
  const [cumEOBase, setCumEOBase] = useState('Cat Based');

  const [activeTab, setActiveTab] = useState(0);

  // ✅ Per-tab Y variable cache (this is the core requirement)
  const [yVarsByTab, setYVarsByTab] = useState({
    EXPLORE: [],
    TST: [],
    CE: [],
    '2X2': [],
    '1X2': [],
    '1X1': [],
  });

  const activeTabKey = TAB_NAMES[activeTab];
  const exploreYVars = yVarsByTab[activeTabKey] || [];

  // Other UI states (kept global for simplicity)
  const [exploreAxis, setExploreAxis] = useState('Months');
  const [exploreCases, setExploreCases] = useState([]);
  const [exploreBounds, setExploreBounds] = useState({});


  // -----------------------------
  // Base-name helpers
  // -----------------------------
  const baseVar = (v) =>
  typeof v === 'string'
    ? v.replace(/\s*\[[^\]]+\]\s*$/, '').trim().toLowerCase()
    : v;

  const resolveVar = (base, df_plot) => {
  if (!df_plot || df_plot.length === 0) return base;

  const cols = Object.keys(df_plot[0]);
  
// ✅ DIRECT match
  let found = cols.find(
    (c) =>
      baseVar(c) === base.toLowerCase()
  );

  if (found) return found;

  // ✅ SPECIAL FIX FOR CO2 (MAIN ISSUE)
  if (base.toLowerCase().includes("co2 removal efficiency")) {
    const co2Col = cols.find((c) =>
      c.toLowerCase().includes("co2") &&
      c.toLowerCase().includes("efficiency")
    );
    if (co2Col) return co2Col;
  }

  // ✅ fallback relaxed match
  found = cols.find((c) =>
    c.toLowerCase().includes(base.toLowerCase())
  );

  
  if (found) return found;
   
  

  const candidates = cols.filter(
    (c) => baseVar(c).toLowerCase().trim() === base.toLowerCase().trim()
  );

  // ✅ Relaxed fallback (fix for CO2 / renamed variables)
  if (candidates.length === 0) {
    const relaxed = cols.find((c) =>
      c.toLowerCase().includes(base.toLowerCase())
    );
    if (relaxed) return relaxed;
  }

  if (candidates.length === 0) return base;

  const lower = base.toLowerCase();
  let preferredUnit = null;

  if (
    lower.includes('temperature') ||
    lower.includes('top shell') ||
    lower.includes('avg. bed')
  ) {
    preferredUnit = plotUnits.Temp_Unit;
  } else if (lower.includes('pressure')) {
    preferredUnit = plotUnits.Pres_Unit;
  } else if (
    lower.includes('production') ||
    lower.includes('consumption')
  ) {
    preferredUnit = plotUnits.MassFlow_Unit;
  } else if (lower.includes('work rate')) {
    preferredUnit = plotUnits.WorkRate_Unit;
  } else if (lower.includes('cumulative eo')) {
    preferredUnit = plotUnits.cumEO_unit;
  }

  if (preferredUnit) {
    const hit = candidates.find((c) =>
      c.includes(`[${preferredUnit}]`)
    );
    if (hit) return hit;
  }

  return candidates[0];
};

  // -----------------------------
  // Data loading
  // -----------------------------
  const { data: params, isLoading: isLoadingParams } = useQuery({
    queryKey: ['params'],
    queryFn: fetchParams,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const { data: userDict, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
    staleTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
  });

  const { data: projectionData, isLoading: isLoadingData } = useQuery({
    queryKey: ['projectionData', selectedUser, userDict],
    queryFn: () => fetchProjectionData(selectedUser, userDict),
    enabled: !!userDict && !!selectedUser,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  const { df_plot, cumEO_varname, TST_varname, allCases } = useMemo(() => {
    if (!projectionData || !params) return { df_plot: [], allCases: [] };

    const { df_raw, plot_units_var } = projectionData;
    const { conversions, rename } = params;

    let df_to_convert = df_raw;
    let newPlotUnitsVar = plot_units_var;

    if (rename) {
      const mapAll = { ...rename.rename_proj, ...rename.plant_var_rename };

      df_to_convert = df_raw.map((row) => {
        const newRow = {};
        Object.keys(row).forEach((key) => {
          const newKey = mapAll[key] || key;
          newRow[newKey] = row[key];
        });
        return newRow;
      });

      newPlotUnitsVar = {};
      Object.keys(plot_units_var || {}).forEach((unit) => {
        newPlotUnitsVar[unit] = (plot_units_var[unit] || []).map(
          (name) => mapAll[name] || name
        );
      });
    }

    const df = convertUnitsJS(
      df_to_convert,
      plotUnits,
      newPlotUnitsVar,
      conversions,
      ifGauge,
      atmp
    );

    const allCasesLocal = [...new Set(df.map((row) => row.Case))];

    const TSTName = `${plotUnits.TST_label} [${plotUnits.Temp_Unit}]`;
    const cumEOName =
      cumEOBase === 'Cat Based'
        ? `Cumulative EO (cat.) [${plotUnits.cumEO_unit}]`
        : `Cumulative EO (bed based) [${plotUnits.cumEO_unit}]`;

    return {
      df_plot: df,
      cumEO_varname: cumEOName,
      TST_varname: TSTName,
      allCases: allCasesLocal,
    };
  }, [projectionData, params, plotUnits, ifGauge, atmp, cumEOBase]);

  // ✅ Initialize cases once (don’t keep resetting)
  useEffect(() => {
    if (allCases?.length && exploreCases.length === 0) {
      setExploreCases(allCases);
    }
  }, [allCases, exploreCases.length]);

  // ✅ Initialize/update bounds safely (and fix °F visibility)
  useEffect(() => {
    if (!cumEO_varname || !TST_varname) return;

    setExploreBounds((prev) => {
      const next = { ...prev };

      // axis defaults
      if (!next.m) next.m = [0, 60];
      if (!next.t) next.t = [0, 1800];
      if (!next[cumEO_varname]) next[cumEO_varname] = [0, 400];

      // CE bounds key depends on label
      const ceKey = `${plotUnits.CE_label} [%]`;
      if (!next[ceKey]) next[ceKey] = [80, 100];

      // TST bounds depend on temp unit (this fixes "graph missing in F")
      const isF = plotUnits.Temp_Unit === 'F';
      const defaultTst = isF ? [410, 540] : [210, 280];

      // If missing OR looks like wrong scale, replace
      const curr = next[TST_varname];
      if (
        !curr ||
        !Array.isArray(curr) ||
        (isF && curr[1] <= 300) ||
        (!isF && curr[0] >= 350)
      ) {
        next[TST_varname] = defaultTst;
      }

      return next;
    });
  }, [cumEO_varname, TST_varname, plotUnits.CE_label, plotUnits.Temp_Unit]);

  // ✅ Default selection per tab ONLY first time
  useEffect(() => {
    if (yVarsByTab[activeTabKey]?.length > 0) return;

    if (activeTabKey === 'TST') {
      setYVarsByTab((prev) => ({ ...prev, TST: [plotUnits.TST_label] }));
    } else if (activeTabKey === 'CE') {
      setYVarsByTab((prev) => ({ ...prev, CE: [plotUnits.CE_label] }));
    }
  }, [activeTabKey, yVarsByTab, plotUnits.TST_label, plotUnits.CE_label]);

  const handleTabChange = (_event, newValue) => {
    // ✅ Do NOT reset selections/units here (this is the caching requirement)
    setActiveTab(newValue);
  };

  const handleReset = () => {
    setSelectedUser('');
    setPlotUnits(DEFAULT_PLOT_UNITS);
    setIfGauge(false);
    setAtmp(14.7);
    setCumEOBase('Cat Based');
    setActiveTab(0);

    // ✅ Clear per-tab cache
    setYVarsByTab({
      EXPLORE: [],
      TST: [],
      CE: [],
      '2X2': [],
      '1X2': [],
      '1X1': [],
    });

    setExploreAxis('Months');
    setExploreCases([]);
    setExploreBounds({});
    
  };

  const maxAllowed = useMemo(() => {
    if (activeTab === 3) return 4;
    if (activeTab === 4) return 2;
    if (activeTab === 5) return 1;
    return 999;
  }, [activeTab]);

  // -----------------------------
  // Plot building
  // -----------------------------
  const { plotData, plotLayout } = useMemo(() => {
    if (!df_plot || df_plot.length === 0) return { plotData: [], plotLayout: {} };
    if (!exploreYVars?.length) return { plotData: [], plotLayout: {} };

    const resolvedYList = exploreYVars.map((base) => resolveVar(base, df_plot));

    let args = {};
    switch (activeTab) {
      case 0:
        args = {
          yvar_list: resolvedYList,
          plot_format: 'NX1',
          axis_choice: exploreAxis,
          bounds: exploreBounds,
        };
        break;
      case 1:
        args = { yvar_list: [TST_varname], plot_format: '1X1', axis_choice: exploreAxis, bounds: exploreBounds };
        break;
      case 2:
        args = { yvar_list: [`${plotUnits.CE_label} [%]`], plot_format: '1X1', axis_choice: exploreAxis, bounds: exploreBounds };
        break;
      default:
        args = {
          yvar_list: resolvedYList,
          plot_format: 'NX1',
          axis_choice: exploreAxis,
          bounds: exploreBounds,
        };
    }

    const { data, layout } = createPlotData(
      df_plot,
      args.axis_choice,
      exploreCases,
      cumEO_varname,
      args.bounds,
      args.yvar_list,
      args.plot_format,
   
    );

    return { plotData: data, plotLayout: layout };
  }, [
    df_plot,
    activeTab,
    cumEO_varname,
    TST_varname,
    plotUnits.CE_label,
    exploreYVars,
    exploreAxis,
    exploreCases,
    exploreBounds,
    
  ]);

  if (isLoadingParams || isLoadingUsers) {
    return <div>Loading application parameters...</div>;
  }

  const userlist = userDict ? Object.keys(userDict) : [];

  const resolvedSingle = (base) => resolveVar(base, df_plot);
 

  // Setter that updates ONLY the active tab cache (used by AppSidebar + right selector)
  const setActiveTabYVars = (valsOrFn) => {
    setYVarsByTab((prev) => {
      const nextVals =
        typeof valsOrFn === 'function' ? valsOrFn(prev[activeTabKey] || []) : valsOrFn;

      return { ...prev, [activeTabKey]: nextVals };
    });
  };

  
console.log("Columns:", Object.keys(df_plot[0] || {}));


  return (
    <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 320px', gap: '0px' }}>
      {/* Left Sidebar */}
      <AppSidebar
        userList={userlist}
        params={params}
        selectedUser={selectedUser}
        plotUnits={plotUnits}
        ifGauge={ifGauge}
        atmp={atmp}
        cumEOBase={cumEOBase}
        onUserChange={setSelectedUser}
        onPlotUnitsChange={setPlotUnits}
        onIfGaugeChange={setIfGauge}
        onAtmpChange={setAtmp}
        onCumEOBaseChange={setCumEOBase}
        // ✅ keep compatibility: sidebar can set yvars
        exploreYVars={setActiveTabYVars}
        exploreAxis={setExploreAxis}
        exploreCases={setExploreCases}
      />

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, p: 0.5 }}>
        <Typography variant="h4" gutterBottom>
          Model Projection
        </Typography>


        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab label="Explore" />
            <Tab label="TST" />
            <Tab label="CE" />
            <Tab label="2x2" />
            <Tab label="1x2" />
            <Tab label="1x1" />
          </Tabs>
        </Box>

        {/* Plot Section */}
        {isLoadingData ? (
          <CircularProgress sx={{ mt: 4 }} />
        ) : (
          <>
            {exploreYVars.length === 0 ? (
              <Typography variant="body2" sx={{ mt: 4 }}>
                Please select one or more Y variables to generate the graph.
              </Typography>
            ) : activeTab === 3 ? (
              // 2x2
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                  gridAutoRows: { xs: 'minmax(260px, 45vh)', md: '1fr' },
                  gap: 2,
                  width: '100%',
                  height: { xs: 'auto', md: 'calc((100vw - 300px) / 1)' },
                  maxHeight: { md: '900px' },
                }}
              >
                {exploreYVars.slice(0, 4).map((base) => {
                  const yvar = resolvedSingle(base);
                  const { data, layout } = createPlotData(
                    df_plot,
                    exploreAxis,
                    exploreCases,
                    cumEO_varname,
                    exploreBounds,
                    [yvar],
                    '1X1',
             
                  );

                  return (
                    <Box
                      key={base}
                      sx={{
                        width: '100%',
                        height: '100%',
                        aspectRatio: { xs: 'auto', md: '1 / 1' },
                        minHeight: 260,
                        borderRadius: 1,
                        overflow: 'hidden',
                      }}
                    >
                      <Plot
                        data={data}
                        layout={{ ...layout, autosize: true, margin: { l: 55, r: 20, t: 35, b: 45 } }}
                        style={{ width: '100%', height: '100%' }}
                        useResizeHandler
                        config={{ responsive: true, displayModeBar: true }}
                      />
                    </Box>
                  );
                })}
              </Box>
            ) : activeTab === 4 ? (
              // 1x2
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                  gap: 2,
                  width: '100%',
                  alignItems: 'stretch',
                }}
              >
                {exploreYVars.slice(0, 2).map((base) => {
                  const yvar = resolvedSingle(base);
                  const { data, layout } = createPlotData(
                    df_plot,
                    exploreAxis,
                    exploreCases,
                    cumEO_varname,
                    exploreBounds,
                    [yvar],
                    '1X1',
                    
                  );

                  return (
                    <Box
                      key={base}
                      sx={{
                        width: '100%',
                        height: { xs: '55vh', md: '78vh' },
                        minHeight: 320,
                        maxHeight: 520,
                        borderRadius: 1,
                        overflow: 'hidden',
                      }}
                    >
                      <Plot
                        data={data}
                        layout={{ ...layout, autosize: true, margin: { l: 55, r: 20, t: 40, b: 45 } }}
                        style={{ width: '100%', height: '100%' }}
                        useResizeHandler
                        config={{ responsive: true, displayModeBar: true }}
                      />
                    </Box>
                  );
                })}
              </Box>
            ) : activeTab === 5 ? (
              // 1x1
              (() => {
                const base = exploreYVars[0];
                const yvar = resolvedSingle(base);
                const { data, layout } = createPlotData(
                  df_plot,
                  exploreAxis,
                  exploreCases,
                  cumEO_varname,
                  exploreBounds,
                  [yvar],
                  '1X1',
                 
                );

                return (
                  <Box
                    sx={{
                      width: '100%',
                      height: { xs: '60vh', md: '70vh' },
                      minHeight: 420,
                      borderRadius: 1,
                      overflow: 'hidden',
                    }}
                  >
                    <Plot
                      data={data}
                      layout={{ ...layout, autosize: true, margin: { l: 60, r: 25, t: 45, b: 55 } }}
                      style={{ width: '100%', height: '100%' }}
                      useResizeHandler
                      config={{ responsive: true, displayModeBar: true }}
                    />
                  </Box>
                );
              })()
            ) : (
              // Default: one chart per selected base var
              <Box sx={{ mt: 4 }}>
                {exploreYVars.map((base) => {
                  const yvar = resolvedSingle(base);
                  const { data, layout } = createPlotData(
                    df_plot,
                    exploreAxis,
                    exploreCases,
                    cumEO_varname,
                    exploreBounds,
                    [yvar],
                    '1X1',
                    
                  );

                  return (
                    <Box key={base} sx={{ mb: 6 }}>
                      <Typography variant="h6" gutterBottom>
                        {base}
                      </Typography>
                      <Plot
                        data={data}
                        layout={layout}
                        useResizeHandler
                        style={{ width: '100%', height: '500px' }}
                        config={{ responsive: true }}
                      />
                    </Box>
                  );
                })}
              </Box>
            )}
          </>
        )}
      </Box>

      {/* Right Sidebar */}
      <Box
        sx={{
          width: 320,
          p: 2,
          borderLeft: '1px solid rgba(0,0,0,0.05)',
          backgroundColor: 'rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          position: 'sticky',
          top: 0,
          height: '100vh',
          boxShadow: 'inset 0 0 10px rgba(0,0,0,0.05)',
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Controls
        </Typography>
        <Divider />

       

        {/* Cases Selector */}
        <FormControl fullWidth>
          <InputLabel id="case-select-label">Cases</InputLabel>
          <Select
            labelId="case-select-label"
            multiple
            value={exploreCases}
            onChange={(e) => setExploreCases(e.target.value)}
            renderValue={(selected) => selected.join(', ')}
          >
            {allCases?.map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Y Variables Selector (BASE names only, deduped) */}
        <FormControl fullWidth>
          <InputLabel id="yvar-select-label">Y Variables</InputLabel>
          <Select
            labelId="yvar-select-label"
            multiple
            value={exploreYVars}
            onChange={(e) => {
              const values = e.target.value;
              if (values.length > maxAllowed) return;
              setActiveTabYVars(values);
            }}
            renderValue={(selected) => selected.join(', ')}
          >
            {yVarBaseKeys
              .filter((base) => activeTab !== 1 || base === plotUnits.TST_label)
              .filter((base) => activeTab !== 2 || base === plotUnits.CE_label)
              .map((base) => {
                const disabled =
                  exploreYVars.length >= maxAllowed && !exploreYVars.includes(base);
                return (
                  <MenuItem key={base} value={base} disabled={disabled}>
                    {base}
                  </MenuItem>
                );
              })}
          </Select>
        </FormControl>

        {/* Explore Axis Selector */}
        <FormControl fullWidth>
          <InputLabel id="axis-select-label">Explore Axis</InputLabel>
          <Select
            labelId="axis-select-label"
            value={exploreAxis}
            onChange={(e) => setExploreAxis(e.target.value)}
          >
            {['Months', 'Time on Stream [Days]', 'Cumulative EO'].map((axis) => (
              <MenuItem key={axis} value={axis}>
                {axis}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Background Logo */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 50,
            left: 60,
            width: '60%',
            height: '150px',
            backgroundImage: `url(${dowlogo})`,
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            opacity: 0.5,
            zIndex: 5,
            pointerEvents: 'none',
          }}
        />

        {/* Axis bounds */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {exploreAxis === 'Months' && (
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              <TextField
                label="Min Month"
                type="number"
                value={exploreBounds.m?.[0] ?? ''}
                onChange={(e) => {
                  const min = Number(e.target.value);
                  setExploreBounds((prev) => ({ ...prev, m: [min, prev.m?.[1]] }));
                }}
              />
              <TextField
                label="Max Month"
                type="number"
                value={exploreBounds.m?.[1] ?? ''}
                onChange={(e) => {
                  const max = Number(e.target.value);
                  setExploreBounds((prev) => ({ ...prev, m: [prev.m?.[0], max] }));
                }}
              />
            </Box>
          )}

          {exploreAxis === 'Time on Stream [Days]' && (
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              <TextField
                label="Min Time on Stream"
                type="number"
                value={exploreBounds.t?.[0] ?? ''}
                onChange={(e) => {
                  const min = Number(e.target.value);
                  setExploreBounds((prev) => ({ ...prev, t: [min, prev.t?.[1]] }));
                }}
              />
              <TextField
                label="Max Time on Stream"
                type="number"
                value={exploreBounds.t?.[1] ?? ''}
                onChange={(e) => {
                  const max = Number(e.target.value);
                  setExploreBounds((prev) => ({ ...prev, t: [prev.t?.[0], max] }));
                }}
              />
            </Box>
          )}

          {exploreAxis === 'Cumulative EO' && (
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              <TextField
                label="Min Cumulative EO"
                type="number"
                value={exploreBounds[cumEO_varname]?.[0] ?? ''}
                onChange={(e) => {
                  const min = Number(e.target.value);
                  setExploreBounds((prev) => ({
                    ...prev,
                    [cumEO_varname]: [min, prev[cumEO_varname]?.[1]],
                  }));
                }}
              />
              <TextField
                label="Max Cumulative EO"
                type="number"
                value={exploreBounds[cumEO_varname]?.[1] ?? ''}
                onChange={(e) => {
                  const max = Number(e.target.value);
                  setExploreBounds((prev) => ({
                    ...prev,
                    [cumEO_varname]: [prev[cumEO_varname]?.[0], max],
                  }));
                }}
              />
            </Box>
          )}
        </Box>

        {/* Min/Max bounds per selected Y (use resolved key) */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {exploreYVars.map((base) => {
            const resolved = resolvedSingle(base);

            return (
              <Box key={base} sx={{ display: 'flex', gap: 1, mt: 1 }}>
                <TextField
                  label={`Min ${base}`}
                  type="number"
                  value={exploreBounds[resolved]?.[0] ?? ''}
                  onChange={(e) => {
                    const min = Number(e.target.value);
                    setExploreBounds((prev) => ({
                      ...prev,
                      [resolved]: [min, prev[resolved]?.[1]],
                    }));
                  }}
                />
                <TextField
                  label={`Max ${base}`}
                  type="number"
                  value={exploreBounds[resolved]?.[1] ?? ''}
                  onChange={(e) => {
                    const max = Number(e.target.value);
                    setExploreBounds((prev) => ({
                      ...prev,
                      [resolved]: [prev[resolved]?.[0], max],
                    }));
                  }}
                />
              </Box>
            );
          })}
        </Box>

        <Divider />

        {/* Reset */}
        <Button
          variant="contained"
          onClick={handleReset}
          sx={{
            alignSelf: 'flex-start',
            mt: 1,
            backgroundColor: '#282c34',
            color: '#61dafb',
            '&:hover': { backgroundColor: '#4db8e6' },
          }}
        >
          Reset All
        </Button>

        {/* Download plot data (resolved) */}
        <Button
          variant="outlined"
          size="small"
          onClick={() => {
            const resolvedYVars = (exploreYVars || []).map((b) => resolveVar(b, df_plot));
            const dataToDownload = extractPlotDataForDownload(
              df_plot,
              exploreAxis,
              exploreCases,
              cumEO_varname,
              resolvedYVars
            );

            downloadCSV(
              dataToDownload,
              `Projection_${exploreAxis}_${exploreYVars.join('_')}.csv`
            );
          }}
        >
          Download Plot Data
        </Button>
      </Box>
    </div>
  );
}