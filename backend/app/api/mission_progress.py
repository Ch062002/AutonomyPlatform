import json
import os

from fastapi import APIRouter

router = APIRouter()

MISSION_PROGRESS_FILE = "/tmp/mission_progress.json"

latest_progress = {
    "mission_state": "Idle",
    "active_waypoint": 0,
    "total_waypoints": 0,
    "progress_percent": 0,
    "distance_to_waypoint": None,
    "current_position": None,
    "target_position": None
}


def set_mission_state(
    state: str,
    active_waypoint: int = 0,
    total_waypoints: int = 0,
    progress_percent: int = 0
):
    global latest_progress

    latest_progress = {
        "mission_state": state,
        "active_waypoint": active_waypoint,
        "total_waypoints": total_waypoints,
        "progress_percent": progress_percent,
        "distance_to_waypoint": None,
        "current_position": None,
        "target_position": None
    }

    with open(MISSION_PROGRESS_FILE, "w") as f:
        json.dump(latest_progress, f)


def set_mission_aborted():
    set_mission_state("Aborted")


def set_mission_landing():
    set_mission_state("Landing")


def reset_mission_progress():
    global latest_progress

    latest_progress = {
        "mission_state": "Idle",
        "active_waypoint": 0,
        "total_waypoints": 0,
        "progress_percent": 0,
        "distance_to_waypoint": None,
        "current_position": None,
        "target_position": None
    }

    if os.path.exists(MISSION_PROGRESS_FILE):
        os.remove(MISSION_PROGRESS_FILE)


@router.get("/mission/progress")
def get_mission_progress():
    global latest_progress

    try:
        if os.path.exists(MISSION_PROGRESS_FILE):
            with open(MISSION_PROGRESS_FILE, "r") as f:
                latest_progress = json.load(f)

        return latest_progress

    except Exception as e:
        return {
            **latest_progress,
            "error": str(e)
        }