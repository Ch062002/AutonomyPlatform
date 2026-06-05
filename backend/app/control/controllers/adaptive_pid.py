import copy
import json
import os
import time
from datetime import datetime, timezone

from app.control.controllers.pid import CONTROL_AXES, DEFAULT_GAINS

ADAPTIVE_PID_LOG_FILE = "/tmp/adaptive_pid_log.jsonl"

DEFAULT_ADAPTATION = {
    "alpha": 0.08,
    "beta": 0.01,
    "gamma": 0.02,
}

DEFAULT_GAIN_LIMITS = {
    "kp": [0.0, 4.0],
    "ki": [0.0, 1.0],
    "kd": [0.0, 1.5],
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


def _clamp(value, lower, upper):
    return max(lower, min(upper, value))


def _clamp_dt(dt):
    if not _is_number(dt) or dt <= 0:
        return 0.02

    return min(float(dt), 1.0)


def _copy(value):
    return copy.deepcopy(value)


def append_adaptive_pid_log(result):
    log_entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        **result,
    }

    with open(ADAPTIVE_PID_LOG_FILE, "a") as f:
        f.write(json.dumps(log_entry) + "\n")


def read_adaptive_pid_logs(limit=100000):
    if not os.path.exists(ADAPTIVE_PID_LOG_FILE):
        return []

    logs = []

    with open(ADAPTIVE_PID_LOG_FILE, "r") as f:
        lines = f.readlines()[-limit:]

    for line in lines:
        try:
            logs.append(json.loads(line))
        except Exception:
            continue

    return logs


