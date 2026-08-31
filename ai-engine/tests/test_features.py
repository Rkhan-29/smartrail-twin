import pandas as pd
from app.features import temporal_features
def test_features():
    x=temporal_features(pd.DataFrame({"timestamp":pd.to_datetime(["2026-01-01T08:00:00Z"])}))
    assert x.loc[0,"hour"]==8 and "hour_sin" in x
