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
NAVIGATION_LOG_FILE = "/tmp/navigation_metrics_log.jsonl"
NAVIGATION_EXPORT_FILE = "/tmp/navigation_metrics_export.csv"

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

GUIDANCE_ANALYTICS_MODES = [
    "DIRECT_WAYPOINT",
    "LOS_GUIDANCE",
    "PURE_PURSUIT",
    "VECTOR_FIELD",
    "DUBINS",
]

NAVIGATION_LOG_FIELDS = [
    "timestamp",
    "latitude",
    "longitude",
    "global_altitude",
    "current_position",
    "velocity",
    "nav_state",
    "flight_mode",
    "arming_state",
    "failsafe",
    "navigation_health",
    "position_source",
    "estimator_status",
    "ekf_status",
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


def is_valid_number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def get_navigation_health(telemetry):
    latitude = telemetry.get("latitude", telemetry.get("lat"))
    longitude = telemetry.get("longitude", telemetry.get("lon"))
    failsafe = bool(telemetry.get("failsafe", False))

    if is_valid_number(latitude) and is_valid_number(longitude) and not failsafe:
        return "Healthy"

    return "Warning"


def get_latest_telemetry_data():
    try:
        import app.services.ros2_bridge as ros2_bridge

        return ros2_bridge.latest_telemetry or {}
    except Exception:
        return {}


def build_navigation_log_entry(progress, telemetry):
    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "latitude": telemetry.get("latitude", telemetry.get("lat")),
        "longitude": telemetry.get("longitude", telemetry.get("lon")),
        "global_altitude": telemetry.get(
            "global_altitude",
            telemetry.get("altitude")
        ),
        "current_position": progress.get(
            "current_position",
            telemetry.get("current_position", telemetry.get("local_position"))
        ),
        "velocity": telemetry.get("velocity"),
        "nav_state": telemetry.get("nav_state", telemetry.get("flight_mode")),
        "flight_mode": telemetry.get("flight_mode"),
        "arming_state": telemetry.get("arming_state"),
        "failsafe": telemetry.get("failsafe"),
        "navigation_health": get_navigation_health(telemetry),
        "position_source": telemetry.get("position_source", "GPS/SITL"),
        "estimator_status": telemetry.get(
            "estimator_status",
            "Pending integration"
        ),
        "ekf_status": telemetry.get("ekf_status", "Pending integration"),
    }


def append_navigation_log(progress):
    telemetry = get_latest_telemetry_data()
    log_entry = build_navigation_log_entry(progress, telemetry)

    with open(NAVIGATION_LOG_FILE, "a") as f:
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


def read_navigation_logs(limit=100):
    if not os.path.exists(NAVIGATION_LOG_FILE):
        return []

    logs = []

    with open(NAVIGATION_LOG_FILE, "r") as f:
        lines = f.readlines()[-limit:]

    for line in lines:
        try:
            logs.append(json.loads(line))
        except Exception:
            continue

    return logs


def read_all_navigation_logs():
    if not os.path.exists(NAVIGATION_LOG_FILE):
        return []

    logs = []

    with open(NAVIGATION_LOG_FILE, "r") as f:
        for line in f:
            try:
                logs.append(json.loads(line))
            except Exception:
                continue

    return logs


def read_all_guidance_logs():
    if not os.path.exists(GUIDANCE_LOG_FILE):
        return []

    logs = []

    with open(GUIDANCE_LOG_FILE, "r") as f:
        for line in f:
            try:
                logs.append(json.loads(line))
            except Exception:
                continue

    return logs


def safe_numeric_values(values):
    numeric_values = []

    for value in values:
        if value is None or isinstance(value, bool):
            continue

        if isinstance(value, (int, float)):
            numeric_values.append(value)

    return numeric_values


def safe_average(values):
    numeric_values = safe_numeric_values(values)

    if not numeric_values:
        return None

    return sum(numeric_values) / len(numeric_values)


def safe_min(values):
    numeric_values = safe_numeric_values(values)

    if not numeric_values:
        return None

    return min(numeric_values)


def safe_max(values):
    numeric_values = safe_numeric_values(values)

    if not numeric_values:
        return None

    return max(numeric_values)


def group_logs_by_guidance_mode(logs):
    grouped_logs = {mode: [] for mode in GUIDANCE_ANALYTICS_MODES}

    for log in logs:
        mode = log.get("guidance_mode")

        if mode in grouped_logs:
            grouped_logs[mode].append(log)

    return grouped_logs


def count_completed_waypoints(logs):
    return sum(
        1
        for log in logs
        if isinstance(log.get("progress_percent"), (int, float))
        and log.get("progress_percent") >= 100
    )


def average_turn_feasible_ratio(logs):
    turn_feasible_values = [
        log.get("turn_feasible")
        for log in logs
        if isinstance(log.get("turn_feasible"), bool)
    ]

    if not turn_feasible_values:
        return None

    feasible_count = sum(1 for value in turn_feasible_values if value)
    return feasible_count / len(turn_feasible_values)


