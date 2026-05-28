from app.api.mission import router as mission_router
from app.api.telemetry import router as telemetry_router
from app.api.gazebo_status import router as gazebo_router
from app.api.px4_status import router as px4_router
from app.api.ros2_status import router as ros2_router
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.health import router as health_router

app = FastAPI(
    title="Aerospace Autonomy Platform Backend",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(ros2_router)
app.include_router(px4_router)
app.include_router(gazebo_router)
app.include_router(telemetry_router)
app.include_router(mission_router)

@app.get("/")
def root():
    return {"message": "Autonomy Platform Backend is running"}
