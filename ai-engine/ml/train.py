from pathlib import Path
import json,pandas as pd
from sklearn.ensemble import ExtraTreesRegressor,HistGradientBoostingRegressor
from app.config import MODEL_DIR,REPORT_DIR
from app.features import training_features
from app.model_store import ModelBundle,save_bundle
from ml.metrics import regression_metrics

TARGETS={"demand":"demand_15","crowd":"future_crowd_pct","eta":"actual_eta_minutes","occupancy":"future_occupancy","congestion":"congestion_probability"}
DROP={"timestamp","station_id","train_id","platform_id","train_type"}

def candidates():
    r={"extra_trees":ExtraTreesRegressor(n_estimators=350,min_samples_leaf=2,random_state=42,n_jobs=-1),
       "hist_gradient_boosting":HistGradientBoostingRegressor(max_iter=350,learning_rate=.05,max_leaf_nodes=31,l2_regularization=.1,random_state=42)}
    try:
        from xgboost import XGBRegressor
        r["xgboost"]=XGBRegressor(n_estimators=700,max_depth=7,learning_rate=.04,subsample=.85,colsample_bytree=.85,objective="reg:squarederror",random_state=42,n_jobs=-1)
    except ImportError: pass
    try:
        from lightgbm import LGBMRegressor
        r["lightgbm"]=LGBMRegressor(n_estimators=700,num_leaves=31,learning_rate=.04,subsample=.85,colsample_bytree=.85,random_state=42,verbosity=-1)
    except ImportError: pass
    return r

def split(df):
    df=df.sort_values("timestamp").reset_index(drop=True); n=len(df)
    return df.iloc[:int(.70*n)],df.iloc[int(.70*n):int(.85*n)],df.iloc[int(.85*n):]

def train_task(raw,task):
    target=TARGETS[task]; df=training_features(raw).dropna(subset=[target]); tr,va,te=split(df)
    features=[c for c in tr if c not in DROP and c!=target and pd.api.types.is_numeric_dtype(tr[c]) and c in va and c in te]
    validation={}; best=None
    for name,model in candidates().items():
        model.fit(tr[features].fillna(0),tr[target]); metrics=regression_metrics(va[target],model.predict(va[features].fillna(0))); validation[name]=metrics
        if best is None or metrics["RMSE"]<best["metrics"]["RMSE"]: best={"name":name,"model":model,"metrics":metrics}
    test=regression_metrics(te[target],best["model"].predict(te[features].fillna(0)))
    bundle=ModelBundle(best["model"],features,task,best["name"],{"validation":validation,"test":test})
    save_bundle(bundle,MODEL_DIR/f"{task}.joblib")
    return {"task":task,"selectedModel":best["name"],"validation":validation,"test":test}

def train_all(path):
    raw=pd.read_csv(path,parse_dates=["timestamp"]); MODEL_DIR.mkdir(exist_ok=True); REPORT_DIR.mkdir(exist_ok=True)
    report={t:train_task(raw,t) for t in TARGETS}; (REPORT_DIR/"metrics.json").write_text(json.dumps(report,indent=2)); return report
