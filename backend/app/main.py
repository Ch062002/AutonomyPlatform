from fastapi import FastAPI
from app.api.health import router as health_router

app = FastAPI(
    title="Aerospace Autonomy Platform Backend",
    version="0.1.0"
)

app.include_router(health_router)

@app.get("/")
def root():
    return {"message": "Autonomy Platform Backend is running"}
