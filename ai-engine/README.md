# SmartRail Twin AI Engine v2

Standalone FastAPI ML service for the SIH SmartRail Twin problem.

Pipeline: validation -> temporal features -> leakage-safe chronological split -> baseline/candidate ML -> model selection -> inference -> Digital Twin -> risk/recommendations.

Tasks: demand (15/30/60), crowd, occupancy, dynamic ETA, congestion.

Demo uses synthetic data. Real historical railway data is required for real-world accuracy claims.

Run:
`python -m venv .venv`
`pip install -r requirements.txt`
`python scripts/generate_data.py`
`python scripts/train_all.py`
`pytest -q`
`uvicorn app.main:app --reload --port 8001`

Swagger: http://localhost:8001/docs
