from pathlib import Path
import numpy as np,pandas as pd
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/"data/processed/synthetic_railway.csv"; rng=np.random.default_rng(42)
stations={"DADAR":12000,"BANDRA":9000,"ANDHERI":14000,"THANE":15000,"KURLA":11000,"BORIVALI":13000}; trains=[f"T{i:03d}" for i in range(1,61)]
times=pd.date_range("2026-01-01","2026-04-30 23:45",freq="5min",tz="UTC"); rows=[]
for station,capacity in stations.items():
    factor=capacity/12000
    for ts in times:
        h,dow=ts.hour,ts.dayofweek; morning=np.exp(-((h-8)/1.8)**2); evening=np.exp(-((h-18)/2)**2)
        peak=1+1.9*morning+2.2*evening; weekend=.62 if dow>=5 else 1; trend=1+.0005*(ts-times[0]).days
        demand=max(50,1300*factor*peak*weekend*trend+rng.normal(0,120)); people=max(0,demand*.72+rng.normal(0,100))
        entry=max(0,demand*.12+rng.normal(0,25)); exit_=max(0,demand*.08+rng.normal(0,20)); atvm=max(0,demand*.045+rng.normal(0,10)); uts=max(0,demand*.065+rng.normal(0,12))
        speed=max(8,44-8*morning-11*evening+rng.normal(0,3)); delay=max(0,rng.normal(1.5+2.2*morning+2.5*evening,1.2))
        crowd=np.clip(people/capacity*100,1,115); growth=(entry-exit_)/max(people,1); future=np.clip(crowd+growth*100*3+rng.normal(0,1.5),1,125)
        eta=max(.5,3.2+delay*.45+1.2*(40/speed)+rng.normal(0,.25)); occ=np.clip(.35+crowd/150+rng.normal(0,.06),.05,1.4); future_occ=np.clip(occ+(entry-exit_)/5000+rng.normal(0,.03),.05,1.5)
        congestion=1/(1+np.exp(-(future-82)/7))
        rows.append({"timestamp":ts,"station_id":station,"train_id":rng.choice(trains),"platform_id":f"P{rng.integers(1,5)}","train_type":"local","people_count":people,"crowd_density":crowd/100,"entry_count":entry,"exit_count":exit_,"atvm_count":atvm,"uts_count":uts,"train_frequency":max(.2,rng.normal(4.5,.5)),"station_capacity":capacity,"platform_capacity":capacity/4,"delay_minutes":delay,"current_speed_kmh":speed,"distance_to_next_km":max(.1,rng.normal(2.5,.5)),"distance_to_destination_km":max(.5,rng.normal(9,2)),"historical_segment_minutes":max(1,rng.normal(3.5,.4)),"dwell_seconds":max(15,rng.normal(38,8)),"scheduled_eta_minutes":3.5,"preceding_train_delay":max(0,rng.normal(1,.5)),"current_crowd_percentage":crowd,"recent_crowd_growth_rate":growth,"historical_demand":demand,"recent_demand_growth_rate":rng.normal(.01,.02),"current_occupancy":occ,"previous_train_occupancy":np.clip(occ+rng.normal(0,.08),0,1.5),"expected_boarding":entry*.5,"expected_alighting":exit_*.5,"predicted_crowd_percentage":future,"occupancy":occ,"demand_15":demand,"future_crowd_pct":future,"actual_eta_minutes":eta,"future_occupancy":future_occ,"congestion_probability":congestion})
pd.DataFrame(rows).to_csv(OUT,index=False); print(f"Generated {len(rows):,} rows -> {OUT}")
