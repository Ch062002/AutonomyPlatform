import json
import os
from datetime import datetime, timezone

from fastapi import APIRouter

router = APIRouter()

MISSION_PROGRESS_FILE = "/tmp/mission_progress.json"
GUIDANCE_OUTPUT_FILE = "/tmp/guidance_output.json"
GUIDANCE_METRICS_LOG_FILE = "/tmp/guidance_metrics_log.jsonl"


def _base_progress():
    return {
        "mission_state": "Idle",
        "active_waypoint": 0,
        "total_waypoints": 0,
        "progress_percent": 0,
        "distance_to_waypoint": None,
        "current_position": None,
        "target_position": None,
        "guidance_mode": "DIRECT_WAYPOINT",
    }


def _guidance_metric_fields():
    return {
        "cross_track_error": None,
        "along_track_distance": None,
        "path_length": None,
        "distance_to_target": None,
        "bearing_to_target": None,
        "altitude_error": None,
        "lookahead_distance": None,
        "pursuit_distance": None,
        "pursuit_heading": None,
        "desired_heading": None,
        "path_heading": None,
        "field_strength": None,
        "convergence_gain": None,
        "turn_radius": None,
        "straight_distance": None,
        "turn_arc_length": None,
        "estimated_dubins_length": None,
        "heading_error": None,
        "turn_feasible": None,
    }


def _default_progress():
    return {
        **_base_progress(),
        **_guidance_metric_fields(),
    }


def _normalize_progress(data):
    normalized = _default_progress()

    if isinstance(data, dict):
        for key in normalized:
            if key in data:
                normalized[key] = data.get(key)

    return normalized

latest_progress = _default_progress()


def _write_mission_progress():
    with open(MISSION_PROGRESS_FILE, "w") as f:
        json.dump(latest_progress, f)


def _build_guidance_log_entry(progress):
    return {
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


def _normalize_guidance_log_entry(entry):
    normalized = _build_guidance_log_entry(_normalize_progress(entry))
    normalized["timestamp"] = entry.get("timestamp") if isinstance(entry, dict) else None
    return normalized


def _append_guidance_metrics_log(progress):
    try:
        entry = _build_guidance_log_entry(progress)
        with open(GUIDANCE_METRICS_LOG_FILE, "a") as f:
            f.write(json.dumps(entry) + "\n")
    except Exception:
        pass


def set_mission_state(
    state: str,
    active_waypoint: int = 0,
    total_waypoints: int = 0,
    progress_percent: int = 0
):
    global latest_progress

    latest_progress = _default_progress()
    latest_progress.update({
        "mission_state": state,
        "active_waypoint": active_waypoint,
        "total_waypoints": total_waypoints,
        "progress_percent": progress_percent,
    })

    _write_mission_progress()


def set_mission_aborted():
    set_mission_state("Aborted")


def set_mission_landing():
    set_mission_state("Landing")


def reset_mission_progress():
    global latest_progress

    latest_progress = _default_progress()

    if os.path.exists(MISSION_PROGRESS_FILE):
        os.remove(MISSION_PROGRESS_FILE)


def get_latest_guidance_data():
    try:
        if os.path.exists(GUIDANCE_OUTPUT_FILE):
            with open(GUIDANCE_OUTPUT_FILE, "r") as f:
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
                latest_progress = _normalize_progress(json.load(f))
        else:
            latest_progress = _normalize_progress(latest_progress)

        guidance_data = get_latest_guidance_data()

        if guidance_data:
            for key in _default_progress():
                if key in guidance_data:
                    latest_progress[key] = guidance_data.get(key)

            if "guidance_error" in guidance_data:
                latest_progress["guidance_error"] = guidance_data["guidance_error"]

        latest_progress = _normalize_progress(latest_progress)
        _append_guidance_metrics_log(latest_progress)

        return latest_progress

    except Exception as e:
        return {
            **_normalize_progress(latest_progress),
            "error": str(e)
        }


@router.get("/guidance/logs")
def get_guidance_logs():
    try:
        if not os.path.exists(GUIDANCE_METRICS_LOG_FILE):
            return []

        with open(GUIDANCE_METRICS_LOG_FILE, "r") as f:
            lines = [line.strip() for line in f if line.strip()]

        logs = []
        for line in lines[-100:]:
            try:
                log_entry = json.loads(line)
                logs.append(_normalize_guidance_log_entry(log_entry))
            except json.JSONDecodeError:
                continue

        return logs

    except Exception as e:
        return {
            "logs": [],
            "error": str(e),
        }


@router.post("/guidance/logs/clear")
def clear_guidance_logs():
    try:
        with open(GUIDANCE_METRICS_LOG_FILE, "w") as f:
            f.write("")

        return {
            "status": "success",
            "message": "Guidance metrics log cleared",
        }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
        }
