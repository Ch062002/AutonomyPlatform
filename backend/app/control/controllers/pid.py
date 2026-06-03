import json
import os
import time
from datetime import datetime, timezone

PID_LOG_FILE = "/tmp/pid_log.jsonl"

CONTROL_AXES = [
    "attitude",
    "altitude",
    "velocity",
    "position",
]

DEFAULT_GAINS = {
    "attitude": {"kp": 0.8, "ki": 0.02, "kd": 0.12},
    "altitude": {"kp": 1.1, "ki": 0.04, "kd": 0.18},
    "velocity": {"kp": 0.9, "ki": 0.03, "kd": 0.1},
    "position": {"kp": 0.7, "ki": 0.01, "kd": 0.08},
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


def _clamp_dt(dt):
    if not _is_number(dt) or dt <= 0:
        return 0.02

    return min(float(dt), 1.0)


def append_pid_log(result):
    log_entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        **result,
    }

    with open(PID_LOG_FILE, "a") as f:
        f.write(json.dumps(log_entry) + "\n")


def read_pid_logs(limit=100000):
    if not os.path.exists(PID_LOG_FILE):
        return []

    logs = []

    with open(PID_LOG_FILE, "r") as f:
        lines = f.readlines()[-limit:]

    for line in lines:
        try:
            logs.append(json.loads(line))
        except Exception:
            continue

    return logs


class PIDController:
    name = "PID"

    def __init__(self):
        self.gains = {
            axis: values.copy()
            for axis, values in DEFAULT_GAINS.items()
        }
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
        outputs = {}
        errors = {}

        for axis in axes:
            current_value = self._axis_value(axis, state)
            reference_value = self._axis_value(axis, reference)
            error = reference_value - current_value
            gains = self.gains[axis]

            self.integral_error[axis] += error * dt
            derivative_error = (error - self.previous_error[axis]) / dt
            self.previous_error[axis] = error

            output = (
                gains["kp"] * error
                + gains["ki"] * self.integral_error[axis]
                + gains["kd"] * derivative_error
            )

            errors[axis] = error
            outputs[axis] = {
                "error": error,
                "integral_error": self.integral_error[axis],
                "derivative_error": derivative_error,
                "control_output": output,
                "gains": gains.copy(),
            }

        result = {
            "controller_name": self.name,
            "status": "active",
            "control_axis": control_axis,
            "dt": dt,
            "error": errors,
            "control_output": outputs,
            "health": "ready",
            "future_ready": {
                "gain_scheduling": "placeholder",
                "adaptive_pid": "placeholder",
                "attitude_control": "implemented",
                "altitude_control": "implemented",
                "velocity_control": "implemented",
                "position_control": "implemented",
            },
        }

        self.last_result = result
        append_pid_log(result)
        return result

    def get_status(self, state=None, reference=None):
        return self.compute(state=state, reference=reference)

    def get_config(self):
        return {
            "controller_name": self.name,
            "gains": {
                axis: values.copy()
                for axis, values in self.gains.items()
            },
            "supported_axes": CONTROL_AXES,
            "future_ready": {
                "gain_scheduling": "placeholder",
                "adaptive_pid": "placeholder",
            },
        }

    def update_config(self, gains):
        for axis, axis_gains in gains.items():
            if axis not in self.gains or not isinstance(axis_gains, dict):
                continue

            for key in ("kp", "ki", "kd"):
                if key in axis_gains:
                    self.gains[axis][key] = _safe_float(
                        axis_gains[key],
                        self.gains[axis][key],
                    )

        return self.get_config()

    def get_analytics(self):
        logs = read_pid_logs()
        errors = []
        control_outputs = []

        for log in logs:
            for axis_error in (log.get("error") or {}).values():
                if _is_number(axis_error):
                    errors.append(abs(axis_error))

            for output in (log.get("control_output") or {}).values():
                control_value = output.get("control_output")

                if _is_number(control_value):
                    control_outputs.append(abs(control_value))

        average_error = sum(errors) / len(errors) if errors else 0.0
        max_error = max(errors) if errors else 0.0
        control_effort = sum(control_outputs)

        return {
            "controller_name": self.name,
            "samples": len(logs),
            "average_error": average_error,
            "max_error": max_error,
            "control_effort": control_effort,
            "settling_time_placeholder": None,
            "overshoot_placeholder": None,
            "future_ready": {
                "gain_scheduling": "placeholder",
                "adaptive_pid": "placeholder",
            },
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
