# AV Retail Hive - Backend Setup

This application requires a local Python backend to connect to your PostgreSQL database.

## 1. Prerequisites
- Python 3.9+ installed
- PostgreSQL installed and running
- Your database `Amazon_Combined` restored/available

## 2. Setup Backend

1. Create a folder named `backend`
2. Save `main.py` and `requirements.txt` in that folder.
3. Open a terminal in that folder.

## 3. Install Dependencies

```bash
pip install -r requirements.txt
```

## 4. Run the Server

```bash
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.

## 5. Frontend

The frontend is configured to look for the backend at `http://localhost:8000`.
Ensure your browser does not block "Mixed Content" if running the frontend on HTTPS and backend on HTTP.
