from app.recommendations import recommend
def test_recommendation():
    r=recommend("DADAR",95,.9,{"P1":90,"P4":60})
    assert r["action"]=="DIVERT_PASSENGERS" and r["targetPlatform"]=="P4"
