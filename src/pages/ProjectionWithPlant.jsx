// ProjectionWithPlant.jsx — Robust Unit Persistence & Universal Variable Mapping
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import Plot from 'react-plotly.js';

import { Grid, Card, CardContent, CardHeader, IconButton, Button } from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

import {
  Box,
  Tab,
  Tabs,
  CircularProgress,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  TextField,
} from '@mui/material';

import { convertUnitsPlantJS, convertUnitsJS } from '../utils/conversions';
import { plotMultipleY_Plant, plotPlantOnly, plotPlantSC } from '../utils/plantPlotLogic';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000';
const AXIS_OPTIONS = ['Months', 'Time on Stream [Days]', 'Cumulative EO'];

const displayLabel = (v) => {
  if (!v || typeof v !== 'string') return ""; 
  return v.split(' [')[0];
};

const fetchProjectionData = async (userKey, userDict) => {
  if (!userKey || !userDict) return null;
  const { data } = await axios.get(`${API_BASE_URL}/api/projection-data/${encodeURIComponent(userKey)}`);
  return data;
};

const fetchPlantData = async (selected_plant_list, table_name) => {
  if (!selected_plant_list || selected_plant_list.length === 0) return { df_plant: [], var_list_plot: [], plot_units_var: {} };
  const { data } = await axios.post(`${API_BASE_URL}/api/plant-data`, { selected_plant_list, table_name });
  return data;
};

const fetchModelList = async (selected_plant_list, table_name) => {
  if (!selected_plant_list || selected_plant_list.length === 0) return [];
  const { data } = await axios.post(`${API_BASE_URL}/api/model-list`, { selected_plant_list, table_name });
  return data ?? [];
};

function mapDataForTab(row, plotUnits, tabIndex) {
  if (!row || typeof row !== 'object') return row;
  const tempUnit = plotUnits.Temp_Unit || 'C';
  const ceLabel = `${plotUnits.CE_label} [%]`;
  const tstLabel = `${plotUnits.TST_label} [${tempUnit}]`;

  const actualCE = row['Selectivity [%]'] ?? row['Actual CE'] ?? row['Actual Plant Efficiency [%]'];
  const actualTST = row[`Top Shell Temperature [${tempUnit}]`] ?? row[`Actual TST [${tempUnit}]`] ?? row[`Top Shell Temperature [C]`];
  
  const predCE = row['Predicted CE [%]'] ?? row['Predicted CE'] ?? row['(Direct) Predicted Selectivity (%)'];
  const predTST = row[`Predicted TST [${tempUnit}]`] ?? row[`Predicted TST [C]`] ?? row['Predicted TST'];

  const scaledCE = row['Scaled CE [%]'] ?? row['Scaled Selectivity (%)'];
  const scaledTST = row[`Scaled TST [${tempUnit}]`] ?? row[`Scaled TST (°C)`];

  const isModelRow = row.Model && String(row.Model).toLowerCase() !== 'plant data';

  if (tabIndex === 0 || tabIndex === 1) {
    row[ceLabel] = actualCE;
    row[tstLabel] = actualTST;
  } else if (tabIndex === 2) {
    row[ceLabel] = isModelRow ? (predCE ?? actualCE) : actualCE;
    row[tstLabel] = isModelRow ? (predTST ?? actualTST) : actualTST;
  } else if (tabIndex === 3) {
    row[ceLabel] = isModelRow ? (scaledCE ?? actualCE) : actualCE;
    row[tstLabel] = isModelRow ? (scaledTST ?? actualTST) : actualTST;
  }

  const projTSTKey = `Projection TST [${tempUnit}]`;
  const scaledTSTKey = `Scaled TST [${tempUnit}]`;

  if (row[projTSTKey] !== undefined) row['Projection TST'] = row[projTSTKey];
  if (row[scaledTSTKey] !== undefined) row['Scaled TST'] = row[scaledTSTKey];
  if (row['Projection CE [%]'] !== undefined) row['Projection CE'] = row['Projection CE [%]'];
  if (row['Scaled CE [%]'] !== undefined) row['Scaled CE'] = row['Scaled CE [%]'];

  row['Eocat'] = row.eocat || row.Eocat;

  return row;
}

