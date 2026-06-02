import csv
import json
import os
from datetime import datetime, timezone

from fastapi import APIRouter
from fastapi.responses import FileResponse

router = APIRouter()

MISSION_PROGRESS_FILE = "/tmp/mission_progress.json"
GUIDANCE_OUTPUT_FILE = "/tmp/guidance_output.json"
GUIDANCE_LOG_FILE = "/tmp/guidance_metrics_log.jsonl"
GUIDANCE_EXPORT_FILE = "/tmp/guidance_metrics_export.csv"

latest_progress = {
    "mission_state": "Idle",
    "active_waypoint": 0,
    "total_waypoints": 0,
    "progress_percent": 0,
    "distance_to_waypoint": None,
    "current_position": None,
    "target_position": None,
    "guidance_mode": "DIRECT_WAYPOINT",
}


GUIDANCE_LOG_FIELDS = [
    "timestamp",
    "mission_state",
    "guidance_mode",
    "active_waypoint",
    "total_waypoints",
    "progress_percent",
    "distance_to_waypoint",
    "current_position",
    "target_position",
    "cross_track_error",
    "along_track_distance",
    "path_length",
    "distance_to_target",
    "bearing_to_target",
    "altitude_error",
    "lookahead_distance",
    "pursuit_distance",
    "pursuit_heading",
    "desired_heading",
    "path_heading",
    "field_strength",
    "convergence_gain",
    "turn_radius",
    "straight_distance",
    "turn_arc_length",
    "estimated_dubins_length",
    "heading_error",
    "turn_feasible",
]


def read_json_file(path, default=None):
    if default is None:
        default = {}

    try:
        if os.path.exists(path):
            with open(path, "r") as f:
                return json.load(f)
    except Exception:
        return default

    return default


def write_json_file(path, data):
    with open(path, "w") as f:
        json.dump(data, f)


def get_latest_guidance_data():
    return read_json_file(GUIDANCE_OUTPUT_FILE, {})


def append_guidance_log(progress):
    log_entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "mission_state": progress.get("mission_state"),
        "guidance_mode": progress.get("guidance_mode"),
        "active_waypoint": progress.get("active_waypoint"),
        "total_waypoints": progress.get("total_waypoints"),
        "progress_percent": progress.get("progress_percent"),
        "distance_to_waypoint": progress.get("distance_to_waypoint"),
        "current_position": progress.get("current_position"),
        "target_position": progress.get("target_position"),
        "cross_track_error": progress.get("cross_track_error"),
        "along_track_distance": progress.get("along_track_distance"),
        "path_length": progress.get("path_length"),
        "distance_to_target": progress.get("distance_to_target"),
        "bearing_to_target": progress.get("bearing_to_target"),
        "altitude_error": progress.get("altitude_error"),
        "lookahead_distance": progress.get("lookahead_distance"),
        "pursuit_distance": progress.get("pursuit_distance"),
        "pursuit_heading": progress.get("pursuit_heading"),
        "desired_heading": progress.get("desired_heading"),
        "path_heading": progress.get("path_heading"),
        "field_strength": progress.get("field_strength"),
        "convergence_gain": progress.get("convergence_gain"),
        "turn_radius": progress.get("turn_radius"),
        "straight_distance": progress.get("straight_distance"),
        "turn_arc_length": progress.get("turn_arc_length"),
        "estimated_dubins_length": progress.get("estimated_dubins_length"),
        "heading_error": progress.get("heading_error"),
        "turn_feasible": progress.get("turn_feasible"),
    }

    with open(GUIDANCE_LOG_FILE, "a") as f:
        f.write(json.dumps(log_entry) + "\n")


def read_guidance_logs(limit=100):
    if not os.path.exists(GUIDANCE_LOG_FILE):
        return []

    logs = []

    with open(GUIDANCE_LOG_FILE, "r") as f:
        lines = f.readlines()[-limit:]

    for line in lines:
        try:
            logs.append(json.loads(line))
        except Exception:
            continue

    return logs


def set_mission_state(
    state,
    active_waypoint=0,
    total_waypoints=0,
    progress_percent=0
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
    }

    write_json_file(MISSION_PROGRESS_FILE, latest_progress)


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
    }

    if os.path.exists(MISSION_PROGRESS_FILE):
        os.remove(MISSION_PROGRESS_FILE)


@router.get("/mission/progress")
def get_mission_progress():
    global latest_progress

    try:
        latest_progress = read_json_file(
            MISSION_PROGRESS_FILE,
            latest_progress
        )

        guidance_data = get_latest_guidance_data()

        if guidance_data:
            latest_progress["guidance_mode"] = guidance_data.get(
                "guidance_mode",
                latest_progress.get("guidance_mode", "DIRECT_WAYPOINT")
            )

            latest_progress["cross_track_error"] = guidance_data.get("cross_track_error")
            latest_progress["along_track_distance"] = guidance_data.get("along_track_distance")
            latest_progress["path_length"] = guidance_data.get("path_length")

            latest_progress["distance_to_target"] = guidance_data.get("distance_to_target")
            latest_progress["bearing_to_target"] = guidance_data.get("bearing_to_target")
            latest_progress["altitude_error"] = guidance_data.get("altitude_error")

            latest_progress["lookahead_distance"] = guidance_data.get("lookahead_distance")
            latest_progress["pursuit_distance"] = guidance_data.get("pursuit_distance")
            latest_progress["pursuit_heading"] = guidance_data.get("pursuit_heading")

            latest_progress["desired_heading"] = guidance_data.get("desired_heading")
            latest_progress["path_heading"] = guidance_data.get("path_heading")
            latest_progress["field_strength"] = guidance_data.get("field_strength")
            latest_progress["convergence_gain"] = guidance_data.get("convergence_gain")

            latest_progress["turn_radius"] = guidance_data.get("turn_radius")
            latest_progress["straight_distance"] = guidance_data.get("straight_distance")
            latest_progress["turn_arc_length"] = guidance_data.get("turn_arc_length")
            latest_progress["estimated_dubins_length"] = guidance_data.get("estimated_dubins_length")
            latest_progress["heading_error"] = guidance_data.get("heading_error")
            latest_progress["turn_feasible"] = guidance_data.get("turn_feasible")

        append_guidance_log(latest_progress)

        return latest_progress

    except Exception as e:
        return {
            **latest_progress,
            "error": str(e)
        }


@router.get("/guidance/logs")
def get_guidance_logs():
    return read_guidance_logs(limit=100)


@router.post("/guidance/logs/clear")
def clear_guidance_logs():
    if os.path.exists(GUIDANCE_LOG_FILE):
        os.remove(GUIDANCE_LOG_FILE)

    if os.path.exists(GUIDANCE_EXPORT_FILE):
        os.remove(GUIDANCE_EXPORT_FILE)

    return {
        "status": "success",
        "message": "Guidance logs cleared successfully"
    }


@router.get("/guidance/logs/export")
def export_guidance_logs():
    logs = read_guidance_logs(limit=100000)

    with open(GUIDANCE_EXPORT_FILE, "w", newline="") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=GUIDANCE_LOG_FIELDS)
        writer.writeheader()

        for log in logs:
            row = {}

            for field in GUIDANCE_LOG_FIELDS:
                value = log.get(field)

                if isinstance(value, (list, dict)):
                    value = json.dumps(value)

                row[field] = value

            writer.writerow(row)

    return FileResponse(
        GUIDANCE_EXPORT_FILE,
        media_type="text/csv",
        filename="guidance_metrics_export.csv"
    )