def build_mode_analytics(logs):
    analytics = {
        "samples": len(logs),
        "avg_cross_track_error": safe_average(
            log.get("cross_track_error") for log in logs
        ),
        "max_cross_track_error": safe_max(
            log.get("cross_track_error") for log in logs
        ),
        "avg_distance_to_waypoint": safe_average(
            log.get("distance_to_waypoint") for log in logs
        ),
        "min_distance_to_waypoint": safe_min(
            log.get("distance_to_waypoint") for log in logs
        ),
        "avg_heading_error": safe_average(
            log.get("heading_error") for log in logs
        ),
        "avg_path_length": safe_average(log.get("path_length") for log in logs),
        "avg_progress_percent": safe_average(
            log.get("progress_percent") for log in logs
        ),
        "completion_count": count_completed_waypoints(logs),
    }

    return analytics


def count_gps_samples(logs):
    return sum(
        1
        for log in logs
        if is_valid_number(log.get("latitude"))
        and is_valid_number(log.get("longitude"))
    )


def build_position_source_summary(logs):
    summary = {}

    for log in logs:
        source = log.get("position_source") or "Unknown"
        summary[source] = summary.get(source, 0) + 1

    return summary


def build_navigation_analytics(logs):
    return {
        "samples": len(logs),
        "avg_velocity": safe_average(log.get("velocity") for log in logs),
        "max_velocity": safe_max(log.get("velocity") for log in logs),
        "avg_global_altitude": safe_average(
            log.get("global_altitude") for log in logs
        ),
        "min_global_altitude": safe_min(
            log.get("global_altitude") for log in logs
        ),
        "max_global_altitude": safe_max(
            log.get("global_altitude") for log in logs
        ),
        "failsafe_count": sum(1 for log in logs if log.get("failsafe") is True),
        "healthy_count": sum(
            1 for log in logs if log.get("navigation_health") == "Healthy"
        ),
        "warning_count": sum(
            1 for log in logs if log.get("navigation_health") == "Warning"
        ),
        "gps_sample_count": count_gps_samples(logs),
        "position_source_summary": build_position_source_summary(logs),
    }


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
        append_navigation_log(latest_progress)

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


@router.get("/guidance/analytics")
def get_guidance_analytics():
    logs = read_all_guidance_logs()

    if not logs:
        return {
            "status": "success",
            "message": "No guidance logs available for analytics",
            "analytics": {}
        }

    grouped_logs = group_logs_by_guidance_mode(logs)
    analytics = {}

    for mode, mode_logs in grouped_logs.items():
        if not mode_logs:
            continue

        mode_analytics = build_mode_analytics(mode_logs)

        if mode == "DUBINS":
            mode_analytics["average_turn_feasible_ratio"] = (
                average_turn_feasible_ratio(mode_logs)
            )

        if mode == "VECTOR_FIELD":
            mode_analytics["avg_field_strength"] = safe_average(
                log.get("field_strength") for log in mode_logs
            )

        if mode == "PURE_PURSUIT":
            mode_analytics["avg_pursuit_distance"] = safe_average(
                log.get("pursuit_distance") for log in mode_logs
            )

        if mode == "DIRECT_WAYPOINT":
            mode_analytics["avg_distance_to_target"] = safe_average(
                log.get("distance_to_target") for log in mode_logs
            )

        analytics[mode] = mode_analytics

    return {
        "status": "success",
        "message": "Guidance analytics generated successfully",
        "analytics": analytics
    }


@router.get("/navigation/logs")
def get_navigation_logs():
    return read_navigation_logs(limit=100)


@router.get("/navigation/analytics")
def get_navigation_analytics():
    logs = read_all_navigation_logs()

    if not logs:
        return {
            "status": "success",
            "message": "No navigation logs available for analytics",
            "analytics": {}
        }

    return {
        "status": "success",
        "message": "Navigation analytics generated successfully",
        "analytics": build_navigation_analytics(logs)
    }


@router.post("/navigation/logs/clear")
def clear_navigation_logs():
    if os.path.exists(NAVIGATION_LOG_FILE):
        os.remove(NAVIGATION_LOG_FILE)

    if os.path.exists(NAVIGATION_EXPORT_FILE):
        os.remove(NAVIGATION_EXPORT_FILE)

    return {
        "status": "success",
        "message": "Navigation logs cleared successfully"
    }


@router.get("/navigation/logs/export")
def export_navigation_logs():
    logs = read_navigation_logs(limit=100000)

    with open(NAVIGATION_EXPORT_FILE, "w", newline="") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=NAVIGATION_LOG_FIELDS)
        writer.writeheader()

        for log in logs:
            row = {}

            for field in NAVIGATION_LOG_FIELDS:
                value = log.get(field)

                if isinstance(value, (list, dict)):
                    value = json.dumps(value)

                row[field] = value

            writer.writerow(row)

    return FileResponse(
        NAVIGATION_EXPORT_FILE,
        media_type="text/csv",
        filename="navigation_metrics_export.csv"
    )


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
