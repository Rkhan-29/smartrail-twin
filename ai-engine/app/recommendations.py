def recommend(station_id,crowd_percentage,risk_probability,platform_loads=None):
    platform_loads=platform_loads or {}
    if risk_probability>=.85:
        action="DIVERT_PASSENGERS"; reason="Predicted congestion probability is critical."
        target=min(platform_loads,key=platform_loads.get) if platform_loads else None
    elif risk_probability>=.65:
        action="ISSUE_CONGESTION_WARNING"; reason="Predicted congestion probability is elevated."; target=None
    else:
        action="MONITOR"; reason="No critical intervention is indicated by the current prediction."; target=None
    r={"station":station_id,"action":action,"reason":reason,"riskProbability":round(float(risk_probability),4)}
    if target:r["targetPlatform"]=target
    return r
