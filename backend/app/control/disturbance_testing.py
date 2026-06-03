import json
import os
from datetime import datetime, timezone

from app.control.controller_comparison import build_controller_comparison

DISTURBANCE_TEST_LOG_FILE = "/tmp/disturbance_test_log.jsonl"

DISTURBANCE_SCENARIOS = {
    "wind_disturbance": {
        "name": "wind_disturbance",
        "description": "Lateral wind load placeholder applied to position tracking.",
        "severity": 0.28,
    },
    "sensor_noise": {
        "name": "sensor_noise",
        "description": "Noisy IMU/GPS measurement placeholder.",
        "severity": 0.18,
    },
    "actuator_delay": {
        "name": "actuator_delay",
        "description": "Delayed actuator response placeholder.",
        "severity": 0.24,
    },
    "measurement_bias": {
        "name": "measurement_bias",
        "description": "Persistent measurement bias placeholder.",
        "severity": 0.2,
    },
    "gps_dropout_placeholder": {
        "name": "gps_dropout_placeholder",
        "description": "GPS dropout placeholder for estimator/controller robustness testing.",
        "severity": 0.35,
    },
}


class DisturbanceTestingManager:
    def __init__(self):
        self.active_scenario = None
        self.applied_at = None
        self.controller_under_test = None

    def list_scenarios(self):
        return {
            "scenarios": list(DISTURBANCE_SCENARIOS.values())
        }

    def apply(self, scenario_name, controller_manager):
        if scenario_name not in DISTURBANCE_SCENARIOS:
            return None

        self.active_scenario = DISTURBANCE_SCENARIOS[scenario_name]
        self.applied_at = datetime.now(timezone.utc).isoformat()
        self.controller_under_test = controller_manager.active_controller
        status = self.status(controller_manager)
        self.append_log("apply", status)
        return status

    def clear(self, controller_manager):
        previous_scenario = self.active_scenario
        self.active_scenario = None
        self.applied_at = None
        status = self.status(controller_manager)
        status["cleared_scenario"] = previous_scenario["name"] if previous_scenario else None
        self.append_log("clear", status)
        return status

    def status(self, controller_manager):
        return {
            "disturbance_active": self.active_scenario is not None,
            "scenario_name": self.active_scenario["name"] if self.active_scenario else None,
            "scenario": self.active_scenario,
            "applied_at": self.applied_at,
            "controller_under_test": (
                self.controller_under_test
                or controller_manager.active_controller
            ),
            "available_scenarios": list(DISTURBANCE_SCENARIOS.keys()),
        }

    def analytics(self, controller_manager):
        comparison = build_controller_comparison(controller_manager)
        controller_name = (
            self.controller_under_test
            or controller_manager.active_controller
        )
        controller_metrics = self._controller_metrics(comparison, controller_name)
        base_tracking_error = controller_metrics.get("tracking_error", 0.0)
        base_robustness = controller_metrics.get("robustness_score", 0.0)
        severity = self.active_scenario["severity"] if self.active_scenario else 0.0
        disturbance_active = self.active_scenario is not None
        tracking_error_under_disturbance = base_tracking_error * (1.0 + severity)
        robustness_score = max(0.0, min(1.0, base_robustness * (1.0 - severity)))
        disturbance_rejection_score = max(
            0.0,
            min(1.0, 1.0 / (1.0 + tracking_error_under_disturbance + severity)),
        )
        result = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "disturbance_active": disturbance_active,
            "scenario_name": self.active_scenario["name"] if self.active_scenario else None,
            "controller_under_test": controller_name,
            "robustness_score": robustness_score,
            "tracking_error_under_disturbance": tracking_error_under_disturbance,
            "recovery_time_placeholder": None,
            "disturbance_rejection_score": disturbance_rejection_score,
        }

        self.append_log("analytics", result)
        return result

    def append_log(self, event, payload):
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "event": event,
            "payload": payload,
        }

        with open(DISTURBANCE_TEST_LOG_FILE, "a") as f:
            f.write(json.dumps(log_entry) + "\n")

    def read_logs(self, limit=100):
        if not os.path.exists(DISTURBANCE_TEST_LOG_FILE):
            return []

        logs = []

        with open(DISTURBANCE_TEST_LOG_FILE, "r") as f:
            lines = f.readlines()[-limit:]

        for line in lines:
            try:
                logs.append(json.loads(line))
            except Exception:
                continue

        return logs

    def _controller_metrics(self, comparison, controller_name):
        for metrics in comparison.get("metrics", []):
            if metrics.get("controller") == controller_name:
                return metrics

        return {}


disturbance_testing_manager = DisturbanceTestingManager()
