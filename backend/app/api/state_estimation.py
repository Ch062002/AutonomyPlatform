import csv
import json
import os
from datetime import datetime, timezone

from fastapi import APIRouter
from fastapi.responses import FileResponse

router = APIRouter()

STATE_ESTIMATION_LOG_FILE = "/tmp/state_estimation_log.jsonl"
STATE_ESTIMATION_EXPORT_FILE = "/tmp/state_estimation_export.csv"

STATE_ESTIMATION_LOG_FIELDS = [
    "timestamp",
    "raw_gps",
    "ekf",
    "ukf",
    "observer",
    "sensor_fusion",
    "estimation_source",
    "covariance_metrics",
    "innovation_metrics",
    "future_comparison_ready",
]


def get_latest_telemetry_data():
    try:
        import app.services.ros2_bridge as ros2_bridge

        return ros2_bridge.latest_telemetry or {}
    except Exception:
        return {}


def build_raw_gps_status(telemetry):
    return {
        "latitude": telemetry.get("latitude", telemetry.get("lat")),
        "longitude": telemetry.get("longitude", telemetry.get("lon")),
        "global_altitude": telemetry.get(
            "global_altitude",
            telemetry.get("altitude")
        ),
        "velocity": telemetry.get("velocity"),
        "position_source": telemetry.get("position_source", "GPS/SITL"),
        "available": bool(
            telemetry.get("latitude", telemetry.get("lat")) is not None
            and telemetry.get("longitude", telemetry.get("lon")) is not None
        ),
    }


def build_filter_placeholder(name):
    return {
        "enabled": False,
        "status": "placeholder",
        "output": None,
        "covariance": None,
        "innovation": None,
        "notes": f"{name} output pending integration",
    }


def build_state_estimation_status():
    telemetry = get_latest_telemetry_data()

    return {
        "raw_gps": build_raw_gps_status(telemetry),
        "ekf": build_filter_placeholder("EKF"),
        "ukf": build_filter_placeholder("UKF"),
        "observer": build_filter_placeholder("Observer"),
        "sensor_fusion": {
            "enabled": False,
            "status": "placeholder",
            "source": "raw_gps",
        },
        "estimation_source": "raw_gps",
        "future_comparison_ready": True,
        "covariance_metrics": {
            "position_covariance": None,
            "velocity_covariance": None,
            "attitude_covariance": None,
        },
        "innovation_metrics": {
            "position_innovation": None,
            "velocity_innovation": None,
            "innovation_norm": None,
        },
    }


def append_state_estimation_log(status):
    log_entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        **status,
    }

    with open(STATE_ESTIMATION_LOG_FILE, "a") as f:
        f.write(json.dumps(log_entry) + "\n")


def read_state_estimation_logs(limit=100):
    if not os.path.exists(STATE_ESTIMATION_LOG_FILE):
        return []

    logs = []

    with open(STATE_ESTIMATION_LOG_FILE, "r") as f:
        lines = f.readlines()[-limit:]

    for line in lines:
        try:
            logs.append(json.loads(line))
        except Exception:
            continue

    return logs


@router.get("/state-estimation/status")
def get_state_estimation_status():
    status = build_state_estimation_status()
    append_state_estimation_log(status)
    return status


@router.get("/state-estimation/logs")
def get_state_estimation_logs():
    return read_state_estimation_logs(limit=100)


@router.post("/state-estimation/logs/clear")
def clear_state_estimation_logs():
    if os.path.exists(STATE_ESTIMATION_LOG_FILE):
        os.remove(STATE_ESTIMATION_LOG_FILE)

    if os.path.exists(STATE_ESTIMATION_EXPORT_FILE):
        os.remove(STATE_ESTIMATION_EXPORT_FILE)

    return {
        "status": "success",
        "message": "State estimation logs cleared successfully"
    }


@router.get("/state-estimation/logs/export")
def export_state_estimation_logs():
    logs = read_state_estimation_logs(limit=100000)

    with open(STATE_ESTIMATION_EXPORT_FILE, "w", newline="") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=STATE_ESTIMATION_LOG_FIELDS)
        writer.writeheader()

        for log in logs:
            row = {}

            for field in STATE_ESTIMATION_LOG_FIELDS:
                value = log.get(field)

                if isinstance(value, (list, dict)):
                    value = json.dumps(value)

                row[field] = value

            writer.writerow(row)

    return FileResponse(
        STATE_ESTIMATION_EXPORT_FILE,
        media_type="text/csv",
        filename="state_estimation_export.csv"
    )
