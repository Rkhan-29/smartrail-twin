from pathlib import Path
from ml.train import train_all
if __name__=="__main__":
    root=Path(__file__).resolve().parents[1]; report=train_all(root/"data/processed/synthetic_railway.csv")
    for task,r in report.items(): print(f"[{task}] {r['selectedModel']} TEST={r['test']}")
