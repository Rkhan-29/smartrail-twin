from datetime import datetime
from typing import Optional
from pydantic import BaseModel,Field

class Common(BaseModel):
    timestamp:datetime
    station_id:str=Field(min_length=1)
    people_count:float=Field(0,ge=0)
    crowd_density:float=Field(0,ge=0)
    entry_count:float=Field(0,ge=0)
    exit_count:float=Field(0,ge=0)
    atvm_count:float=Field(0,ge=0)
    uts_count:float=Field(0,ge=0)
    train_frequency:float=Field(1,gt=0)
    station_capacity:float=Field(10000,gt=0)
    platform_capacity:float=Field(2500,gt=0)
    delay_minutes:float=Field(0,ge=0)
    current_speed_kmh:float=Field(40,ge=0)
    distance_to_next_km:float=Field(1,ge=0)
    distance_to_destination_km:float=Field(5,ge=0)
    historical_segment_minutes:float=Field(3.5,gt=0)
    dwell_seconds:float=Field(30,ge=0)
    train_type:str="local"

class ETARequest(Common):
    train_id:str
    scheduled_eta_minutes:float=Field(4,ge=0)
    preceding_train_delay:float=Field(0,ge=0)

class CrowdRequest(Common):
    platform_id:Optional[str]=None
    current_crowd_percentage:float=Field(50,ge=0)
    recent_crowd_growth_rate:float=0

class DemandRequest(Common):
    horizon_minutes:int=Field(15,description="15, 30 or 60")
    historical_demand:float=Field(5000,ge=0)
    recent_demand_growth_rate:float=0

class OccupancyRequest(Common):
    train_id:str
    current_occupancy:float=Field(.5,ge=0,le=2)
    previous_train_occupancy:float=Field(.5,ge=0,le=2)
    expected_boarding:float=Field(100,ge=0)
    expected_alighting:float=Field(50,ge=0)

class CongestionRequest(Common):
    predicted_crowd_percentage:float=Field(80,ge=0)
    occupancy:float=Field(.7,ge=0,le=2)

class TwinUpdateRequest(BaseModel):
    timestamp:datetime
    stations:dict={}
    trains:dict={}
