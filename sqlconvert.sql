

const tableName = `Projection_data_${userId}`; // validated userId

SELECT
    CaseName AS [Case],
    t,
    m,
    eo,
    yvar,
    Value,
    'blue' AS color
  FROM (
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

SELECT
    CaseName AS [Case],
    t,
    m,
    eo,
    CASE u.yvar
        WHEN 'TST_C'          THEN 'Top Shell Temperature [C]'
        WHEN 'CE_PCT'         THEN 'Chemical Efficiency [%]'
        WHEN 'CO2_EFF_PCT'    THEN 'CO2 Removal Efficiency [%]'
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
        WHEN 'RVC_EO'         THEN 'Cumulative EO (bed based) [klb/ft3]'
        WHEN 'IP_PSIA'        THEN 'Inlet Pressure [psia]'
        WHEN 'OP_PSIA'        THEN 'Outlet Pressure [psia]'
        WHEN 'EO_PP_PSIA'     THEN 'EO Partial Pressure [psia]'
        WHEN 'IG_FLOW'        THEN 'Inlet Gas Flow [m3/s]'
        WHEN 'WR_CAT'         THEN 'Work Rate (cat. based) [lb/h/ft3]'
        WHEN 'WR_CAT_SI'      THEN 'Work Rate (cat. based) [kg/h/m3]'
        WHEN 'OUT_O2_PCT'     THEN 'Outlet O2 [%]'
        WHEN 'OUT_EO_PCT'     THEN 'Outlet EO [%]'
        WHEN 'DCO2_PCT'       THEN 'dCO2 [%]'
        WHEN 'DO2_PCT'        THEN 'dO2 [%]'
        WHEN 'C2H4_RATE'      THEN 'C2H4 Consumption Rate [kg/s]'
        WHEN 'O2_RATE'        THEN 'O2 Consumption Rate [kg/s]'
        WHEN 'CYCLE_FLOW'     THEN 'Cycle Gas Flow [kmol/h]'
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
WHERE u.Value IS NOT NULL;
GO