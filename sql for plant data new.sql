CREATE OR ALTER VIEW dbo.plant_data_new
AS
WITH base AS
(
    SELECT
        plantname,
        [Date]  AS iday,
        [Model] AS modelname,

        TRY_CONVERT(float, [CatVol Cumulative EO (klb/ft3)])      AS Eocat,
        TRY_CONVERT(float, [Reactor Vol Cumulative EO (klb/ft3)]) AS Rea,

        TRY_CONVERT(float, [Actual CO2 Efficiency (%)])          AS Actual_CO2_Eff,
        TRY_CONVERT(float, [Actual O2 Efficiency (%)])           AS Actual_O2_Eff,
        TRY_CONVERT(float, [FB Efficiency (%)])                  AS FB_Eff,
        TRY_CONVERT(float, [Actual TST (°C)])                    AS Actual_TST_C,

        TRY_CONVERT(float, [GHSV])                               AS GHSV,
        TRY_CONVERT(float, [DEO%])                               AS DEO,
        TRY_CONVERT(float, [FBdEO%])                             AS FBdEO,

        TRY_CONVERT(float, [Inlet O2%])                          AS Inlet_O2,
        TRY_CONVERT(float, [Inlet CO2%])                         AS Inlet_CO2,
        TRY_CONVERT(float, [Inlet C2H4%])                        AS Inlet_C2H4,
        TRY_CONVERT(float, [Inlet EO%])                          AS Inlet_EO,
        TRY_CONVERT(float, [Inlet C2H6%])                        AS Inlet_C2H6,
        TRY_CONVERT(float, [Inlet H2O%])                         AS Inlet_H2O,

        TRY_CONVERT(float, [Inlet Pressure (psig)])              AS Inlet_Press_psig,
        TRY_CONVERT(float, [Inlet Pressure (psia)])              AS Inlet_Press_psia,

        TRY_CONVERT(float, [Average DP (psi)])                   AS Avg_DP,
        TRY_CONVERT(float, [P ratio])                            AS P_ratio,

        TRY_CONVERT(float, [Z* (Z-star)])                        AS Z_star,
        TRY_CONVERT(float, [Outlet Gas Temperature (°C)])        AS Outlet_Gas_T_C,
        TRY_CONVERT(float, [Inlet Gas Temperature (°C)])         AS Inlet_Gas_T_C,

        TRY_CONVERT(float, [CatVol Workrate (lb/ft3/h)])         AS CatVol_Workrate_lbft3h,
        TRY_CONVERT(float, [CatVol Workrate (kg/h/m3)])          AS CatVol_Workrate_kghm3,

        TRY_CONVERT(float, [Plant])                              AS Plant,
        TRY_CONVERT(float, [Packing Factor])                     AS Packing_Factor,

        TRY_CONVERT(float, [Actual CE])                          AS Actual_CE,
        TRY_CONVERT(float, [Actual dEO])                         AS Actual_dEO,
        TRY_CONVERT(float, [Avg P])                              AS Avg_P,

        TRY_CONVERT(float, [P_EO])                               AS P_EO,
        TRY_CONVERT(float, [P_dEO])                              AS P_dEO,
        TRY_CONVERT(float, [P_O2])                               AS P_O2,
        TRY_CONVERT(float, [P_CO2])                              AS P_CO2,
        TRY_CONVERT(float, [P_C2H4])                             AS P_C2H4,
        TRY_CONVERT(float, [P_C2H6])                             AS P_C2H6,
        TRY_CONVERT(float, [P_H2O])                              AS P_H2O,

        TRY_CONVERT(float, [GHSV_cat])                           AS GHSV_cat,
        TRY_CONVERT(float, [if_oilcool])                         AS if_oilcool,
        TRY_CONVERT(float, [Plant_Type])                         AS Plant_Type,
        TRY_CONVERT(float, [TZN])                                AS TZN,
        TRY_CONVERT(float, [sc_type])                            AS sc_type,

        TRY_CONVERT(float, [Predicted CE])                       AS Predicted_CE,
        TRY_CONVERT(float, [Predicted TST])                      AS Predicted_TST,
        TRY_CONVERT(float, [Scaled CE])                          AS Scaled_CE,
        TRY_CONVERT(float, [Scaled TST])                         AS Scaled_TST,

        TRY_CONVERT(float, [Actual - Predicted CE])              AS Actual_minus_Pred_CE,
        TRY_CONVERT(float, [Actual - Predicted TST])             AS Actual_minus_Pred_TST
    FROM dbo.vw_All_Plants_Data
)
SELECT
    b.plantname,
    b.iday,
    b.modelname,
    b.Eocat,
    v.allheaders,
    v.Value,
    'blue' AS color
FROM base b
CROSS APPLY
(
    VALUES
        ('Reactor Vol Cumulative EO (klb/ft3)', b.Rea),
        ('Actual CO2 Efficiency (%)',          b.Actual_CO2_Eff),
        ('Actual O2 Efficiency (%)',           b.Actual_O2_Eff),
        ('FB Efficiency (%)',                  b.FB_Eff),
        ('Actual TST (°C)',                    b.Actual_TST_C),
        ('GHSV',                               b.GHSV),
        ('DEO%',                               b.DEO),
        ('FBdEO%',                             b.FBdEO),

        ('Inlet O2%',                          b.Inlet_O2),
        ('Inlet CO2%',                         b.Inlet_CO2),
        ('Inlet C2H4%',                        b.Inlet_C2H4),
        ('Inlet EO%',                          b.Inlet_EO),
        ('Inlet C2H6%',                        b.Inlet_C2H6),
        ('Inlet H2O%',                         b.Inlet_H2O),

        ('Inlet Pressure (psig)',              b.Inlet_Press_psig),
        ('Inlet Pressure (psia)',              b.Inlet_Press_psia),

        ('Average DP (psi)',                   b.Avg_DP),
        ('P ratio',                            b.P_ratio),

        ('Z* (Z-star)',                        b.Z_star),
        ('Outlet Gas Temperature (°C)',        b.Outlet_Gas_T_C),
        ('Inlet Gas Temperature (°C)',         b.Inlet_Gas_T_C),

        ('CatVol Workrate (lb/ft3/h)',         b.CatVol_Workrate_lbft3h),
        ('CatVol Workrate (kg/h/m3)',          b.CatVol_Workrate_kghm3),

        ('Plant',                              b.Plant),
        ('Packing Factor',                     b.Packing_Factor),

        ('Actual CE',                          b.Actual_CE),
        ('Actual dEO',                         b.Actual_dEO),
        ('Avg P',                              b.Avg_P),

        ('P_EO',                               b.P_EO),
        ('P_dEO',                              b.P_dEO),
        ('P_O2',                               b.P_O2),
        ('P_CO2',                              b.P_CO2),
        ('P_C2H4',                             b.P_C2H4),
        ('P_C2H6',                             b.P_C2H6),
        ('P_H2O',                              b.P_H2O),

        ('GHSV_cat',                           b.GHSV_cat),
        ('if_oilcool',                         b.if_oilcool),
        ('Plant_Type',                         b.Plant_Type),
        ('TZN',                                b.TZN),
        ('sc_type',                            b.sc_type),

        ('Predicted CE',                       b.Predicted_CE),
        ('Predicted TST',                      b.Predicted_TST),
        ('Scaled CE',                          b.Scaled_CE),
        ('Scaled TST',                         b.Scaled_TST),

        ('Actual - Predicted CE',              b.Actual_minus_Pred_CE),
        ('Actual - Predicted TST',             b.Actual_minus_Pred_TST)
) v(allheaders, Value)
WHERE v.Value IS NOT NULL;
GO