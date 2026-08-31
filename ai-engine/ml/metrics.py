import numpy as np
from sklearn.metrics import mean_absolute_error,mean_squared_error,r2_score
def regression_metrics(y,p):
    y=np.asarray(y); p=np.asarray(p); m=np.abs(y)>1e-8
    return {"MAE":float(mean_absolute_error(y,p)),"RMSE":float(np.sqrt(mean_squared_error(y,p))),"MAPE":float(np.mean(np.abs((y[m]-p[m])/y[m]))*100) if m.any() else None,"R2":float(r2_score(y,p))}
