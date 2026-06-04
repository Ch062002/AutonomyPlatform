import copy
import json
import os
from datetime import datetime, timezone

GAIN_SCHEDULING_LOG_FILE = "/tmp/gain_scheduling_log.jsonl"

DEFAULT_ALTITUDE_REGIONS = {
    "low": [0.0, 30.0],
    "medium": [30.0, 100.0],
    "high": [100.0, 500.0],
}

DEFAULT_VELOCITY_REGIONS = {
    "hover": [0.0, 3.0],
    "cruise": [3.0, 15.0],
    "high_speed": [15.0, 45.0],
}

DEFAULT_SCHEDULES = {
    "hover_low_speed": {
        "altitude_region": "low",
        "velocity_region": "hover",
        "mission_phases": ["idle", "hold", "takeoff", "landing"],
        "disturbance_level": "nominal",
        "pid_gains": {
            "attitude": {"kp": 0.7, "ki": 0.02, "kd": 0.1},
            "altitude": {"kp": 1.3, "ki": 0.05, "kd": 0.22},
            "velocity": {"kp": 0.65, "ki": 0.03, "kd": 0.08},
            "position": {"kp": 0.55, "ki": 0.01, "kd": 0.07},
        },
        "lqr_preset": {
            "q_matrix": [
                [10.0, 0.0, 0.0, 0.0],
                [0.0, 2.0, 0.0, 0.0],
                [0.0, 0.0, 8.0, 0.0],
                [0.0, 0.0, 0.0, 2.0],
            ],
            "r_matrix": [[1.2, 0.0], [0.0, 1.2]],
        },
        "mpc_preset": {
            "prediction_horizon": 10,
            "control_horizon": 3,
            "q_weights": {"position": 7.0, "velocity": 2.0, "altitude": 7.0, "attitude": 2.0},
            "r_weights": {"longitudinal": 1.0, "vertical": 0.9, "yaw": 0.6},
        },
    },
    "cruise_nominal": {
        "altitude_region": "medium",
        "velocity_region": "cruise",
        "mission_phases": ["mission", "offboard", "cruise", "waypoint"],
        "disturbance_level": "nominal",
        "pid_gains": {
            "attitude": {"kp": 0.8, "ki": 0.02, "kd": 0.12},
            "altitude": {"kp": 1.1, "ki": 0.04, "kd": 0.18},
            "velocity": {"kp": 0.9, "ki": 0.03, "kd": 0.1},
            "position": {"kp": 0.7, "ki": 0.01, "kd": 0.08},
        },
        "lqr_preset": {
            "q_matrix": [
                [8.0, 0.0, 0.0, 0.0],
                [0.0, 2.0, 0.0, 0.0],
                [0.0, 0.0, 6.0, 0.0],
                [0.0, 0.0, 0.0, 2.0],
            ],
            "r_matrix": [[1.0, 0.0], [0.0, 1.0]],
        },
        "mpc_preset": {
            "prediction_horizon": 12,
            "control_horizon": 4,
            "q_weights": {"position": 6.0, "velocity": 2.0, "altitude": 5.0, "attitude": 2.0},
            "r_weights": {"longitudinal": 0.8, "vertical": 0.8, "yaw": 0.5},
        },
    },
    "high_altitude_cruise": {
        "altitude_region": "high",
        "velocity_region": "cruise",
        "mission_phases": ["mission", "offboard", "cruise", "waypoint"],
        "disturbance_level": "nominal",
        "pid_gains": {
            "attitude": {"kp": 0.72, "ki": 0.015, "kd": 0.11},
            "altitude": {"kp": 0.95, "ki": 0.03, "kd": 0.16},
            "velocity": {"kp": 0.82, "ki": 0.025, "kd": 0.1},
            "position": {"kp": 0.65, "ki": 0.01, "kd": 0.08},
        },
        "lqr_preset": {
            "q_matrix": [
                [7.0, 0.0, 0.0, 0.0],
                [0.0, 2.5, 0.0, 0.0],
                [0.0, 0.0, 5.0, 0.0],
                [0.0, 0.0, 0.0, 2.5],
            ],
            "r_matrix": [[1.1, 0.0], [0.0, 1.1]],
        },
        "mpc_preset": {
            "prediction_horizon": 14,
            "control_horizon": 5,
            "q_weights": {"position": 5.5, "velocity": 2.5, "altitude": 4.5, "attitude": 2.5},
            "r_weights": {"longitudinal": 0.9, "vertical": 0.9, "yaw": 0.55},
        },
    },
    "aggressive_high_speed": {
        "altitude_region": "medium",
        "velocity_region": "high_speed",
        "mission_phases": ["mission", "offboard", "cruise", "waypoint"],
        "disturbance_level": "nominal",
        "pid_gains": {
            "attitude": {"kp": 1.0, "ki": 0.02, "kd": 0.16},
            "altitude": {"kp": 1.05, "ki": 0.035, "kd": 0.2},
            "velocity": {"kp": 1.1, "ki": 0.03, "kd": 0.14},
            "position": {"kp": 0.9, "ki": 0.015, "kd": 0.11},
        },
        "lqr_preset": {
            "q_matrix": [
                [11.0, 0.0, 0.0, 0.0],
                [0.0, 4.0, 0.0, 0.0],
                [0.0, 0.0, 7.0, 0.0],
                [0.0, 0.0, 0.0, 3.0],
            ],
            "r_matrix": [[0.75, 0.0], [0.0, 0.85]],
        },
        "mpc_preset": {
            "prediction_horizon": 16,
            "control_horizon": 5,
            "q_weights": {"position": 8.5, "velocity": 3.5, "altitude": 6.0, "attitude": 3.0},
            "r_weights": {"longitudinal": 0.65, "vertical": 0.75, "yaw": 0.45},
        },
    },
    "disturbance_rejection": {
        "altitude_region": "any",
        "velocity_region": "any",
        "mission_phases": ["mission", "offboard", "cruise", "waypoint", "hold"],
        "disturbance_level": "elevated",
        "pid_gains": {
            "attitude": {"kp": 1.05, "ki": 0.03, "kd": 0.18},
            "altitude": {"kp": 1.35, "ki": 0.06, "kd": 0.24},
            "velocity": {"kp": 1.0, "ki": 0.04, "kd": 0.14},
            "position": {"kp": 0.95, "ki": 0.02, "kd": 0.12},
        },
        "lqr_preset": {
            "q_matrix": [
                [12.0, 0.0, 0.0, 0.0],
                [0.0, 3.0, 0.0, 0.0],
                [0.0, 0.0, 9.0, 0.0],
                [0.0, 0.0, 0.0, 3.0],
            ],
            "r_matrix": [[0.85, 0.0], [0.0, 0.85]],
        },
        "mpc_preset": {
            "prediction_horizon": 18,
            "control_horizon": 6,
            "q_weights": {"position": 9.0, "velocity": 3.0, "altitude": 8.0, "attitude": 3.0},
            "r_weights": {"longitudinal": 0.7, "vertical": 0.7, "yaw": 0.45},
        },
    },
}


