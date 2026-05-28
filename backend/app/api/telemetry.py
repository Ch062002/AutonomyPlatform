from fastapi import APIRouter
import random

router = APIRouter()

@router.get("/telemetry")
def get_telemetry():

    return {
        "altitude": round(random.uniform(95, 105), 2),
        "velocity": round(random.uniform(10, 15), 2),
        "battery": round(random.uniform(80, 100), 2),
        "flight_mode": "OFFBOARD"
    }