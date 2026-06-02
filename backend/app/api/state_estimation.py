import csv
import json
import os
from datetime import datetime, timezone

from fastapi import APIRouter
from fastapi.responses import FileResponse

from app.state_estimation.ekf import SimpleEKF
from app.state_estimation.ukf import PlaceholderUKF

router = APIRouter()

STATE_ESTIMATION_LOG_FILE = "/tmp/state_estimation_log.jsonl"
STATE_ESTIMATION_EXPORT_FILE = "/tmp/state_estimation_export.csv"
EKF_LOG_FILE = "/tmp/ekf_log.jsonl"
UKF_LOG_FILE = "/tmp/ukf_log.jsonl"
ESTIMATION_COMPARISON_LOG_FILE = "/tmp/estimation_comparison_log.jsonl"

ekf_filter = SimpleEKF()
ukf_filter = PlaceholderUKF()

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


def is_valid_number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def get_velocity_components(telemetry):
    velocity_x = telemetry.get("velocity_x", telemetry.get("vx"))
    velocity_y = telemetry.get("velocity_y", telemetry.get("vy"))

    if is_valid_number(velocity_x) and is_valid_number(velocity_y):
        return velocity_x, velocity_y

    velocity = telemetry.get("velocity")

    if is_valid_number(velocity):
        return velocity, 0.0

    return 0.0, 0.0


def append_ekf_log(result):
    log_entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        **result,
    }

    with open(EKF_LOG_FILE, "a") as f:
        f.write(json.dumps(log_entry) + "\n")


def append_ukf_log(result):
    log_entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        **result,
    }

    with open(UKF_LOG_FILE, "a") as f:
        f.write(json.dumps(log_entry) + "\n")


def append_comparison_log(result):
    log_entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        **result,
    }

    with open(ESTIMATION_COMPARISON_LOG_FILE, "a") as f:
        f.write(json.dumps(log_entry) + "\n")


def read_ekf_logs(limit=100000):
    if not os.path.exists(EKF_LOG_FILE):
        return []

    logs = []

    with open(EKF_LOG_FILE, "r") as f:
        lines = f.readlines()[-limit:]

    for line in lines:
        try:
            logs.append(json.loads(line))
        except Exception:
            continue

    return logs


def read_ukf_logs(limit=100000):
    if not os.path.exists(UKF_LOG_FILE):
        return []

    logs = []

    with open(UKF_LOG_FILE, "r") as f:
        lines = f.readlines()[-limit:]

    for line in lines:
        try:
            logs.append(json.loads(line))
        except Exception:
            continue

    return logs


def read_comparison_logs(limit=100000):
    if not os.path.exists(ESTIMATION_COMPARISON_LOG_FILE):
        return []

    logs = []

    with open(ESTIMATION_COMPARISON_LOG_FILE, "r") as f:
        lines = f.readlines()[-limit:]

    for line in lines:
        try:
            logs.append(json.loads(line))
        except Exception:
            continue

    return logs


def safe_numeric_values(values):
    numeric_values = []

    for value in values:
        if is_valid_number(value):
            numeric_values.append(value)

    return numeric_values


def safe_average(values):
    numeric_values = safe_numeric_values(values)

    if not numeric_values:
        return None

    return sum(numeric_values) / len(numeric_values)


def safe_max(values):
    numeric_values = safe_numeric_values(values)

    if not numeric_values:
        return None

    return max(numeric_values)


def build_ekf_result():
    telemetry = get_latest_telemetry_data()
    latitude = telemetry.get("latitude", telemetry.get("lat"))
    longitude = telemetry.get("longitude", telemetry.get("lon"))
    velocity_x, velocity_y = get_velocity_components(telemetry)

    result = {
        "enabled": True,
        "status": "running",
        "raw_position": {
            "x": latitude,
            "y": longitude,
            "latitude": latitude,
            "longitude": longitude,
        },
        "estimated_position": {
            "x": None,
            "y": None,
        },
        "estimated_velocity": {
            "vx": None,
            "vy": None,
        },
        "innovation": None,
        "covariance_trace": None,
        "health": "waiting_for_gps",
        "ukf": build_filter_placeholder("UKF"),
        "complementary_filter": build_filter_placeholder("Complementary Filter"),
        "observer": build_filter_placeholder("Observer"),
    }

    if not is_valid_number(latitude) or not is_valid_number(longitude):
        return result

    ekf_update = ekf_filter.update(
        latitude,
        longitude,
        velocity_x,
        velocity_y
    )

    result["estimated_position"] = {
        "x": ekf_update["estimated_x"],
        "y": ekf_update["estimated_y"],
    }
    result["estimated_velocity"] = {
        "vx": ekf_update["estimated_vx"],
        "vy": ekf_update["estimated_vy"],
    }
    result["innovation"] = ekf_update["innovation"]
    result["covariance_trace"] = ekf_update["covariance_trace"]
    result["health"] = (
        "healthy"
        if ekf_update["covariance_trace"] < 30.0
        else "converging"
    )

    return result


