from datetime import datetime,timezone

class DigitalTwin:
    def __init__(self):
        self.stations={}
        self.trains={}
        self._recommendations=[]
    def update(self,stations=None,trains=None):
        if stations:self.stations.update(stations)
        if trains:self.trains.update(trains)
        return self.snapshot()
    def snapshot(self):
        return {"timestamp":datetime.now(timezone.utc).isoformat(),"stations":self.stations,"trains":self.trains}
    def add_recommendation(self,r):
        self._recommendations.insert(0,r)
        self._recommendations=self._recommendations[:100]
    def recommendations(self): return self._recommendations