def _safe_float(value, fallback=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return fallback


def _copy(value):
    return copy.deepcopy(value)


def _read_logs(limit=100000):
    if not os.path.exists(GAIN_SCHEDULING_LOG_FILE):
        return []

    logs = []

    with open(GAIN_SCHEDULING_LOG_FILE, "r") as f:
        lines = f.readlines()[-limit:]

    for line in lines:
        try:
            logs.append(json.loads(line))
        except Exception:
            continue

    return logs


class GainSchedulingManager:
    def __init__(self):
        self.enabled = True
        self.altitude_regions = _copy(DEFAULT_ALTITUDE_REGIONS)
        self.velocity_regions = _copy(DEFAULT_VELOCITY_REGIONS)
        self.schedules = _copy(DEFAULT_SCHEDULES)
        self.active_schedule = "cruise_nominal"
        self.previous_schedule = None
        self.schedule_switch_count = 0
        self.last_status = None

    def get_status(self, telemetry=None, disturbance_analytics=None):
        telemetry = telemetry or {}
        disturbance_analytics = disturbance_analytics or {}
        altitude = _safe_float(
            telemetry.get("altitude", telemetry.get("global_altitude", 0.0))
        )
        velocity = _safe_float(telemetry.get("velocity", telemetry.get("speed", 0.0)))
        mission_phase = self._mission_phase(telemetry)
        altitude_region = self._region_for_value(altitude, self.altitude_regions, "low")
        velocity_region = self._region_for_value(velocity, self.velocity_regions, "hover")
        disturbance_level = self._disturbance_level(disturbance_analytics)
        selected_schedule = self._select_schedule(
            altitude_region,
            velocity_region,
            mission_phase,
            disturbance_level,
        )

        if selected_schedule != self.active_schedule:
            self.previous_schedule = self.active_schedule
            self.active_schedule = selected_schedule
            self.schedule_switch_count += 1
            self._append_log("schedule_switch", self._build_status(
                altitude,
                velocity,
                altitude_region,
                velocity_region,
                mission_phase,
                disturbance_level,
            ))

        self.last_status = self._build_status(
            altitude,
            velocity,
            altitude_region,
            velocity_region,
            mission_phase,
            disturbance_level,
        )
        return self.last_status

    def get_config(self):
        return {
            "enabled": self.enabled,
            "altitude_regions": _copy(self.altitude_regions),
            "velocity_regions": _copy(self.velocity_regions),
            "schedules": _copy(self.schedules),
            "future_ready": self._future_ready(),
        }

    def update_config(self, config):
        if not isinstance(config, dict):
            return self.get_config()

        if "enabled" in config:
            self.enabled = bool(config["enabled"])

        if isinstance(config.get("altitude_regions"), dict):
            self.altitude_regions = _copy(config["altitude_regions"])

        if isinstance(config.get("velocity_regions"), dict):
            self.velocity_regions = _copy(config["velocity_regions"])

        if isinstance(config.get("schedules"), dict):
            for schedule_name, schedule in config["schedules"].items():
                if isinstance(schedule, dict):
                    self.schedules[schedule_name] = _copy(schedule)

        self._append_log("config_update", self.get_config())
        return self.get_config()

    def get_analytics(self):
        logs = _read_logs()
        switch_logs = [
            log for log in logs
            if log.get("event") == "schedule_switch"
        ]
        active_schedule = self.last_status.get("active_schedule") if self.last_status else self.active_schedule
        schedule_switch_count = max(self.schedule_switch_count, len(switch_logs))
        adaptation_score = max(0.0, min(1.0, 1.0 - min(schedule_switch_count, 20) * 0.025))

        return {
            "active_schedule": active_schedule,
            "schedule_switch_count": schedule_switch_count,
            "average_tracking_error_placeholder": 0.0,
            "adaptation_score": adaptation_score,
            "scheduling_health": "ready" if self.enabled and active_schedule in self.schedules else "disabled",
            "future_ready": self._future_ready(),
        }

    def _build_status(
        self,
        altitude,
        velocity,
        altitude_region,
        velocity_region,
        mission_phase,
        disturbance_level,
    ):
        schedule = self.schedules.get(self.active_schedule, {})

        return {
            "enabled": self.enabled,
            "active_schedule": self.active_schedule,
            "previous_schedule": self.previous_schedule,
            "altitude": altitude,
            "velocity": velocity,
            "altitude_region": altitude_region,
            "velocity_region": velocity_region,
            "mission_phase": mission_phase,
            "disturbance_level": disturbance_level,
            "selected_gains": {
                "pid_gains": _copy(schedule.get("pid_gains", {})),
                "lqr_preset": _copy(schedule.get("lqr_preset", {})),
                "mpc_preset": _copy(schedule.get("mpc_preset", {})),
            },
            "schedule_switch_count": self.schedule_switch_count,
            "adaptation_score": self.get_analytics()["adaptation_score"],
            "scheduling_health": "ready" if self.enabled else "disabled",
            "future_ready": self._future_ready(),
        }

    def _select_schedule(self, altitude_region, velocity_region, mission_phase, disturbance_level):
        if not self.enabled:
            return self.active_schedule

        if disturbance_level != "nominal" and "disturbance_rejection" in self.schedules:
            return "disturbance_rejection"

        for schedule_name, schedule in self.schedules.items():
            schedule_altitude = schedule.get("altitude_region")
            schedule_velocity = schedule.get("velocity_region")
            mission_phases = schedule.get("mission_phases", [])
            schedule_disturbance = schedule.get("disturbance_level", "nominal")

            altitude_match = schedule_altitude in (altitude_region, "any")
            velocity_match = schedule_velocity in (velocity_region, "any")
            phase_match = mission_phase in mission_phases or "any" in mission_phases

            if altitude_match and velocity_match and phase_match and schedule_disturbance == "nominal":
                return schedule_name

        if velocity_region == "high_speed" and "aggressive_high_speed" in self.schedules:
            return "aggressive_high_speed"

        if altitude_region == "high" and "high_altitude_cruise" in self.schedules:
            return "high_altitude_cruise"

        if velocity_region == "hover" and "hover_low_speed" in self.schedules:
            return "hover_low_speed"

        return "cruise_nominal"

    def _region_for_value(self, value, regions, fallback):
        for region_name, limits in regions.items():
            if not isinstance(limits, list) or len(limits) != 2:
                continue

            lower = _safe_float(limits[0])
            upper = _safe_float(limits[1])

            if lower <= value < upper:
                return region_name

        return fallback

    def _mission_phase(self, telemetry):
        phase = (
            telemetry.get("mission_phase")
            or telemetry.get("mission_state")
            or telemetry.get("guidance_mode")
            or telemetry.get("flight_mode")
            or "idle"
        )
        return str(phase).lower().replace(" ", "_")

    def _disturbance_level(self, disturbance_analytics):
        if not disturbance_analytics.get("disturbance_active"):
            return "nominal"

        severity = _safe_float(disturbance_analytics.get("severity", 0.0))

        if severity >= 0.65:
            return "severe"

        if severity >= 0.25:
            return "elevated"

        return "low"

    def _append_log(self, event, payload):
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "event": event,
            "active_schedule": self.active_schedule,
            "payload": payload,
        }

        with open(GAIN_SCHEDULING_LOG_FILE, "a") as f:
            f.write(json.dumps(log_entry) + "\n")

    def _future_ready(self):
        return {
            "adaptive_pid": "schedule output exposes per-axis PID gains",
            "lpv_control": "altitude and velocity regions provide LPV scheduling coordinates",
            "robust_mpc": "disturbance-level hook selects robust presets",
            "tube_mpc": "MPC schedule schema supports future tube and constraint tightening presets",
        }


gain_scheduling_manager = GainSchedulingManager()
