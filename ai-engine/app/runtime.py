import pandas as pd
from app.config import MODEL_DIR
from app.features import temporal_features
from app.model_store import load_bundle
from app.digital_twin import DigitalTwin
from app.recommendations import recommend

class RuntimeEngine:
    def __init__(self): self.models={}; self.twin=DigitalTwin(); self.loaded=False
    def load(self):
        for task in ("eta","crowd","demand","occupancy","congestion"):
            p=MODEL_DIR/f"{task}.joblib"
            if p.exists(): self.models[task]=load_bundle(p)
        self.loaded=len(self.models)==5
    def _predict(self,task,d):
        if task not in self.models: raise RuntimeError(f"{task} model is unavailable; run training first")
        b=self.models[task]; f=temporal_features(pd.DataFrame([d]))
        for c in b.features:
            if c not in f:f[c]=0
        return float(b.model.predict(f[b.features].fillna(0))[0]),b
    def predict_eta(self,d):
        v,b=self._predict("eta",d)
        return {"trainId":d["train_id"],"station":d["station_id"],"scheduledMinutes":round(d["scheduled_eta_minutes"],2),"predictedMinutes":round(max(0,v),2),"predictedDelay":round(v-d["scheduled_eta_minutes"],2),"model":b.model_name}
    def predict_crowd(self,d):
        v,b=self._predict("crowd",d); pct=max(0,v); prob=min(1,max(0,pct/100))
        level="CRITICAL" if prob>=.9 else "HIGH" if prob>=.75 else "MODERATE" if prob>=.5 else "LOW"
        rec=recommend(d["station_id"],pct,prob)
        r={"station":d["station_id"],"currentPercentage":round(d["current_crowd_percentage"],2),"predicted15MinPercentage":round(pct,2),"risk":{"level":level,"probability":round(prob,4)},"recommendation":rec,"model":b.model_name}
        self.twin.update(stations={d["station_id"]:r}); self.twin.add_recommendation(rec); return r
    def predict_demand(self,d):
        v,b=self._predict("demand",d); return {"station":d["station_id"],"horizonMinutes":d["horizon_minutes"],"predictedPassengers":round(max(0,v),2),"model":b.model_name}
    def predict_occupancy(self,d):
        v,b=self._predict("occupancy",d); return {"trainId":d["train_id"],"currentOccupancy":d["current_occupancy"],"predictedOccupancy":round(max(0,v),4),"overcrowdingProbability":round(min(1,max(0,v)),4),"model":b.model_name}
    def predict_congestion(self,d):
        v,b=self._predict("congestion",d); p=min(1,max(0,v)); level="CRITICAL" if p>=.85 else "HIGH" if p>=.65 else "MODERATE" if p>=.4 else "LOW"
        return {"station":d["station_id"],"risk":level,"riskProbability":round(p,4),"model":b.model_name}
    def update_twin(self,d): return self.twin.update(d.get("stations"),d.get("trains"))
    def get_station(self,s): return self.twin.stations.get(s)
    def get_train(self,t): return self.twin.trains.get(t)
    def recommendations(self): return self.twin.recommendations()
