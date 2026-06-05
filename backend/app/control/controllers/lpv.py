import copy
import json
import os
from datetime import datetime, timezone

LPV_LOG_FILE = "/tmp/lpv_log.jsonl"

DEFAULT_SCHEDULING_VARIABLES = {
    "altitude": {
        "source": "telemetry.altitude",
        "range": [0.0, 500.0],
        "units": "m",
    },
    "velocity": {
        "source": "telemetry.velocity",
        "range": [0.0, 45.0],
        "units": "m/s",
    },
}

DEFAULT_REGIONS = {
    "hover_low": {
        "altitude": [0.0, 30.0],
        "velocity": [0.0, 3.0],
        "gains": {"kp": 0.75, "ki": 0.025, "kd": 0.12},
    },
    "cruise_mid": {
        "altitude": [30.0, 120.0],
        "velocity": [3.0, 15.0],
        "gains": {"kp": 0.95, "ki": 0.03, "kd": 0.14},
    },
    "fast_forward": {
        "altitude": [30.0, 180.0],
        "velocity": [15.0, 45.0],
        "gains": {"kp": 1.18, "ki": 0.028, "kd": 0.18},
    },
    "high_altitude": {
        "altitude": [120.0, 500.0],
        "velocity": [3.0, 25.0],
        "gains": {"kp": 0.86, "ki": 0.02, "kd": 0.13},
    },
}


def _is_number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def _safe_float(value, fallback=0.0):
    if _is_number(value):
        return float(value)

    try:
        return float(value)
    except (TypeError, ValueError):
        return fallback


def _copy(value):
    return copy.deepcopy(value)


def _clamp(value, lower, upper):
    return max(lower, min(upper, value))


def _normalize(value, value_range):
    lower, upper = value_range

    if upper <= lower:
        return 0.0

    return _clamp((value - lower) / (upper - lower), 0.0, 1.0)


def append_lpv_log(result):
    log_entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        **result,
    }

    with open(LPV_LOG_FILE, "a") as f:
        f.write(json.dumps(log_entry) + "\n")


def read_lpv_logs(limit=100000):
    if not os.path.exists(LPV_LOG_FILE):
        return []

    logs = []

    with open(LPV_LOG_FILE, "r") as f:
        lines = f.readlines()[-limit:]

    for line in lines:
        try:
            logs.append(json.loads(line))
        except Exception:
            continue

    return logs


