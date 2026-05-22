// server.js 
const express = require('express');
const cors = require('cors');
const axios = require('axios'); // Add axios for backend API calls
const { sql, poolPromise } = require('./db');
const conversionsData = require('./conversions.json'); //
const renameData = require('./rename.json'); //
 
const app = express();
const port = 3000; // Your backend will run on this port
 
// --- Middleware ---
app.use(cors()); // Allow requests from your React app (which runs on a different port)
app.use(express.json());  

// --- Azure AD Configuration ---
const CLIENT_ID = process.env.AZURE_CLIENT_ID || 'YOUR_AZURE_CLIENT_ID';
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET || 'YOUR_AZURE_CLIENT_SECRET';
const TENANT_ID = process.env.AZURE_TENANT_ID || 'common'; // 'common' or specific Tenant GUID
const REDIRECT_URI = process.env.AZURE_REDIRECT_URI || 'http://localhost:3000/api/auth/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001'; // Your React application URL

// --- API Routes ---

/**
 * Endpoint 1: Generate Azure Login URL 
 * Called by React via Axios to get the interactive login link
 */
app.get('/api/auth/login-url', (req, res) => {
  const azureAuthUrl = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/authorize` +
    `?client_id=${CLIENT_ID}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&response_mode=query` +
    `&scope=${encodeURIComponent('openid profile email User.Read')}` +
    `&state=secure_state_string`;
  
  res.json({ url: azureAuthUrl });
});

/**
 * Endpoint 2: Azure Authentication Callback
 * Azure redirects back here with an authorization code. 
 * The server exchanges it for tokens using Axios.
 */
app.get('/api/auth/callback', async (req, res) => {
  const { code, error, error_description } = req.query;

  if (error) {
    return res.redirect(`${FRONTEND_URL}/?auth_error=${encodeURIComponent(error_description || error)}`);
  }

  if (!code) {
    return res.redirect(`${FRONTEND_URL}/?auth_error=No+authorization+code+provided`);
  }

  try {
    // 1. Exchange Auth Code for Access Token via Axios POST
    const tokenUrl = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
    
    const tokenParams = new URLSearchParams();
    tokenParams.append('client_id', CLIENT_ID);
    tokenParams.append('scope', 'openid profile email User.Read');
    tokenParams.append('code', code);
    tokenParams.append('redirect_uri', REDIRECT_URI);
    tokenParams.append('grant_type', 'authorization_code');
    tokenParams.append('client_secret', CLIENT_SECRET);

    const tokenResponse = await axios.post(tokenUrl, tokenParams.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const { access_token } = tokenResponse.data;

    // 2. Fetch User Profile Data from Microsoft Graph API using the Access Token
    const graphResponse = await axios.get('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const profile = graphResponse.data;
    
    // 3. Packet the User Data
    const sessionUser = {
      name: profile.displayName,
      email: profile.mail || profile.userPrincipalName,
      id: profile.id
    };

    // 4. Safely encode the user data and redirect back to the React app landing page
    const encodedUser = encodeURIComponent(JSON.stringify(sessionUser));
    res.redirect(`${FRONTEND_URL}/?user=${encodedUser}`);

  } catch (err) {
    console.error('Azure authentication error:', err.response?.data || err.message);
    res.redirect(`${FRONTEND_URL}/?auth_error=${encodeURIComponent('Token exchange failed')}`);
  }
});
 
// --- API Routes ---
 
/**
* Route to get static params
*/
app.get('/api/params', (req, res) => {
  res.json({
    conversions: conversionsData, //
    rename: renameData, //
    // You can hard-code these lists from get_params()
    CE_label_list: ['Chemical Efficiency', 'Selectivity'],
    TST_label_list: ['Top Shell Temperature', 'Inlet Coolant Temperature'],
    temp_unit_list: ['C', 'F'],
    mass_flow_unit_list: ['kg/s', 'lb/h', 't/h', 'klb/h', 'TPD', 'MMlb/day', 'kta'],
    press_unit_list: ['bar', 'psia', 'kg/cm2', 'kpa', 'MPa'],
    cumEO_unit_list: ['klb/ft3', 'kt/m3'],
    work_rate_unit_list: ['kg/h/m3', 'lb/h/ft3'],
  });
});
 
/**
* Route to get user list
* Replaces get_user_list()
*/
app.get('/api/users', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM dbo.Proj_user');
    
    // Convert the array of {User_ID, DB_Table} to the dict format
    const userDict = result.recordset.reduce((acc, user) => {
      acc[user.User] = { DB_table: user.DB_table };
      return acc;
    }, {});
    
    res.json(userDict);
  } catch (err) {
    res.status(500).send(err.message);
  }
});
 
/**
* Route to get projection data for a user
* Replaces get_user_data()
*/
app.get('/api/projection-data/:user', async (req, res) => {
  const { user } = req.params;
  
  // 1. Get user table (simplified: in a real app, you'd fetch this first)
  // Hardcoding for this example based on your code
const pool = await poolPromise;

const userResult = await pool.request()
  .input('user', sql.VarChar, user)
  .query(`
    SELECT DB_Table
    FROM dbo.Proj_user
    WHERE [User] = @user
  `);

if (userResult.recordset.length === 0) {
  return res.status(404).json({ message: 'User not found' });
}

const tableName = userResult.recordset[0].DB_Table;

// ✅ Safety check (VERY IMPORTANT)
if (!/^Projection_Results_[A-Za-z0-9_]+$/.test(tableName)) {
  return res.status(400).json({ message: 'Invalid table name' });
}
  
  if (!tableName) {
    return res.status(404).json({ message: 'User not found' });
  }
 
  const sql_query = `
  WITH base AS (
    SELECT
        Case_Name  AS CaseName,
        Days       AS t,
        Months     AS m,
        TRY_CONVERT(float, "CatVol Cumulative EO (klb/ft3)") AS eo,

        TRY_CONVERT(float, "Top Shell Temperature [C]")        AS TST_C,
        TRY_CONVERT(float, "Chemical Efficiency [%]")          AS CE_PCT,
        TRY_CONVERT(float, "CO2 Removal Efficiency [%]")       AS CO2_EFF_PCT,
        TRY_CONVERT(float, "Pressure Drop [psia]")             AS DP_PSIA,
        TRY_CONVERT(float, "EO Production [kg/s]")             AS EO_KGS,

        TRY_CONVERT(float, "GHSV (bed based) [1/h]")            AS GHSV_BED,
        TRY_CONVERT(float, "GHSV (cat. based) [1/h]")           AS GHSV_CAT,

        TRY_CONVERT(float, "Inlet O2 [%]")                      AS IN_O2_PCT,
        TRY_CONVERT(float, "Inlet CO2 [%]")                     AS IN_CO2_PCT,
        TRY_CONVERT(float, "Inlet C2H4 [%]")                    AS IN_C2H4_PCT,
        TRY_CONVERT(float, "Inlet C2H6 [%]")                    AS IN_C2H6_PCT,
        TRY_CONVERT(float, "Inlet H2O [%]")                     AS IN_H2O_PCT,
        TRY_CONVERT(float, "Inlet EO [%]")                      AS IN_EO_PCT,

        TRY_CONVERT(float, "Inlet Gas Temperature [C]")         AS INLET_GT_C,
        TRY_CONVERT(float, "Outlet Gas Temperature [C]")       AS OUTLET_GT_C,
        TRY_CONVERT(float, "Avg. Bed Temperature [C]")          AS BED_T_C,
        TRY_CONVERT(float, "dEO [%]")                           AS DEO_PCT,

        TRY_CONVERT(float, "Reactor Vol Cumulative EO (klb/ft3)") AS RVC_EO,
        TRY_CONVERT(float, "Inlet Pressure [psia]")             AS IP_PSIA,
        TRY_CONVERT(float, "Outlet Pressure [psia]")            AS OP_PSIA,
        TRY_CONVERT(float, "EO Partial Pressure [psia]")        AS EO_PP_PSIA,
        TRY_CONVERT(float, "Inlet Gas Flow [m3/s]")             AS IG_FLOW,

        TRY_CONVERT(float, "CatVol Workrate (lb/ft3/h)")        AS WR_CAT,
        TRY_CONVERT(float, "CatVol Workrate (kg/h/m3)")         AS WR_CAT_SI,

        TRY_CONVERT(float, "Outlet O2 [%]")                     AS OUT_O2_PCT,
        TRY_CONVERT(float, "Outlet EO [%]")                     AS OUT_EO_PCT,
        TRY_CONVERT(float, "dCO2 [%]")                          AS DCO2_PCT,
        TRY_CONVERT(float, "dO2 [%]")                           AS DO2_PCT,

        TRY_CONVERT(float, "C2H4 Consumption Rate [kg/s]")      AS C2H4_RATE,
        TRY_CONVERT(float, "O2 Consumption Rate [kg/s]")        AS O2_RATE,
        TRY_CONVERT(float, "Cycle Gas Flow [kmol/h]")           AS CYCLE_FLOW,
        TRY_CONVERT(float, "Void Fraction")                     AS VOID_FRAC,
        TRY_CONVERT(float, "Shrinking Factor")                  AS SHRINK_FACTOR

    FROM dbo.${tableName}
)

SELECT
    CaseName AS [Case],
    t,
    m,
    eo,
    CASE u.yvar
        WHEN 'TST_C'          THEN 'Top Shell Temperature [C]'
        WHEN 'CE_PCT'         THEN 'Actual Plant Efficiency [%]'
        WHEN 'CO2_EFF_PCT'    THEN 'Actual CO2 Efficiency [%]'
        WHEN 'DP_PSIA'        THEN 'Pressure Drop [psia]'
        WHEN 'EO_KGS'         THEN 'EO Production [kg/s]'
        WHEN 'GHSV_BED'       THEN 'GHSV (bed based) [1/h]'
        WHEN 'GHSV_CAT'       THEN 'GHSV (cat. based) [1/h]'
        WHEN 'IN_O2_PCT'      THEN 'Inlet O2 [%]'
        WHEN 'IN_CO2_PCT'     THEN 'Inlet CO2 [%]'
        WHEN 'IN_C2H4_PCT'    THEN 'Inlet C2H4 [%]'
        WHEN 'IN_C2H6_PCT'    THEN 'Inlet C2H6 [%]'
        WHEN 'IN_H2O_PCT'     THEN 'Inlet H2O [%]'
        WHEN 'IN_EO_PCT'      THEN 'Inlet EO [%]'
        WHEN 'INLET_GT_C'     THEN 'Inlet Gas Temperature [C]'
        WHEN 'OUTLET_GT_C'    THEN 'Outlet Gas Temperature [C]'
        WHEN 'BED_T_C'        THEN 'Avg. Bed Temperature [C]'
        WHEN 'DEO_PCT'        THEN 'dEO [%]'
        WHEN 'RVC_EO'         THEN 'Cumulative EO (cat.) [klb/ft3]'
        WHEN 'IP_PSIA'        THEN 'Inlet Pressure [psia]'
        WHEN 'OP_PSIA'        THEN 'Outlet Pressure [psia]'
        WHEN 'EO_PP_PSIA'     THEN 'EO Partial Pressure [kPa]'
        WHEN 'IG_FLOW'        THEN 'Inlet Gas Flow [t/hr]'
        WHEN 'WR_CAT'         THEN 'Work Rate (cat. based) [lb/h/ft3]'
        WHEN 'WR_CAT_SI'      THEN 'Work Rate (cat. based) [kg/h/m3]'
        WHEN 'OUT_O2_PCT'     THEN 'Outlet O2 [%]'
        WHEN 'OUT_EO_PCT'     THEN 'Outlet EO [%]'
        WHEN 'DCO2_PCT'       THEN 'dCO2 [%]'
        WHEN 'DO2_PCT'        THEN 'dO2 [%]'
        WHEN 'C2H4_RATE'      THEN 'C2H4 Consumption Rate [kg/s]'
        WHEN 'O2_RATE'        THEN 'O2 Consumption Rate [kg/s]'
        WHEN 'CYCLE_FLOW'     THEN 'Cycle Gas Flow [kmole/hr]'
        WHEN 'VOID_FRAC'      THEN 'Void Fraction'
        WHEN 'SHRINK_FACTOR'  THEN 'Shrinking Factor'
        ELSE u.yvar
    END AS yvar,
    u.Value,
    'blue' AS color
FROM base
UNPIVOT (
    Value FOR yvar IN (
        TST_C, CE_PCT, CO2_EFF_PCT, DP_PSIA, EO_KGS,
        GHSV_BED, GHSV_CAT,
        IN_O2_PCT, IN_CO2_PCT, IN_C2H4_PCT, IN_C2H6_PCT, IN_H2O_PCT, IN_EO_PCT,
        INLET_GT_C, OUTLET_GT_C, BED_T_C, DEO_PCT,
        RVC_EO, IP_PSIA, OP_PSIA, EO_PP_PSIA, IG_FLOW,
        WR_CAT, WR_CAT_SI,
        OUT_O2_PCT, OUT_EO_PCT, DCO2_PCT, DO2_PCT,
        C2H4_RATE, O2_RATE, CYCLE_FLOW, VOID_FRAC, SHRINK_FACTOR
    )
) u
WHERE u.Value IS NOT NULL;`;
 
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(sql_query);
    const longData = result.recordset; // This is the raw "long" data
 
    // 2. === Replicate the Pandas pivot ===
    // This is the most critical part
    const pivotedData = Object.values(
      longData.reduce((acc, row) => {
        // Create a unique key for each row based on the index columns
        const key = `${row.Case}|${row.t}|${row.m}|${row.eo}|${row.color}`;
 
        if (!acc[key]) {
          acc[key] = {
            Case: row.Case,
            t: row.t,
            m: row.m,
            eo: row.eo,
            color: row.color,
          };
        }
        // Turn the 'yvar' column into a new key
        acc[key][row.yvar] = row.Value;
        return acc;
      }, {})
    );
 
    // 3. === Replicate the post-pivot calculations from get_user_data() ===
    const fvoid_dict = {};
    const df_raw = pivotedData.map(row => {
      // Calculate fvoid for this case if not already done
      const caseName = row.Case;
      if (!fvoid_dict[caseName]) {
          const fvoid_mean = (row['Work Rate (bed based) [lb/h/ft3]'] / row['Work Rate (cat. based) [lb/h/ft3]']) || 0;
          // In a real scenario, you'd calculate the mean *after* this map,
          // but for simplicity, we'll assume it's consistent.
          fvoid_dict[caseName] = fvoid_mean;
      }
      
      const fvoid = fvoid_dict[caseName];
 
      // Return a new object with the calculated columns
      return {
        ...row,
        'Outlet Pressure [psia]': row['Inlet Pressure [psia]'] - row['Pressure Drop [psia]'],
        'FB dEO [%]': row['dEO [%]'],
        'Cumulative EO (bed based) [klb/ft3]': row['Cumulative EO (cat.) [klb/ft3]'] * fvoid
      };
    });
    // Apply rename mapping
    const mapAll = { ...renameData.rename_proj, ...renameData.plant_var_rename };
    const df_renamed = df_raw.map(row => {
      const newRow = {};
      Object.keys(row).forEach(key => {
        const newKey = mapAll[key] || key;
        newRow[newKey] = row[key];
      });
      return newRow;
    });
 
    // 4. Get the list of variables for unit conversion
    // This logic is from get_user_data()
    const yvar_list = Object.keys(df_renamed[0] || {});
    const plot_units_var = {
        Temp_Unit: yvar_list.filter(x => x.includes('Temperature')),
        Pres_Unit: yvar_list.filter(x => x.includes('Pressure [psia]')),
        MassFlow_Unit: yvar_list.filter(x => x.includes('[kg/s]')),
        WorkRate_Unit: yvar_list.filter(x => x.includes('Work Rate')),
        cumEO_unit: yvar_list.filter(x => x.includes('Cumulative EO')),
    };
 
    // 5. Send all data to the frontend
    res.json({
      df_raw: df_renamed, // This is your processed DataFrame
      plot_units_var: plot_units_var,
      fvoid_dict: fvoid_dict
    });


    
 
  } catch (err) {
    res.status(500).send(err.message);
  }
});


// -----------------------------   Plant Details --------------------------------------------  


// Add these routes in server.js, alongside your other /api routes
 
// --- Helper function to get table name (ported from utils.py) ---

 
/**
* Route to get the list of available plants
* Replaces get_plant_list()
*/
/**
 * Route to get the list of available plants
 * Source: dbo.ChargeInformation
 */
app.get('/api/plant-list', async (req, res) => {
  const sql_query = `
    SELECT DISTINCT Plant
    FROM dbo.ChargeInformation
    WHERE Plant IS NOT NULL
    ORDER BY Plant
  `;

  try {
    const pool = await poolPromise;
    const result = await pool.request().query(sql_query);
    const plantList = result.recordset.map(r => r.Plant);
    res.json(plantList);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

/**
 * Route to get charge / plant master data
 * Source: dbo.ChargeInformation
 */
app.post('/api/plant-charge-info', async (req, res) => {
  const { selected_plant_list } = req.body;

  if (!selected_plant_list || selected_plant_list.length === 0) {
    return res.json([]);
  }

  try {
    const pool = await poolPromise;

    const request = pool.request();
    selected_plant_list.forEach((plant, i) => {
      request.input(`plant${i}`, sql.VarChar, plant);
    });

    const inClause = selected_plant_list
      .map((_, i) => `@plant${i}`)
      .join(',');

    const sql_query = `
      SELECT *
      FROM dbo.ChargeInformation
      WHERE Plant IN (${inClause})
      ORDER BY Plant
    `;

    const result = await request.query(sql_query);
    res.json(result.recordset);

  } catch (err) {
    res.status(500).send(err.message);
  }
});
 
 
/**
* Route to get processed plant data for selected plants
* Replaces get_plant_data() and get_plant_data_single()
*/
app.post('/api/plant-data', async (req, res) => {
  // Use POST to send a potentially long list of plants
  const { selected_plant_list, table_name } = req.body;
  
  if (!selected_plant_list || selected_plant_list.length === 0) {
    return res.json({ df_plant: [], var_list_plot: [], plot_units_var: {} });
  }
 
  // Use rename.json which you've already loaded as `renameData`
  const plant_var_rename = renameData.plant_var_rename; //
  const model_pred_vars = renameData.model_pred_vars; //
 
  try {
    const pool = await poolPromise;
    let all_plant_data = [];
 
    // Loop and fetch data for each plant, like in get_plant_data()
    for (const plant of selected_plant_list) {
      const sql_query = `SELECT * FROM dbo.[${table_name}] WHERE plantname LIKE '${plant}'`; //
      const result = await pool.request().query(sql_query);
 
      // --- 1. Pivot the data (same logic as projection data) ---
      const pivotedData = Object.values(
        result.recordset.reduce((acc, row) => {
          // Index columns from get_plant_data_single
          const key = `${row.plantname}|${row.modelname}|${row.iday}|${row.eocat}`;
          if (!acc[key]) {
            acc[key] = {
              plantname: row.plantname,
              modelname: row.modelname,
              iday: row.iday,
              eocat: row.eocat,
            };
          }
          acc[key][row.allheaders] = row.Value;
          return acc;
        }, {})
      );
 
      // --- 2. Rename columns and add calculated fields (from get_plant_data_single) ---
      const processedData = pivotedData.map(row => {
        const newRow = {};
        // Rename all columns based on rename.json
        newRow['Plant'] = row.plantname; //
        newRow['Model'] = row.modelname; //
        newRow['Date'] = new Date(row.iday); //
        newRow['Cumulative EO (cat.) [klb/ft3]'] = row.eocat; //
        
 
        // Apply plant_var_rename
        for (const [key, value] of Object.entries(plant_var_rename)) {
          if (row.hasOwnProperty(key)) newRow[value] = row[key];
        }
        // Apply model_pred_vars
        for (const [key, value] of Object.entries(model_pred_vars)) {
          if (row.hasOwnProperty(key)) newRow[value] = row[key];
        }
        // Apply other specific renames
        newRow['Actual TST [C]'] = row['Actual TST (°C)']; //
        //newRow['Predicted TST [C]'] = row['(Direct) Predicted TST (°C)']; //
        newRow['Scaled TST [C]'] = row['Scaled TST (°C)'] || row['Scaled TST']; //
        //newRow['Projection TST [C]'] = row['(Scaling) Projected TST (°C)']; //
        newRow['Predicted TST [C]'] = row['(Direct) Predicted TST (°C)'] || row['Predicted TST'];
        newRow['Predicted CE [%]'] = row['(Direct) Predicted Selectivity (%)'] || row['Predicted CE'];
        
        // ... (add other temp renames) ...
 
        // Calculate Pressure Drop
        newRow['Outlet Pressure [psia]'] = row['Inlet Pressure (psia)'] - row['Average DP (psi)']; //
 
        return newRow;
      });
      
      // --- 3. Calculate t and m (days/months on stream) ---
      if (processedData.length > 0) {
          const minDate = new Date(Math.min(...processedData.map(r => r.Date.getTime()))); //
          processedData.forEach(row => {
              const diffTime = Math.abs(row.Date.getTime() - minDate.getTime());
              const diffDays = diffTime / (1000 * 60 * 60 * 24);
              row['t'] = diffDays; //
              row['m'] = diffDays / 30; //
          });
      }
 
      all_plant_data.push(...processedData);
    }
    
    // --- 4. Define variable lists (from get_plant_data) ---
    const var_list_plot = Object.values(plant_var_rename); //
    var_list_plot.push('Outlet Pressure [psia]'); //
    
    const plot_units_var = { //
      Temp_Unit: ['Actual TST [C]', 'Inlet Gas Temperature [C]', 'Outlet Gas Temperature [C]', 'Predicted TST [C]', 'Scaled TST [C]', 'Projection TST [C]'],
      Pres_Unit: ['Pressure Drop [psia]', 'Inlet Pressure [psia]', 'Outlet Pressure [psia]'],
      cumEO_unit: ['Cumulative EO (cat.) [klb/ft3]', 'Cumulative EO (bed based) [klb/ft3]'],
      MassFlow_Unit: ['EO Production Rate [t/h]']
    };
 
    res.json({ df_plant: all_plant_data, var_list_plot, plot_units_var });
    
  } catch (err) {
    res.status(500).send(err.message);
  }
});




app.post('/api/model-list', async (req, res) => {
  const { selected_plant_list, table_name } = req.body;

  if (!selected_plant_list || selected_plant_list.length === 0) {
    return res.json([]);
  }

  try {
    const pool = await poolPromise;

    let models = new Set();

    for (const plant of selected_plant_list) {
      const result = await pool.request().query(
        `SELECT DISTINCT modelname FROM dbo.[${table_name}]
         WHERE plantname LIKE '${plant}'`
      );

      result.recordset.forEach(r => {
        if (r.modelname) models.add(r.modelname);
      });
    }

    res.json([...models]);

  } catch (err) {
    res.status(500).send(err.message);
  }
});



 
 
// Start the server
app.listen(port, () => {
  console.log(`Backend server listening on port ${port}`);
}); 
