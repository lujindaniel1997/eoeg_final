import React from 'react';
import {
  Box,
  Drawer,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  TextField,
  RadioGroup,
  Radio,
  Button,
  Typography,
  Divider,
  List,
  ListItemText,
  Chip,
  OutlinedInput,
  ListItemButton,
  ListItemIcon,
  IconButton
} from '@mui/material';

import ClearIcon from '@mui/icons-material/Clear';
import HomeIcon from "@mui/icons-material/Home";
import TimelineIcon from "@mui/icons-material/Timeline";
import ShowChartIcon from "@mui/icons-material/ShowChart";

const drawerWidth = 300;

function AppSidebar({
  userList = [],
  params = {},
  selectedUser,
  plotUnits,
  ifGauge,
  atmp,
  cumEOBase,
  onUserChange,
  onPlotUnitsChange,
  onIfGaugeChange,
  onAtmpChange,
  onCumEOBaseChange,
  onRefresh,
  plantList = [],
  isPlantPage,
  useAllPlants,
  selectedPlants,
  onSetUseAllPlants,
  onSetSelectedPlants,
  chargeList = [],
  isLoadingCharge = false,
  selectedCharge = "",
  onChargeChange,
  exploreYVars,
  setExploreYVars,
  setPlotUnits,
}) {
  const handlePlotUnitChange = (key, value) => {
    onPlotUnitsChange(prevUnits => ({
      ...prevUnits,
      [key]: value,
    }));
  };

  const handleClearPlants = () => {
    onSetSelectedPlants([]);
  };

  return (
    <Drawer
      variant="permanent"
      anchor="left"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
        },
      }}
    >
      <Box sx={{ padding: 2, overflowY: 'auto' }}>
        
        {/* Navigation Section */}
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Navigation
        </Typography>
        <List dense sx={{ mb: 1 }}>
          <ListItemButton component="a" href="/">
            <ListItemIcon sx={{ minWidth: 35 }}><HomeIcon /></ListItemIcon>
            <ListItemText primary="Homepage" secondary="Return to homepage" />
          </ListItemButton>

          {/* Model Projection Only Navigation Item */}
          <ListItemButton 
            component="a" 
            href="/projection"
            selected={!isPlantPage}
            sx={{ '&.Mui-selected': { bgcolor: 'rgba(25, 118, 210, 0.12)' } }}
          >
            <ListItemIcon sx={{ minWidth: 35 }}><TimelineIcon /></ListItemIcon>
            <ListItemText primary="Model Projection Only" secondary="View base model runs" />
          </ListItemButton>

          {/* Projection with Plant Data Navigation Item */}
          <ListItemButton 
            component="a" 
            href="/projection-with-plant"
            selected={isPlantPage}
            sx={{ '&.Mui-selected': { bgcolor: 'rgba(25, 118, 210, 0.12)' } }}
          >
            <ListItemIcon sx={{ minWidth: 35 }}><ShowChartIcon /></ListItemIcon>
            <ListItemText primary="Projection with Plant Data" secondary="View plant projection data" />
          </ListItemButton>
        </List>

        <Divider sx={{ my: 2 }} />

        <Typography variant="h6" gutterBottom>
          Controls
        </Typography>

        {/* User Selection */}
        <FormControl fullWidth margin="normal">
          <InputLabel id="user-select-label">Select User</InputLabel>
          <Select
            labelId="user-select-label"
            value={selectedUser}
            label="Select User"
            onChange={e => onUserChange(e.target.value)}
          >
            {Array.isArray(userList) &&
              userList.map(user => (
                <MenuItem key={user} value={user}>
                  {user}
                </MenuItem>
              ))}
          </Select>
        </FormControl>

        {/* Conditional Plant Selection Controls */}
        {isPlantPage && (
          <>
            <FormControlLabel
              control={
                <Checkbox
                  checked={useAllPlants}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    onSetUseAllPlants(checked);
                    if (checked && plantList) {
                      onSetSelectedPlants(plantList);
                    } else {
                      onSetSelectedPlants([]);
                    }
                  }}
                />
              }
              label="Use All Plants?"
            />
 
            {/* Plant Multi-Select Dropdown */}
            <FormControl fullWidth margin="normal">
              <InputLabel id="plant-multiselect-label">Plant</InputLabel>
              <Select
                labelId="plant-multiselect-label"
                multiple
                value={selectedPlants || []}
                onChange={(e) => onSetSelectedPlants(e.target.value)}
                input={<OutlinedInput label="Plant" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                {plantList.map((plant) => (
                  <MenuItem key={plant} value={plant}>
                    {plant}
                  </MenuItem>
                ))}
              </Select>

              {/* Clear Selection */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
                <IconButton
                  onClick={handleClearPlants}
                  color="error"
                  size="small"
                  title="Clear all selected plants"
                  disabled={!selectedPlants || selectedPlants.length === 0}
                >
                  <ClearIcon fontSize="small" /> Clear Selection
                </IconButton>
              </Box>
            </FormControl>
          </>
        )}

        

        {/* Refresh Button */}
        <Button
          variant="outlined"
          fullWidth
          onClick={onRefresh}
          sx={{ mt: 1, mb: 2 }}
        >
          Refresh Data
        </Button>

        <Divider sx={{ my: 2 }} />

        <Typography variant="h6" gutterBottom>
          Units for Plots
        </Typography>

        {/* TST/ICT Labels */}
        <FormControl fullWidth margin="normal">
          <InputLabel id="tst-label-select">TST/ICT Labels</InputLabel>
          <Select
            labelId="tst-label-select"
            value={plotUnits.TST_label || ""}
            label="TST/ICT Labels"
            onChange={e => handlePlotUnitChange('TST_label', e.target.value)}
          >
            {params?.TST_label_list?.map(label => (
              <MenuItem key={label} value={label}>
                {label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Eff. or Sel Labels */}
        <FormControl fullWidth margin="normal">
          <InputLabel id="ce-label-select">Eff. or Sel Labels</InputLabel>
          <Select
            labelId="ce-label-select"
            value={plotUnits.CE_label || ""}
            label="Eff. or Sel Labels"
            onChange={e => handlePlotUnitChange('CE_label', e.target.value)}
          >
            {params?.CE_label_list?.map(label => (
              <MenuItem key={label} value={label}>
                {label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        {/* Temperature Unit */}
        <FormControl fullWidth margin="normal">
          <InputLabel id="temp-unit-select">Temperature Unit</InputLabel>
          <Select
            labelId="temp-unit-select"
            value={plotUnits.Temp_Unit || ""}
            label="Temperature Unit"
            onChange={e => handlePlotUnitChange('Temp_Unit', e.target.value)}
          >
            {params?.temp_unit_list?.map(unit => (
              <MenuItem key={unit} value={unit}>
                {unit}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Pressure Unit */}
        <FormControl fullWidth margin="normal">
          <InputLabel id="pres-unit-select">Pressure Unit</InputLabel>
          <Select
            labelId="pres-unit-select"
            value={plotUnits.Pres_Unit || ""}
            label="Pressure Unit"
            onChange={e => handlePlotUnitChange('Pres_Unit', e.target.value)}
          >
            {params?.press_unit_list?.map(unit => (
              <MenuItem key={unit} value={unit}>
                {unit}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Gauge Pressure Checkbox */}
        <FormControlLabel
          control={
            <Checkbox
              checked={!!ifGauge}
              onChange={e => onIfGaugeChange(e.target.checked)}
            />
          }
          label="Use Gauge for Inlet P?"
        />

        {/* Atmospheric Pressure Input */}
        <TextField
          label="Atmospheric Pressure (psi)"
          type="number"
          value={atmp || ""}
          onChange={e => onAtmpChange(parseFloat(e.target.value))}
          disabled={!ifGauge}
          fullWidth
          margin="normal"
        />

        {/* Mass Flow Unit */}
        <FormControl fullWidth margin="normal">
          <InputLabel id="mass-flow-select">Mass Flow Unit</InputLabel>
          <Select
            labelId="mass-flow-select"
            value={plotUnits.MassFlow_Unit || ""}
            label="Mass Flow Unit"
            onChange={e => handlePlotUnitChange('MassFlow_Unit', e.target.value)}
          >
            {params?.mass_flow_unit_list?.map(unit => (
              <MenuItem key={unit} value={unit}>
                {unit}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Work Rate Unit */}
        <FormControl fullWidth margin="normal">
          <InputLabel id="work-rate-select">Work Rate Unit</InputLabel>
          <Select
            labelId="work-rate-select"
            value={plotUnits.WorkRate_Unit || ""}
            label="Work Rate Unit"
            onChange={e => handlePlotUnitChange('WorkRate_Unit', e.target.value)}
          >
            {params?.work_rate_unit_list?.map(unit => (
              <MenuItem key={unit} value={unit}>
                {unit}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Cum EO Unit */}
        <FormControl fullWidth margin="normal">
          <InputLabel id="cum-eo-select">Cum EO Unit</InputLabel>
          <Select
            labelId="cum-eo-select"
            value={plotUnits.cumEO_unit || ""}
            label="Cum EO Unit"
            onChange={e => handlePlotUnitChange('cumEO_unit', e.target.value)}
          >
            {params?.cumEO_unit_list?.map(unit => (
              <MenuItem key={unit} value={unit}>
                {unit}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Cum EO Base Radio */}
        <FormControl component="fieldset" margin="normal">
          <Typography component="legend">Cum EO Base?</Typography>
          <RadioGroup
            row
            value={cumEOBase || ""}
            onChange={e => onCumEOBaseChange(e.target.value)}
          >
            <FormControlLabel value="Cat Based" control={<Radio />} label="Cat Based" />
            <FormControlLabel value="Bed Based" control={<Radio />} label="Bed Based" />
          </RadioGroup>
        </FormControl>
      </Box>
    </Drawer>
  );
}

export default AppSidebar;  