class LPVController:
    name = "LPV"

    def __init__(self):
        self.enabled = True
        self.scheduling_variables = _copy(DEFAULT_SCHEDULING_VARIABLES)
        self.regions = _copy(DEFAULT_REGIONS)
        self.last_status = None

    def get_status(self, telemetry=None):
        telemetry = telemetry or {}
        altitude = _safe_float(
            telemetry.get("altitude", telemetry.get("global_altitude", 0.0))
        )
        velocity = _safe_float(telemetry.get("velocity", telemetry.get("speed", 0.0)))
        scheduling_parameter = self._scheduling_parameter(altitude, velocity)
        active_region = self._active_region(altitude, velocity)
        interpolated_gain = self._interpolated_gain(
            altitude,
            velocity,
            scheduling_parameter,
            active_region,
        )

        status = {
            "controller_name": self.name,
            "status": "active" if self.enabled else "disabled",
            "enabled": self.enabled,
            "scheduling_variables": _copy(self.scheduling_variables),
            "altitude_parameter": scheduling_parameter["altitude"],
            "velocity_parameter": scheduling_parameter["velocity"],
            "scheduling_parameter": scheduling_parameter,
            "altitude": altitude,
            "velocity": velocity,
            "active_region": active_region,
            "interpolated_gain": interpolated_gain,
            "lpv_health": self._health(active_region),
            "health": self._health(active_region),
            "future_ready": self._future_ready(),
        }

        self.last_status = status
        append_lpv_log(status)
        return status

    def get_config(self):
        return {
            "controller_name": self.name,
            "enabled": self.enabled,
            "scheduling_variables": _copy(self.scheduling_variables),
            "regions": _copy(self.regions),
            "future_ready": self._future_ready(),
        }

    def update_config(self, config):
        if not isinstance(config, dict):
            return self.get_config()

        if "enabled" in config:
            self.enabled = bool(config["enabled"])

        if isinstance(config.get("scheduling_variables"), dict):
            self.scheduling_variables = _copy(config["scheduling_variables"])

        if isinstance(config.get("regions"), dict):
            self.regions = _copy(config["regions"])

        return self.get_config()

    def get_analytics(self):
        logs = read_lpv_logs()
        latest = logs[-1] if logs else self.last_status or {}
        health_counts = {}

        for log in logs:
            health = log.get("lpv_health", "unknown")
            health_counts[health] = health_counts.get(health, 0) + 1

        return {
            "controller_name": self.name,
            "samples": len(logs),
            "scheduling_parameter": latest.get("scheduling_parameter", {}),
            "active_region": latest.get("active_region", "unknown"),
            "interpolated_gain": latest.get("interpolated_gain", {}),
            "average_tracking_error_placeholder": None,
            "stability_margin_placeholder": None,
            "lpv_health": self._dominant_health(health_counts, latest),
            "future_ready": self._future_ready(),
        }

    def _scheduling_parameter(self, altitude, velocity):
        altitude_range = self.scheduling_variables.get("altitude", {}).get(
            "range",
            DEFAULT_SCHEDULING_VARIABLES["altitude"]["range"],
        )
        velocity_range = self.scheduling_variables.get("velocity", {}).get(
            "range",
            DEFAULT_SCHEDULING_VARIABLES["velocity"]["range"],
        )

        return {
            "altitude": _normalize(altitude, altitude_range),
            "velocity": _normalize(velocity, velocity_range),
        }

    def _active_region(self, altitude, velocity):
        for name, region in self.regions.items():
            altitude_range = region.get("altitude", [0.0, 0.0])
            velocity_range = region.get("velocity", [0.0, 0.0])

            if (
                altitude_range[0] <= altitude <= altitude_range[1]
                and velocity_range[0] <= velocity <= velocity_range[1]
            ):
                return name

        return self._nearest_region(altitude, velocity)

    def _nearest_region(self, altitude, velocity):
        if not self.regions:
            return "unconfigured"

        def distance(item):
            _, region = item
            altitude_mid = sum(region.get("altitude", [0.0, 0.0])) / 2.0
            velocity_mid = sum(region.get("velocity", [0.0, 0.0])) / 2.0
            return abs(altitude - altitude_mid) + abs(velocity - velocity_mid)

        return min(self.regions.items(), key=distance)[0]

    def _interpolated_gain(self, altitude, velocity, scheduling_parameter, active_region):
        if active_region not in self.regions:
            return {"kp": 0.0, "ki": 0.0, "kd": 0.0}

        active_gains = self.regions[active_region].get("gains", {})
        nearest = self._nearest_neighbors(altitude, velocity, active_region)

        if not nearest:
            return _copy(active_gains)

        blend = 0.5 * (
            scheduling_parameter.get("altitude", 0.0)
            + scheduling_parameter.get("velocity", 0.0)
        )
        neighbor_gains = nearest[0].get("gains", {})

        return {
            key: (1.0 - blend) * _safe_float(active_gains.get(key), 0.0)
            + blend * _safe_float(neighbor_gains.get(key), 0.0)
            for key in ("kp", "ki", "kd")
        }

    def _nearest_neighbors(self, altitude, velocity, active_region):
        neighbors = [
            (name, region)
            for name, region in self.regions.items()
            if name != active_region
        ]

        def distance(item):
            _, region = item
            altitude_mid = sum(region.get("altitude", [0.0, 0.0])) / 2.0
            velocity_mid = sum(region.get("velocity", [0.0, 0.0])) / 2.0
            return abs(altitude - altitude_mid) + abs(velocity - velocity_mid)

        return [region for _, region in sorted(neighbors, key=distance)]

    def _health(self, active_region):
        if not self.enabled:
            return "disabled"

        if active_region == "unconfigured":
            return "unconfigured"

        return "ready"

    def _dominant_health(self, health_counts, latest):
        if not health_counts:
            return latest.get("lpv_health", "unknown")

        return max(health_counts.items(), key=lambda item: item[1])[0]

    def _future_ready(self):
        return {
            "robust_mpc": "extension_slot",
            "tube_mpc": "extension_slot",
            "gain_scheduled_lpv_comparison": "extension_slot",
        }


lpv_controller = LPVController()
