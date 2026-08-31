from dataclasses import dataclass
import joblib

@dataclass
class ModelBundle:
    model:object
    features:list[str]
    task:str
    model_name:str
    metrics:dict

def save_bundle(bundle,path):
    path.parent.mkdir(parents=True,exist_ok=True)
    joblib.dump(bundle,path)

def load_bundle(path):
    return joblib.load(path)
