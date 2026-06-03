import json
import os
import time
from datetime import datetime, timezone

SMC_LOG_FILE = "/tmp/smc_log.jsonl"

CONTROL_AXES = [
    "attitude",
    "altitude",
    "velocity",
    "position",
]

DEFAULT_PARAMETERS = {
    "attitude": {"lambda": 1.2, "k": 0.8, "phi": 0.25, "mode": "saturation"},
    "altitude": {"lambda": 1.4, "k": 1.1, "phi": 0.3, "mode": "saturation"},
    "velocity": {"lambda": 1.0, "k": 0.9, "phi": 0.25, "mode": "saturation"},
    "position": {"lambda": 0.9, "k": 0.7, "phi": 0.35, "mode": "saturation"},
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


def _sign(value):
    if value > 0:
        return 1.0

    if value < 0:
        return -1.0

    return 0.0


def _saturate(value):
    return max(-1.0, min(1.0, value))


def append_smc_log(result):
    log_entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        **result,
    }

    with open(SMC_LOG_FILE, "a") as f:
        f.write(json.dumps(log_entry) + "\n")


def read_smc_logs(limit=100000):
    if not os.path.exists(SMC_LOG_FILE):
        return []

    logs = []

    with open(SMC_LOG_FILE, "r") as f:
        lines = f.readlines()[-limit:]

    for line in lines:
        try:
            logs.append(json.loads(line))
        except Exception:
            continue

    return logs


class SMCController:
    name = "SMC"

    def __init__(self):
        self.parameters = {
            axis: values.copy()
            for axis, values in DEFAULT_PARAMETERS.items()
        }
        self.previous_error = {axis: 0.0 for axis in CONTROL_AXES}
        self.previous_control_output = {axis: 0.0 for axis in CONTROL_AXES}
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
        sliding_surface = {}
        errors = {}

        for axis in axes:
            current_value = self._axis_value(axis, state)
            reference_value = self._axis_value(axis, reference)
            error = reference_value - current_value
            error_dot = (error - self.previous_error[axis]) / dt
            self.previous_error[axis] = error

            params = self.parameters[axis]
            surface = params["lambda"] * error + error_dot

            if params["mode"] == "sign":
                switching_value = _sign(surface)
            else:
                switching_value = _saturate(surface / max(params["phi"], 1e-6))

            control_output = -params["k"] * switching_value
            chattering_delta = abs(control_output - self.previous_control_output[axis])
            self.previous_control_output[axis] = control_output

            errors[axis] = error
            sliding_surface[axis] = surface
            outputs[axis] = {
                "error": error,
                "error_dot": error_dot,
                "sliding_surface": surface,
                "switching_value": switching_value,
                "control_output": control_output,
                "chattering_delta": chattering_delta,
                "parameters": params.copy(),
            }

        result = {
            "controller_name": self.name,
            "status": "active",
            "control_axis": control_axis,
            "dt": dt,
            "error": errors,
            "sliding_surface": sliding_surface,
            "control_output": outputs,
            "health": "ready",
            "future_ready": {
                "adaptive_smc": "placeholder",
                "higher_order_smc": "placeholder",
                "chattering_reduction": "saturation boundary layer",
                "pid_lqr_smc_comparison": {
                    "tracking_error": "ready",
                    "control_effort": "ready",
                    "robustness": "ready",
                    "chattering": "ready",
                },
            },
        }

        self.last_result = result
        append_smc_log(result)
        return result

    def get_status(self, state=None, reference=None):
        return self.compute(state=state, reference=reference)

    def get_config(self):
        return {
            "controller_name": self.name,
            "parameters": {
                axis: values.copy()
                for axis, values in self.parameters.items()
            },
            "supported_axes": CONTROL_AXES,
            "sliding_surface": "s = lambda * error + error_dot",
            "control_law": "u = -k * sign(s)",
            "saturation_law": "u = -k * sat(s / phi)",
            "future_ready": {
                "adaptive_smc": "placeholder",
                "higher_order_smc": "placeholder",
                "chattering_reduction": "placeholder",
            },
        }

    def update_config(self, parameters):
        for axis, axis_params in parameters.items():
            if axis not in self.parameters or not isinstance(axis_params, dict):
                continue

            for key in ("lambda", "k", "phi"):
                if key in axis_params:
                    fallback = self.parameters[axis][key]
                    value = _safe_float(axis_params[key], fallback)
                    self.parameters[axis][key] = max(1e-6, value)

            if axis_params.get("mode") in ("sign", "saturation"):
                self.parameters[axis]["mode"] = axis_params["mode"]

        return self.get_config()

    def get_analytics(self):
        logs = read_smc_logs()
        surfaces = []
        control_outputs = []
        chattering_deltas = []

        for log in logs:
            for surface in (log.get("sliding_surface") or {}).values():
                if _is_number(surface):
                    surfaces.append(abs(surface))

            for output in (log.get("control_output") or {}).values():
                control_value = output.get("control_output")
                chattering_delta = output.get("chattering_delta")

                if _is_number(control_value):
                    control_outputs.append(abs(control_value))

                if _is_number(chattering_delta):
                    chattering_deltas.append(abs(chattering_delta))

        average_surface = sum(surfaces) / len(surfaces) if surfaces else 0.0
        max_surface = max(surfaces) if surfaces else 0.0
        chattering_index = (
            sum(chattering_deltas) / len(chattering_deltas)
            if chattering_deltas
            else 0.0
        )
        control_effort = sum(control_outputs)
        robustness_score = 1.0 / (1.0 + average_surface + chattering_index)

        return {
            "controller_name": self.name,
            "samples": len(logs),
            "average_sliding_surface": average_surface,
            "max_sliding_surface": max_surface,
            "chattering_index": chattering_index,
            "control_effort": control_effort,
            "robustness_score": robustness_score,
            "comparison_ready": {
                "pid_vs_lqr_vs_smc": True,
                "tracking_error": average_surface,
                "control_effort": control_effort,
                "robustness": robustness_score,
                "chattering": chattering_index,
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
