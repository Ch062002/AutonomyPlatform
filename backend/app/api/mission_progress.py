import json
import os

from fastapi import APIRouter

router = APIRouter()

MISSION_PROGRESS_FILE = "/tmp/mission_progress.json"

mission_override_status = None

latest_progress = {
    "mission_state": "Idle",
    "active_waypoint": 0,
    "total_waypoints": 0,
    "progress_percent": 0,
    "distance_to_waypoint": None,
    "current_position": None,
    "target_position": None
}


def set_mission_aborted():
    global mission_override_status

    mission_override_status = {
        "mission_state": "Aborted",
        "active_waypoint": 0,
        "total_waypoints": 0,
        "progress_percent": 0,
        "distance_to_waypoint": None,
        "current_position": None,
        "target_position": None
    }


def reset_mission_progress():
    global mission_override_status
    global latest_progress

    mission_override_status = None

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

    if mission_override_status is not None:
        return mission_override_status

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