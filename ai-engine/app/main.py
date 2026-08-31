from contextlib import asynccontextmanager
from fastapi import FastAPI,HTTPException
from app.runtime import RuntimeEngine
from app.schemas import ETARequest,CrowdRequest,DemandRequest,OccupancyRequest,CongestionRequest,TwinUpdateRequest

runtime=RuntimeEngine()
@asynccontextmanager
async def lifespan(app):
    runtime.load()
    yield
app=FastAPI(title="SmartRail Twin AI Engine",version="2.0.0",lifespan=lifespan)

@app.get("/health")
def health(): return {"status":"ok","modelsLoaded":runtime.loaded,"tasks":sorted(runtime.models)}
@app.post("/predict/eta")
def eta(r:ETARequest): return runtime.predict_eta(r.model_dump())
@app.post("/predict/crowd")
def crowd(r:CrowdRequest): return runtime.predict_crowd(r.model_dump())
@app.post("/predict/demand")
def demand(r:DemandRequest): return runtime.predict_demand(r.model_dump())
@app.post("/predict/occupancy")
def occupancy(r:OccupancyRequest): return runtime.predict_occupancy(r.model_dump())
@app.post("/predict/congestion")
def congestion(r:CongestionRequest): return runtime.predict_congestion(r.model_dump())
@app.post("/digital-twin/update")
def twin(r:TwinUpdateRequest): return runtime.update_twin(r.model_dump())
@app.get("/digital-twin/station/{station_id}")
def station(station_id):
    x=runtime.get_station(station_id)
    if x is None: raise HTTPException(404,"Station not found")
    return x
@app.get("/digital-twin/train/{train_id}")
def train(train_id):
    x=runtime.get_train(train_id)
    if x is None: raise HTTPException(404,"Train not found")
    return x
@app.get("/recommendations")
def recs(): return runtime.recommendations()
