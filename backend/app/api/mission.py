from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class Mission(BaseModel):
    name: str
    waypoints: list

current_mission = {
    "name": "None",
    "state": "Idle",
    "waypoints": []
}

@router.get("/mission")
def get_mission():
    return current_mission

@router.post("/mission")
def create_mission(mission: Mission):
    current_mission["name"] = mission.name
    current_mission["state"] = "Created"
    current_mission["waypoints"] = mission.waypoints

    return {
        "message": "Mission created successfully",
        "mission": current_mission
    }

@router.delete("/mission")
def reset_mission():
    current_mission["name"] = "None"
    current_mission["state"] = "Idle"
    current_mission["waypoints"] = []

    return {
        "message": "Mission reset successfully",
        "mission": current_mission
    }