class AdaptivePIDController:
    name = "Adaptive PID"

    def __init__(self):
        self.enabled = True
        self.base_gains = _copy(DEFAULT_GAINS)
        self.adaptive_gains = _copy(DEFAULT_GAINS)
        self.adaptation_rate = _copy(DEFAULT_ADAPTATION)
        self.gain_limits = _copy(DEFAULT_GAIN_LIMITS)
        self.integral_error = {axis: 0.0 for axis in CONTROL_AXES}
        self.previous_error = {axis: 0.0 for axis in CONTROL_AXES}
        self.last_update_time = None
        self.last_result = None

    def compute(self, control_axis=None, state=None, reference=None):
        now = time.monotonic()
        dt = _clamp_dt(now - self.last_update_time) if self.last_update_time else 0.02
        self.last_update_time = now

        axes = [control_axis] if control_axis in CONTROL_AXES else CONTROL_AXES
        state = state or {}
        reference = reference or {}
        errors = {}
        outputs = {}
        activity = 0.0

        for axis in axes:
            current_value = self._axis_value(axis, state)
            reference_value = self._axis_value(axis, reference)
            error = reference_value - current_value

            self.integral_error[axis] += error * dt
            derivative_error = (error - self.previous_error[axis]) / dt
            self.previous_error[axis] = error

            base = self.base_gains[axis]
            gains = self._adaptive_gain_update(
                base,
                error,
                self.integral_error[axis],
                derivative_error,
            )

            if not self.enabled:
                gains = base.copy()

            self.adaptive_gains[axis] = gains
            output = (
                gains["kp"] * error
                + gains["ki"] * self.integral_error[axis]
                + gains["kd"] * derivative_error
            )
            activity += self._gain_activity(base, gains)
            errors[axis] = error
            outputs[axis] = {
                "error": error,
                "integral_error": self.integral_error[axis],
                "derivative_error": derivative_error,
                "control_output": output,
                "base_gains": base.copy(),
                "adaptive_gains": gains.copy(),
            }

        result = {
            "controller_name": self.name,
            "status": "active" if self.enabled else "monitoring",
            "control_axis": control_axis,
            "dt": dt,
            "error": errors,
            "control_output": outputs,
            "base_gains": _copy(self.base_gains),
            "adaptive_gains": _copy(self.adaptive_gains),
            "adaptation_rate": _copy(self.adaptation_rate),
            "gain_limits": _copy(self.gain_limits),
            "adaptation_enabled": self.enabled,
            "adaptation_activity": activity / len(axes) if axes else 0.0,
            "adaptation_health": self._adaptation_health(errors),
            "health": "ready",
            "future_ready": self._future_ready(),
        }

        self.last_result = result
        append_adaptive_pid_log(result)
        return result

    def get_status(self, state=None, reference=None):
        return self.compute(state=state, reference=reference)

    def get_config(self):
        return {
            "controller_name": self.name,
            "enabled": self.enabled,
            "base_gains": _copy(self.base_gains),
            "adaptive_gains": _copy(self.adaptive_gains),
            "adaptation_rate": _copy(self.adaptation_rate),
            "gain_limits": _copy(self.gain_limits),
            "supported_axes": CONTROL_AXES,
            "future_ready": self._future_ready(),
        }

    def update_config(self, config):
        if not isinstance(config, dict):
            return self.get_config()

        if "enabled" in config:
            self.enabled = bool(config["enabled"])

        if "adaptation_enabled" in config:
            self.enabled = bool(config["adaptation_enabled"])

        if isinstance(config.get("base_gains"), dict):
            self._update_axis_gains(self.base_gains, config["base_gains"])

        if isinstance(config.get("adaptation_rate"), dict):
            for key in ("alpha", "beta", "gamma"):
                if key in config["adaptation_rate"]:
                    self.adaptation_rate[key] = max(
                        0.0,
                        _safe_float(config["adaptation_rate"][key], self.adaptation_rate[key]),
                    )

        if isinstance(config.get("gain_limits"), dict):
            for gain_name in ("kp", "ki", "kd"):
                values = config["gain_limits"].get(gain_name)

                if isinstance(values, list) and len(values) == 2:
                    lower = _safe_float(values[0], self.gain_limits[gain_name][0])
                    upper = _safe_float(values[1], self.gain_limits[gain_name][1])
                    self.gain_limits[gain_name] = [min(lower, upper), max(lower, upper)]

        return self.get_config()

    def get_analytics(self):
        logs = read_adaptive_pid_logs()
        errors = []
        kp_values = []
        ki_values = []
        kd_values = []
        control_outputs = []
        activity_values = []
        health_counts = {}

        for log in logs:
            for axis_error in (log.get("error") or {}).values():
                if _is_number(axis_error):
                    errors.append(abs(axis_error))

            for output in (log.get("control_output") or {}).values():
                adaptive = output.get("adaptive_gains") or {}
                control_value = output.get("control_output")

                if _is_number(adaptive.get("kp")):
                    kp_values.append(adaptive["kp"])
                if _is_number(adaptive.get("ki")):
                    ki_values.append(adaptive["ki"])
                if _is_number(adaptive.get("kd")):
                    kd_values.append(adaptive["kd"])
                if _is_number(control_value):
                    control_outputs.append(abs(control_value))

            activity = log.get("adaptation_activity")
            if _is_number(activity):
                activity_values.append(activity)

            health = log.get("adaptation_health", "unknown")
            health_counts[health] = health_counts.get(health, 0) + 1

        return {
            "controller_name": self.name,
            "samples": len(logs),
            "average_error": self._average(errors),
            "max_error": max(errors) if errors else 0.0,
            "average_adaptive_kp": self._average(kp_values),
            "average_adaptive_ki": self._average(ki_values),
            "average_adaptive_kd": self._average(kd_values),
            "adaptation_activity": self._average(activity_values),
            "adaptation_health": self._dominant_health(health_counts),
            "control_effort": sum(control_outputs),
            "future_ready": self._future_ready(),
        }

    def _adaptive_gain_update(self, base, error, integral_error, derivative_error):
        alpha = self.adaptation_rate["alpha"]
        beta = self.adaptation_rate["beta"]
        gamma = self.adaptation_rate["gamma"]

        return {
            "kp": self._bounded_gain("kp", base["kp"] + alpha * abs(error)),
            "ki": self._bounded_gain("ki", base["ki"] + beta * integral_error),
            "kd": self._bounded_gain("kd", base["kd"] + gamma * abs(derivative_error)),
        }

    def _bounded_gain(self, gain_name, value):
        lower, upper = self.gain_limits[gain_name]
        return _clamp(value, lower, upper)

    def _gain_activity(self, base, gains):
        return (
            abs(gains["kp"] - base["kp"])
            + abs(gains["ki"] - base["ki"])
            + abs(gains["kd"] - base["kd"])
        )

    def _update_axis_gains(self, target, updates):
        for axis, axis_gains in updates.items():
            if axis not in target or not isinstance(axis_gains, dict):
                continue

            for key in ("kp", "ki", "kd"):
                if key in axis_gains:
                    target[axis][key] = self._bounded_gain(
                        key,
                        _safe_float(axis_gains[key], target[axis][key]),
                    )

    def _adaptation_health(self, errors):
        if not self.enabled:
            return "disabled"

        max_error = max([abs(value) for value in errors.values()] or [0.0])

        if max_error > 20.0:
            return "high-error"

        return "adapting" if max_error > 0.05 else "stable"

    def _dominant_health(self, health_counts):
        if not health_counts:
            return self.last_result.get("adaptation_health", "unknown") if self.last_result else "unknown"

        return max(health_counts.items(), key=lambda item: item[1])[0]

    def _average(self, values):
        return sum(values) / len(values) if values else 0.0

    def _future_ready(self):
        return {
            "self_tuning_pid": "extension_slot",
            "model_reference_adaptive_control": "extension_slot",
            "learning_based_gain_tuning": "extension_slot",
            "pso_optimized_pid": "extension_slot",
            "jaya_optimized_pid": "extension_slot",
        }

    def _axis_value(self, axis, values):
        if axis == "attitude":
            return _safe_float(
                values.get("attitude", values.get("heading", values.get("yaw", 0.0)))
            )

        if axis == "altitude":
            return _safe_float(
                values.get("altitude", values.get("global_altitude", 0.0))
            )

        if axis == "velocity":
            return _safe_float(values.get("velocity", values.get("speed", 0.0)))

        if axis == "position":
            return _safe_float(values.get("position_error", values.get("position", 0.0)))

        return 0.0


adaptive_pid_controller = AdaptivePIDController()
