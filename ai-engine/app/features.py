import numpy as np
import pandas as pd

def temporal_features(df):
    out=df.copy()
    ts=pd.to_datetime(out["timestamp"],utc=True)
    out["hour"]=ts.dt.hour
    out["minute"]=ts.dt.minute
    out["day_of_week"]=ts.dt.dayofweek
    out["is_weekend"]=(out["day_of_week"]>=5).astype(int)
    out["morning_peak"]=out["hour"].between(7,10).astype(int)
    out["evening_peak"]=out["hour"].between(17,21).astype(int)
    out["hour_sin"]=np.sin(2*np.pi*out["hour"]/24)
    out["hour_cos"]=np.cos(2*np.pi*out["hour"]/24)
    out["dow_sin"]=np.sin(2*np.pi*out["day_of_week"]/7)
    out["dow_cos"]=np.cos(2*np.pi*out["day_of_week"]/7)
    return out

def add_lags(df,group,target):
    out=df.sort_values([group,"timestamp"]).copy()
    g=out.groupby(group,group_keys=False)[target]
    out[f"{target}_lag1"]=g.shift(1)
    out[f"{target}_lag2"]=g.shift(2)
    out[f"{target}_lag3"]=g.shift(3)
    out[f"{target}_roll3"]=g.transform(lambda s:s.shift(1).rolling(3,min_periods=1).mean())
    return out

def training_features(df):
    out=temporal_features(df)
    for target,group in [("people_count","station_id"),("demand_15","station_id"),("current_occupancy","train_id"),("delay_minutes","train_id")]:
        if target in out and group in out: out=add_lags(out,group,target)
    return out.replace([np.inf,-np.inf],np.nan)
