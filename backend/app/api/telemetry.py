from fastapi import APIRouter
import app.services.ros2_bridge as ros2_bridge

router = APIRouter()

@router.get("/telemetry")
def get_telemetry():
    return ros2_bridge.latest_telemetry