def build_ukf_result():
    telemetry = get_latest_telemetry_data()
    latitude = telemetry.get("latitude", telemetry.get("lat"))
    longitude = telemetry.get("longitude", telemetry.get("lon"))
    velocity_x, velocity_y = get_velocity_components(telemetry)

    result = {
        "enabled": True,
        "status": "placeholder",
        "raw_position": {
            "x": latitude,
            "y": longitude,
            "latitude": latitude,
            "longitude": longitude,
        },
        "estimated_position": {
            "x": None,
            "y": None,
        },
        "estimated_velocity": {
            "vx": None,
            "vy": None,
        },
        "innovation": None,
        "covariance_trace": None,
        "health": "waiting_for_gps",
        "implementation": "placeholder_unscented_framework",
    }

    if not is_valid_number(latitude) or not is_valid_number(longitude):
        return result

    ukf_update = ukf_filter.update(
        latitude,
        longitude,
        velocity_x,
        velocity_y
    )

    result["estimated_position"] = {
        "x": ukf_update["estimated_x"],
        "y": ukf_update["estimated_y"],
    }
    result["estimated_velocity"] = {
        "vx": ukf_update["estimated_vx"],
        "vy": ukf_update["estimated_vy"],
    }
    result["innovation"] = ukf_update["innovation"]
    result["covariance_trace"] = ukf_update["covariance_trace"]
    result["health"] = (
        "healthy"
        if ukf_update["covariance_trace"] < 36.0
        else "converging"
    )

    return result


def vector_difference_norm(first, second, keys):
    values = []

    for key in keys:
        first_value = first.get(key)
        second_value = second.get(key)

        if is_valid_number(first_value) and is_valid_number(second_value):
            values.append(first_value - second_value)

    if not values:
        return None

    return sum(value * value for value in values) ** 0.5


def build_estimation_comparison():
    telemetry = get_latest_telemetry_data()
    ekf_result = build_ekf_result()
    ukf_result = build_ukf_result()
    ekf_innovation = ekf_result.get("innovation")
    ukf_innovation = ukf_result.get("innovation")

    innovation_difference = None

    if is_valid_number(ekf_innovation) and is_valid_number(ukf_innovation):
        innovation_difference = abs(ekf_innovation - ukf_innovation)

    return {
        "raw_gps": build_raw_gps_status(telemetry),
        "ekf": ekf_result,
        "ukf": ukf_result,
        "comparison": {
            "position_difference": vector_difference_norm(
                ekf_result.get("estimated_position", {}),
                ukf_result.get("estimated_position", {}),
                ["x", "y"]
            ),
            "velocity_difference": vector_difference_norm(
                ekf_result.get("estimated_velocity", {}),
                ukf_result.get("estimated_velocity", {}),
                ["vx", "vy"]
            ),
            "innovation_difference": innovation_difference,
        }
    }


def build_state_estimation_status():
    telemetry = get_latest_telemetry_data()
    ekf_result = build_ekf_result()
    ukf_result = build_ukf_result()

    return {
        "raw_gps": build_raw_gps_status(telemetry),
        "ekf": {
            "enabled": ekf_result["enabled"],
            "status": ekf_result["status"],
            "output": {
                "position": ekf_result["estimated_position"],
                "velocity": ekf_result["estimated_velocity"],
            },
            "covariance": ekf_result["covariance_trace"],
            "innovation": ekf_result["innovation"],
            "health": ekf_result["health"],
        },
        "ukf": {
            "enabled": ukf_result["enabled"],
            "status": ukf_result["status"],
            "output": {
                "position": ukf_result["estimated_position"],
                "velocity": ukf_result["estimated_velocity"],
            },
            "covariance": ukf_result["covariance_trace"],
            "innovation": ukf_result["innovation"],
            "health": ukf_result["health"],
        },
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


@router.get("/state-estimation/ekf")
def get_ekf_status():
    result = build_ekf_result()
    append_ekf_log(result)
    return result


@router.get("/state-estimation/ukf")
def get_ukf_status():
    result = build_ukf_result()
    append_ukf_log(result)
    return result


@router.get("/state-estimation/ekf/analytics")
def get_ekf_analytics():
    logs = read_ekf_logs(limit=100000)

    return {
        "status": "success",
        "message": "EKF analytics generated successfully",
        "analytics": {
            "samples": len(logs),
            "avg_innovation": safe_average(
                log.get("innovation") for log in logs
            ),
            "max_innovation": safe_max(
                log.get("innovation") for log in logs
            ),
            "avg_covariance_trace": safe_average(
                log.get("covariance_trace") for log in logs
            ),
        }
    }


@router.get("/state-estimation/comparison")
def get_estimation_comparison():
    result = build_estimation_comparison()
    append_ekf_log(result["ekf"])
    append_ukf_log(result["ukf"])
    append_comparison_log(result)
    return result


@router.get("/state-estimation/comparison/analytics")
def get_estimation_comparison_analytics():
    logs = read_comparison_logs(limit=100000)

    return {
        "status": "success",
        "message": "Estimation comparison analytics generated successfully",
        "analytics": {
            "samples": len(logs),
            "avg_position_difference": safe_average(
                log.get("comparison", {}).get("position_difference")
                for log in logs
            ),
            "max_position_difference": safe_max(
                log.get("comparison", {}).get("position_difference")
                for log in logs
            ),
            "avg_velocity_difference": safe_average(
                log.get("comparison", {}).get("velocity_difference")
                for log in logs
            ),
            "avg_innovation_difference": safe_average(
                log.get("comparison", {}).get("innovation_difference")
                for log in logs
            ),
        }
    }


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
