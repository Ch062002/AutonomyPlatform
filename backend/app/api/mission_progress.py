import json
import os
import subprocess

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
    "target_position": None,
    "guidance_mode": "DIRECT_WAYPOINT",
    "cross_track_error": None,
    "along_track_distance": None,
    "path_length": None
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
        "target_position": None,
        "guidance_mode": "DIRECT_WAYPOINT",
        "cross_track_error": None,
        "along_track_distance": None,
        "path_length": None
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
        "target_position": None,
        "guidance_mode": "DIRECT_WAYPOINT",
        "cross_track_error": None,
        "along_track_distance": None,
        "path_length": None
    }

    if os.path.exists(MISSION_PROGRESS_FILE):
        os.remove(MISSION_PROGRESS_FILE)


def get_latest_guidance_data():
    try:
        guidance_file = "/tmp/guidance_output.json"

        if os.path.exists(guidance_file):
            with open(guidance_file, "r") as f:
                return json.load(f)

        return {}

    except Exception as e:
        return {"guidance_error": str(e)}


@router.get("/mission/progress")
def get_mission_progress():
    global latest_progress

    try:
        if os.path.exists(MISSION_PROGRESS_FILE):
            with open(MISSION_PROGRESS_FILE, "r") as f:
                latest_progress = json.load(f)

        guidance_data = get_latest_guidance_data()

        if guidance_data:
            latest_progress["guidance_mode"] = guidance_data.get(
                "guidance_mode",
                latest_progress.get("guidance_mode", "DIRECT_WAYPOINT")
            )
            latest_progress["cross_track_error"] = guidance_data.get("cross_track_error")
            latest_progress["along_track_distance"] = guidance_data.get("along_track_distance")
            latest_progress["path_length"] = guidance_data.get("path_length")

            if "guidance_error" in guidance_data:
                latest_progress["guidance_error"] = guidance_data["guidance_error"]

        return latest_progress

    except Exception as e:
        return {
            **latest_progress,
            "error": str(e)
        }