export default function ProjectionWithPlant({
  selectedUser, plotUnits, selectedPlants: parentSelectedPlants, useAllPlants: parentUseAllPlants, ifGauge, atmp, params, userDict,
}) {
  const [activeTab, setActiveTab] = useState(0);
  const selectedPlants = parentSelectedPlants ?? [];
  const useAllPlants = parentUseAllPlants;

  // States
  const [selectedYVarsProj, setSelectedYVarsProj] = useState([]);
  const [selectedYVarsPlant, setSelectedYVarsPlant] = useState([]);
  
  const [selectedAxisProj, setSelectedAxisProj] = useState('Months');
  const [selectedAxisPlant, setSelectedAxisPlant] = useState('Months');
  
  // ✅ FIX: Split single model filter state into two tab-independent state hooks
  const [selectedModelPv, setSelectedModelPv] = useState('All');
  const [selectedModelSc, setSelectedModelSc] = useState('All');
  const [cardAxisRanges, setCardAxisRanges] = useState({});

  // Axis Handlers
  const setCardAxisValue = useCallback((yVar, axis, field, value) => {
    const num = value === '' ? undefined : Number(value);
    const tabSpecificKey = `${activeTab}_${yVar}`;
    
    setCardAxisRanges(prev => ({ 
      ...prev, 
      [tabSpecificKey]: { ...(prev[tabSpecificKey] || {}), [axis]: { ...((prev[tabSpecificKey] && prev[tabSpecificKey][axis]) || {}), [field]: num } } 
    }));
  }, [activeTab]);

  const resetCardAxis = useCallback((yVar) => {
    const tabSpecificKey = `${activeTab}_${yVar}`;
    setCardAxisRanges(prev => { const next = { ...prev }; delete next[tabSpecificKey]; return next; });
  }, [activeTab]);

  // Queries
  const { data: projectionData } = useQuery({
    queryKey: ['projectionData', selectedUser, userDict],
    queryFn: () => fetchProjectionData(selectedUser, userDict),
    enabled: !!userDict && !!selectedUser,
  });

  const tableName = useMemo(() => useAllPlants ? 'plant_data_new' : `plant_data_${selectedUser}`, [useAllPlants, selectedUser]);

  const { data: plantData, isLoading: isLoadingPlantData } = useQuery({
    queryKey: ['plantData', selectedPlants, tableName],
    queryFn: () => fetchPlantData(selectedPlants, tableName),
    enabled: selectedPlants.length > 0,
  });

  const { data: modelList = [] } = useQuery({
    queryKey: ['modelList', selectedPlants, tableName],
    queryFn: () => fetchModelList(selectedPlants, tableName),
    enabled: (activeTab === 2 || activeTab === 3) && selectedPlants.length > 0,
  });

  // Data Processing
  const { df_final, df_plant_converted, var_list_final } = useMemo(() => {
    if (!projectionData || !plantData || !params) return { df_final: [], df_plant_converted: [], var_list_final: [] };

    const df_plot_raw = convertUnitsJS(projectionData.df_raw, plotUnits, projectionData.plot_units_var, params.conversions, ifGauge, atmp) || [];
    const df_plot_mapped = df_plot_raw.map(row => mapDataForTab({ ...row, Case: row.Case }, plotUnits, activeTab));

    const plantConv = convertUnitsPlantJS(plantData.df_plant, plotUnits, plantData.plot_units_var, params.conversions, plantData.var_list_plot, ifGauge, atmp);
    const df_plant_mapped = (plantConv?.df_plot || []).flatMap(row => {
      const baseRow = { ...row, Model: row.modelname || row.Model || 'Plant Data' };
      const modelRow = mapDataForTab(baseRow, plotUnits, activeTab);
      const plantRow = mapDataForTab({ ...row, Model: 'Plant Data' }, plotUnits, activeTab);
      return [modelRow, plantRow];
    });

    const vlf = Array.from(new Set([
      ...Object.keys(df_plot_mapped[0] || {}),
      ...plantConv.var_list_final,
      `${plotUnits.CE_label} [%]`,
      `${plotUnits.TST_label} [${plotUnits.Temp_Unit}]`
    ])).filter(key => 
      key && typeof key === 'string' && !['Case', 't', 'm', 'eo', 'color', 'Eocat', 'Plant', 'Model', 'Date'].includes(key)
    );

    return {
      df_final: [...df_plant_mapped.map(r => ({...r, Case: r.Plant})), ...df_plot_mapped],
      df_plant_converted: df_plant_mapped,
      var_list_final: vlf
    };
  }, [projectionData, plantData, params, plotUnits, ifGauge, atmp, activeTab]);

  useEffect(() => {
    if (!var_list_final?.length) return;
    const defaults = [`${plotUnits.CE_label} [%]`, `${plotUnits.TST_label} [${plotUnits.Temp_Unit || 'C'}]`].filter(v => var_list_final.includes(v));
    
    setSelectedYVarsProj(prev => {
        if (prev.length === 0) return defaults;
        return prev.map(oldVar => {
            const baseName = oldVar.split(' [')[0];
            return var_list_final.find(v => v.startsWith(baseName)) || oldVar;
        });
    });

    setSelectedYVarsPlant(prev => {
        if (prev.length === 0) return defaults;
        return prev.map(oldVar => {
            const baseName = oldVar.split(' [')[0];
            return var_list_final.find(v => v.startsWith(baseName)) || oldVar;
        });
    });
  }, [var_list_final, plotUnits, activeTab]);

  const currentAxisChoice = useMemo(() => activeTab === 0 ? selectedAxisProj : selectedAxisPlant, [activeTab, selectedAxisProj, selectedAxisPlant]);
  const xKey = useMemo(() => (activeTab === 3 || activeTab === 2 || currentAxisChoice === 'Cumulative EO') ? 'Eocat' : (currentAxisChoice === 'Months' ? 'm' : 't'), [currentAxisChoice, activeTab]);

  const bounds = {
    CE_range: [80, 100],
    TST_range: plotUnits.Temp_Unit === 'C' ? [210, 280] : [410, 540],
    cumEO_range: [0, 400],
  };

  // ✅ HANDLES DYNAMIC DATA DOWNLOAD PER EACH TAB STATE
  const handleDownloadData = () => {
    let dataset = [];
    let titleStr = 'tab_export';

    if (activeTab === 0) {
      dataset = df_final;
      titleStr = 'projection_with_plant_data';
    } else if (activeTab === 1) {
      dataset = df_plant_converted;
      titleStr = 'plant_only_performance_data';
    } else if (activeTab === 2) {
      dataset = df_plant_converted.filter(r => 
        selectedModelPv === 'All' || 
        String(r.Model).toLowerCase() === String(selectedModelPv).toLowerCase() || 
        String(r.Model).toLowerCase() === 'plant data'
      );
      titleStr = `pv_prediction_model_${selectedModelPv}_data`;
    } else if (activeTab === 3) {
      dataset = df_plant_converted.filter(r => 
        selectedModelSc === 'All' || 
        String(r.Model).toLowerCase() === String(selectedModelSc).toLowerCase() || 
        String(r.Model).toLowerCase() === 'plant data'
      ).map(r => {
        const isModel = r.Model && String(r.Model).toLowerCase() !== 'plant data';
        return { ...r, Plant: isModel ? r.Model : 'Plant Data' };
      });
      titleStr = `common_scaling_model_${selectedModelSc}_data`;
    }

    if (!dataset || dataset.length === 0) return;

    const columnHeaders = Array.from(new Set(dataset.flatMap(row => Object.keys(row || {}))));
    const csvContentLines = [columnHeaders.join(',')];
    
    dataset.forEach(row => {
      const fieldValues = columnHeaders.map(header => {
        const targetVal = row[header];
        if (targetVal === null || targetVal === undefined) return '';
        if (targetVal instanceof Date) return targetVal.toISOString().split('T')[0];
        
        const rawString = String(targetVal);
        if (rawString.includes(',') || rawString.includes('"') || rawString.includes('\n')) {
          return `"${rawString.replace(/"/g, '""')}"`;
        }
        return rawString;
      });
      csvContentLines.push(fieldValues.join(','));
    });
    
    const fileBlob = new Blob([csvContentLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const blobUrl = URL.createObjectURL(fileBlob);
    const hiddenAnchor = document.createElement("a");
    hiddenAnchor.setAttribute("href", blobUrl);
    hiddenAnchor.setAttribute("download", `${titleStr}.csv`);
    hiddenAnchor.style.visibility = 'hidden';
    document.body.appendChild(hiddenAnchor);
    hiddenAnchor.click();
    document.body.removeChild(hiddenAnchor);
  };

  return (
    <Box sx={{ display: 'flex', gap: 2, p: 2, width: '100%' }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="h5" gutterBottom>Model Projection & Plant Performance</Typography>
        <Tabs value={activeTab} onChange={(_e, v) => setActiveTab(v)} sx={{ mt: 2 }}>
          <Tab label="Projection + Plant" />
          <Tab label="Plant" />
          <Tab label="PV Prediction vs Plant" />
          <Tab label="Common Scaling" />
        </Tabs>

        {isLoadingPlantData ? <CircularProgress size={24} sx={{ mt: 3 }} /> : (
          <>
            {/* ✅ ACTION HEADER FLEX CONTAINER BOX BAR */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2, alignItems: 'center', width: '100%' }}>
              {activeTab < 2 && (
                <FormControl sx={{ minWidth: 320 }}>
                  <InputLabel>Variables</InputLabel>
                  <Select 
                    multiple 
                    value={activeTab === 0 ? selectedYVarsProj : selectedYVarsPlant} 
                    onChange={(e) => activeTab === 0 ? setSelectedYVarsProj(e.target.value) : setSelectedYVarsPlant(e.target.value)} 
                    input={<OutlinedInput label="Variables" />} 
                    renderValue={(s) => s.filter(Boolean).map(displayLabel).join(', ')}
                  >
                    {var_list_final.filter(Boolean).map(v => <MenuItem key={v} value={v}>{displayLabel(v)}</MenuItem>)}
                  </Select>
                </FormControl>
              )}

              {(activeTab === 2 || activeTab === 3) && (
                <FormControl sx={{ minWidth: 240 }}>
                  <InputLabel>Model</InputLabel>
                  <Select 
                    value={activeTab === 2 ? selectedModelPv : selectedModelSc} 
                    onChange={(e) => activeTab === 2 ? setSelectedModelPv(e.target.value) : setSelectedModelSc(e.target.value)} 
                    label="Model"
                  >
                    <MenuItem value="All">All</MenuItem>
                    {modelList.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                  </Select>
                </FormControl>
              )}

              {activeTab < 2 && (
                <FormControl sx={{ minWidth: 240 }}>
                  <InputLabel>Time Measure</InputLabel>
                  <Select 
                    value={activeTab === 0 ? selectedAxisProj : selectedAxisPlant} 
                    onChange={(e) => activeTab === 0 ? setSelectedAxisProj(e.target.value) : setSelectedAxisPlant(e.target.value)}
                  >
                    {AXIS_OPTIONS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                  </Select>
                </FormControl>
              )}

              {/* ✅ CSV SEED EXPORT DOWNLOAD LINK TRIGGER */}
              <Button 
                variant="contained" 
                onClick={handleDownloadData}
                disabled={!df_final || df_final.length === 0}
                sx={{ 
                  ml: 'auto', 
                  height: 40, 
                  backgroundColor: '#10B981', 
                  color: '#fff',
                  fontWeight: 'bold',
                  textTransform: 'none',
                  borderRadius: 2,
                  '&:hover': { backgroundColor: '#059669' } 
                }}
              >
                Download Tab Data (.csv)
              </Button>
            </Box>

            <Box sx={{ mt: 3, width: '100%' }}>
              {activeTab === 2 || activeTab === 3 ? (
                // ✅ FIXED LAYOUT OUTER CONTAINER: Keeps all grid items inside browser screen limits
                <Grid container spacing={3}>
                  {selectedPlants.map((plantName) => {
                    const plantSpecificData = df_plant_converted.filter(r => 
                      (activeTab === 3) ? true : (r.Plant === plantName)
                    );

                    // ✅ FIX: Determine which state variable to read from contextually
                    const currentSelectedModel = activeTab === 2 ? selectedModelPv : selectedModelSc;

                    const filteredData = plantSpecificData.filter(r => 
                      currentSelectedModel === 'All' || 
                      String(r.Model).toLowerCase() === String(currentSelectedModel).toLowerCase() || 
                      String(r.Model).toLowerCase() === 'plant data'
                    );

                    const CE_var = `${plotUnits.CE_label} [%]`;
                    const TST_var = `${plotUnits.TST_label} [${plotUnits.Temp_Unit}]`;
                    const cumEOLabel = `Cumulative EO (${plotUnits.cumEO_unit || 'klb/ft3'})`;

                    if (activeTab === 2) {
                      const tabRanges = {
                        [CE_var]: cardAxisRanges[`2_${CE_var}`],
                        [TST_var]: cardAxisRanges[`2_${TST_var}`]
                      };

                      const cePlot = plotPlantOnly(filteredData, bounds, cumEOLabel, [CE_var, null], tabRanges);
                      const tstPlot = plotPlantOnly(filteredData, bounds, cumEOLabel, [null, TST_var], tabRanges);

                      return (
                        <React.Fragment key={plantName}>
                          {/* Selectivity Card */}
                          <Grid item xs={12} lg={6} width="100%">
                            <Card elevation={4} sx={{ borderRadius: 3, border: '1px solid #E0E0E0' }}>
                              <CardHeader title={`Selectivity - ${plantName}`} action={<IconButton onClick={() => resetCardAxis(CE_var)}><RestartAltIcon /></IconButton>} />
                              <CardContent>
                                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 2 }}>
                                  <TextField label="X Min" size="small" type="number" value={cardAxisRanges[`2_${CE_var}`]?.x?.min ?? ''} onChange={(e) => setCardAxisValue(CE_var, 'x', 'min', e.target.value)} />
                                  <TextField label="X Max" size="small" type="number" value={cardAxisRanges[`2_${CE_var}`]?.x?.max ?? ''} onChange={(e) => setCardAxisValue(CE_var, 'x', 'max', e.target.value)} />
                                  <TextField label="Y Min" size="small" type="number" value={cardAxisRanges[`2_${CE_var}`]?.y?.min ?? ''} onChange={(e) => setCardAxisValue(CE_var, 'y', 'min', e.target.value)} />
                                  <TextField label="Y Max" size="small" type="number" value={cardAxisRanges[`2_${CE_var}`]?.y?.max ?? ''} onChange={(e) => setCardAxisValue(CE_var, 'y', 'max', e.target.value)} />
                                </Box>
                                <Plot data={cePlot.data} layout={{ ...cePlot.layout, autosize: true }} useResizeHandler={true} style={{ width: '100%', height: '100%' }} config={{ responsive: true, displaylogo: false }} />
                              </CardContent>
                            </Card>
                          </Grid>

                          {/* Top Shell Temp Card */}
                          <Grid item xs={12} lg={6} width="100%">
                            <Card elevation={4} sx={{ borderRadius: 3, border: '1px solid #E0E0E0' }}>
                              <CardHeader title={`Top Shell Temperature - ${plantName}`} action={<IconButton onClick={() => resetCardAxis(TST_var)}><RestartAltIcon /></IconButton>} />
                              <CardContent>
                                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 2 }}>
                                  <TextField label="X Min" size="small" type="number" value={cardAxisRanges[`2_${TST_var}`]?.x?.min ?? ''} onChange={(e) => setCardAxisValue(TST_var, 'x', 'min', e.target.value)} />
                                  <TextField label="X Max" size="small" type="number" value={cardAxisRanges[`2_${TST_var}`]?.x?.max ?? ''} onChange={(e) => setCardAxisValue(TST_var, 'x', 'max', e.target.value)} />
                                  <TextField label="Y Min" size="small" type="number" value={cardAxisRanges[`2_${TST_var}`]?.y?.min ?? ''} onChange={(e) => setCardAxisValue(TST_var, 'y', 'min', e.target.value)} />
                                  <TextField label="Y Max" size="small" type="number" value={cardAxisRanges[`2_${TST_var}`]?.y?.max ?? ''} onChange={(e) => setCardAxisValue(TST_var, 'y', 'max', e.target.value)} />
                                </Box>
                                <Plot data={tstPlot.data} layout={{ ...tstPlot.layout, autosize: true }} useResizeHandler={true} style={{ width: '100%', height: '100%' }} config={{ responsive: true, displaylogo: false }} />
                              </CardContent>
                            </Card>
                          </Grid>
                        </React.Fragment>
                      );
                    } else {
                      // ✅ FIXED TAB 3 LOOP LAYOUT: Elements are properly separated into cleanly broken container columns
                      const df_for_sc = filteredData.map(r => {
                        const isModel = r.Model && String(r.Model).toLowerCase() !== 'plant data';
                        return { ...r, Plant: isModel ? r.Model : 'Plant Data' };
                      });

                      const tabRangesSC = {
                        [CE_var]: cardAxisRanges[`3_${CE_var}`],
                        [TST_var]: cardAxisRanges[`3_${TST_var}`]
                      };

                      const cePlotSC = plotPlantSC(df_for_sc, df_for_sc, bounds, cumEOLabel, CE_var, 'Projection CE', tabRangesSC);
                      const tstPlotSC = plotPlantSC(df_for_sc, df_for_sc, bounds, cumEOLabel, TST_var, 'Projection TST', tabRangesSC);
                      
                      return (
                        <React.Fragment key={plantName}>
                          {/* Common Scaling Selectivity Card */}
                          <Grid item xs={12} lg={6} width="100%">
                            <Card elevation={4} sx={{ borderRadius: 3, border: '1px solid #E0E0E0' }}>
                              <CardHeader title={`Common Scaling Selectivity - ${plantName}`} action={<IconButton onClick={() => resetCardAxis(CE_var)}><RestartAltIcon /></IconButton>} />
                              <CardContent>
                                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 2 }}>
                                  <TextField label="X Min" size="small" type="number" value={cardAxisRanges[`3_${CE_var}`]?.x?.min ?? ''} onChange={(e) => setCardAxisValue(CE_var, 'x', 'min', e.target.value)} />
                                  <TextField label="X Max" size="small" type="number" value={cardAxisRanges[`3_${CE_var}`]?.x?.max ?? ''} onChange={(e) => setCardAxisValue(CE_var, 'x', 'max', e.target.value)} />
                                  <TextField label="Y Min" size="small" type="number" value={cardAxisRanges[`3_${CE_var}`]?.y?.min ?? ''} onChange={(e) => setCardAxisValue(CE_var, 'y', 'min', e.target.value)} />
                                  <TextField label="Y Max" size="small" type="number" value={cardAxisRanges[`3_${CE_var}`]?.y?.max ?? ''} onChange={(e) => setCardAxisValue(CE_var, 'y', 'max', e.target.value)} />
                                </Box>
                                <Plot data={cePlotSC.data} layout={{ ...cePlotSC.layout, autosize: true }} useResizeHandler={true} style={{ width: '100%', height: '100%' }} config={{ responsive: true, displaylogo: false }} />
                              </CardContent>
                            </Card>
                          </Grid>

                          {/* Common Scaling Top Shell Temperature Card */}
                          <Grid item xs={12} lg={6} width="100%">
                            <Card elevation={4} sx={{ borderRadius: 3, border: '1px solid #E0E0E0' }}>
                              <CardHeader title={`Common Scaling Top Shell Temperature - ${plantName}`} action={<IconButton onClick={() => resetCardAxis(TST_var)}><RestartAltIcon /></IconButton>} />
                              <CardContent>
                                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 2 }}>
                                  <TextField label="X Min" size="small" type="number" value={cardAxisRanges[`3_${TST_var}`]?.x?.min ?? ''} onChange={(e) => setCardAxisValue(TST_var, 'x', 'min', e.target.value)} />
                                  <TextField label="X Max" size="small" type="number" value={cardAxisRanges[`3_${TST_var}`]?.x?.max ?? ''} onChange={(e) => setCardAxisValue(TST_var, 'x', 'max', e.target.value)} />
                                  <TextField label="Y Min" size="small" type="number" value={cardAxisRanges[`3_${TST_var}`]?.y?.min ?? ''} onChange={(e) => setCardAxisValue(TST_var, 'y', 'min', e.target.value)} />
                                  <TextField label="Y Max" size="small" type="number" value={cardAxisRanges[`3_${TST_var}`]?.y?.max ?? ''} onChange={(e) => setCardAxisValue(TST_var, 'y', 'max', e.target.value)} />
                                </Box>
                                <Plot data={tstPlotSC.data} layout={{ ...tstPlotSC.layout, autosize: true }} useResizeHandler={true} style={{ width: '100%', height: '100%' }} config={{ responsive: true, displaylogo: false }} />
                              </CardContent>
                            </Card>
                          </Grid>
                        </React.Fragment>
                      );
                    }
                  })}
                </Grid>
              ) : (
                // ✅ LAYOUT OUTER CONTAINER FOR TABS 0 & 1
                <Grid container spacing={3}>
                  {(activeTab === 0 ? selectedYVarsProj : selectedYVarsPlant).filter(Boolean).map((yVar) => {
                    const currentTabKey = `${activeTab}_${yVar}`;
                    const perCardAxis = { 
                      [xKey]: cardAxisRanges[currentTabKey]?.x, 
                      [yVar]: cardAxisRanges[currentTabKey]?.y 
                    };
                    
                    const dataSource = activeTab === 0 ? df_final : df_plant_converted;
                    const caseSource = activeTab === 0 ? [...new Set(df_final.map(r => r.Case))] : selectedPlants;
                    const cumEOLabel = `Cumulative EO (${plotUnits.cumEO_unit || 'klb/ft3'})`;

                    const { data, layout } = plotMultipleY_Plant(dataSource, currentAxisChoice, caseSource, cumEOLabel, bounds, [yVar], activeTab === 0 ? 'Case' : 'Plant', perCardAxis);
                    return (
                      // ✅ AUTOMATIC SCALING FOR DESKTOP OR LAPTOPS
                      <Grid item xs={12} lg={6}  width="100%" key={yVar}>
                        <Card elevation={2} sx={{ borderRadius: 3, border: '1px solid #E5E7EB', height: '100%' }}>
                          <CardHeader title={displayLabel(yVar)} action={<IconButton onClick={() => resetCardAxis(yVar)}><RestartAltIcon /></IconButton>} />
                          <CardContent>
                            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 2 }}>
                              <TextField label="X Min" size="small" type="number" value={cardAxisRanges[currentTabKey]?.x?.min ?? ''} onChange={(e) => setCardAxisValue(yVar, 'x', 'min', e.target.value)} />
                              <TextField label="X Max" size="small" type="number" value={cardAxisRanges[currentTabKey]?.x?.max ?? ''} onChange={(e) => setCardAxisValue(yVar, 'x', 'max', e.target.value)} />
                              <TextField label="Y Min" size="small" type="number" value={cardAxisRanges[currentTabKey]?.y?.min ?? ''} onChange={(e) => setCardAxisValue(yVar, 'y', 'min', e.target.value)} />
                              <TextField label="Y Max" size="small" type="number" value={cardAxisRanges[currentTabKey]?.y?.max ?? ''} onChange={(e) => setCardAxisValue(yVar, 'y', 'max', e.target.value)} />
                            </Box>
                            <Plot data={data} layout={{ ...layout, height: 450, autosize: true }} useResizeHandler={true} style={{ width: '100%' }} config={{ responsive: true, displaylogo: false }} />
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              )}
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
}