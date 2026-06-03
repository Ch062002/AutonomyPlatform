import json
import os
import time
from datetime import datetime, timezone

MPC_LOG_FILE = "/tmp/mpc_log.jsonl"

DEFAULT_CONFIG = {
    "prediction_horizon": 12,
    "control_horizon": 4,
    "dt": 0.05,
    "q_weights": {
        "position": 6.0,
        "velocity": 2.0,
        "altitude": 5.0,
        "attitude": 2.0,
    },
    "r_weights": {
        "longitudinal": 0.8,
        "vertical": 0.8,
        "yaw": 0.5,
    },
    "input_limits": {
        "longitudinal": [-2.0, 2.0],
        "vertical": [-1.5, 1.5],
        "yaw": [-0.8, 0.8],
    },
    "state_limits": {
        "position": [-50.0, 50.0],
        "velocity": [-20.0, 20.0],
        "altitude": [-10.0, 120.0],
        "attitude": [-180.0, 180.0],
    },
}

STATE_KEYS = ["position", "velocity", "altitude", "attitude"]
INPUT_KEYS = ["longitudinal", "vertical", "yaw"]


def _is_number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def _safe_float(value, fallback=0.0):
    if _is_number(value):
        return float(value)

    try:
        return float(value)
    except (TypeError, ValueError):
        return fallback


def _safe_int(value, fallback):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return fallback

    return max(1, parsed)


def _clamp(value, limits):
    lower, upper = limits
    return max(lower, min(upper, value))


def _copy_config(config):
    copied = {}

    for key, value in config.items():
        if isinstance(value, dict):
            copied[key] = {
                nested_key: nested_value.copy()
                if isinstance(nested_value, list)
                else nested_value
                for nested_key, nested_value in value.items()
            }
        else:
            copied[key] = value

    return copied


def append_mpc_log(result):
    log_entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        **result,
    }

    with open(MPC_LOG_FILE, "a") as f:
        f.write(json.dumps(log_entry) + "\n")


def read_mpc_logs(limit=100000):
    if not os.path.exists(MPC_LOG_FILE):
        return []

    logs = []

    with open(MPC_LOG_FILE, "r") as f:
        lines = f.readlines()[-limit:]

    for line in lines:
        try:
            logs.append(json.loads(line))
        except Exception:
            continue

    return logs


class MPCController:
    name = "MPC"

    def __init__(self):
        self.config = _copy_config(DEFAULT_CONFIG)
        self.last_result = None

    def compute(self, control_axis=None, state=None, reference=None):
        start_time = time.perf_counter()
        state_vector = self._build_state_vector(state or {})
        reference_vector = self._build_reference_vector(reference or {}, state or {})
        tracking_error = {
            key: reference_vector[key] - state_vector[key]
            for key in STATE_KEYS
        }
        tracking_error_norm = sum(value * value for value in tracking_error.values()) ** 0.5
        raw_control = self._compute_first_control_move(tracking_error)
        control_output = {
            key: _clamp(raw_control[key], self.config["input_limits"][key])
            for key in INPUT_KEYS
        }
        input_violations = sum(
            1
            for key in INPUT_KEYS
            if raw_control[key] != control_output[key]
        )
        state_violations = self._count_state_constraint_violations(state_vector)
        constraint_violation_count = input_violations + state_violations
        prediction_cost = self._compute_prediction_cost(tracking_error, control_output)
        control_effort = sum(value * value for value in control_output.values()) ** 0.5
        computation_time_ms = (time.perf_counter() - start_time) * 1000.0
        solver_status = "placeholder_optimal"

        result = {
            "controller_name": self.name,
            "status": "active",
            "control_axis": control_axis,
            "prediction_horizon": self.config["prediction_horizon"],
            "control_horizon": self.config["control_horizon"],
            "dt": self.config["dt"],
            "state_vector": state_vector,
            "reference_vector": reference_vector,
            "tracking_error": tracking_error,
            "tracking_error_norm": tracking_error_norm,
            "control_output": control_output,
            "control_effort": control_effort,
            "prediction_cost": prediction_cost,
            "constraint_violation_count": constraint_violation_count,
            "solver_status": solver_status,
            "computation_time_ms": computation_time_ms,
            "health": "ready",
            "future_ready": {
                "robust_mpc": "placeholder",
                "tube_mpc": "placeholder",
                "constrained_optimal_control": "placeholder",
                "trajectory_tracking_mpc": "placeholder",
                "pid_lqr_smc_mpc_comparison": {
                    "tracking_error": "ready",
                    "control_effort": "ready",
                    "robustness": "placeholder",
                    "computation_time": "ready",
                    "constraint_violations": "ready",
                },
            },
        }

        self.last_result = result
        append_mpc_log(result)
        return result

    def get_status(self, state=None, reference=None):
        return self.compute(state=state, reference=reference)

    def get_config(self):
        return {
            "controller_name": self.name,
            **_copy_config(self.config),
            "state_vector_placeholder": STATE_KEYS,
            "reference_vector_placeholder": STATE_KEYS,
            "cost_function": "J = sum((x - x_ref)^T Q (x - x_ref) + u^T R u)",
            "future_ready": {
                "robust_mpc": "placeholder",
                "tube_mpc": "placeholder",
                "constrained_optimal_control": "placeholder",
                "trajectory_tracking_mpc": "placeholder",
            },
        }

    def update_config(self, config):
        if "prediction_horizon" in config:
            self.config["prediction_horizon"] = _safe_int(
                config["prediction_horizon"],
                self.config["prediction_horizon"],
            )

        if "control_horizon" in config:
            self.config["control_horizon"] = min(
                _safe_int(config["control_horizon"], self.config["control_horizon"]),
                self.config["prediction_horizon"],
            )

        if "dt" in config:
            self.config["dt"] = max(
                0.001,
                _safe_float(config["dt"], self.config["dt"]),
            )

        self._update_weight_map("q_weights", config.get("q_weights"))
        self._update_weight_map("r_weights", config.get("r_weights"))
        self._update_limits("input_limits", config.get("input_limits"))
        self._update_limits("state_limits", config.get("state_limits"))
        return self.get_config()

    def get_analytics(self):
        logs = read_mpc_logs()
        tracking_errors = []
        control_efforts = []
        prediction_costs = []
        constraint_violations = 0
        computation_times = []
        solver_status = "no_samples"

        for log in logs:
            tracking_error = log.get("tracking_error_norm")
            control_effort = log.get("control_effort")
            prediction_cost = log.get("prediction_cost")
            computation_time = log.get("computation_time_ms")

            if _is_number(tracking_error):
                tracking_errors.append(abs(tracking_error))

            if _is_number(control_effort):
                control_efforts.append(abs(control_effort))

            if _is_number(prediction_cost):
                prediction_costs.append(abs(prediction_cost))

            if _is_number(log.get("constraint_violation_count")):
                constraint_violations += int(log["constraint_violation_count"])

            if _is_number(computation_time):
                computation_times.append(computation_time)

            solver_status = log.get("solver_status", solver_status)

        return {
            "controller_name": self.name,
            "samples": len(logs),
            "average_tracking_error": (
                sum(tracking_errors) / len(tracking_errors)
                if tracking_errors
                else 0.0
            ),
            "max_tracking_error": max(tracking_errors) if tracking_errors else 0.0,
            "average_control_effort": (
                sum(control_efforts) / len(control_efforts)
                if control_efforts
                else 0.0
            ),
            "prediction_cost": (
                sum(prediction_costs) / len(prediction_costs)
                if prediction_costs
                else 0.0
            ),
            "constraint_violation_count": constraint_violations,
            "solver_status": solver_status,
            "computation_time_ms": (
                sum(computation_times) / len(computation_times)
                if computation_times
                else 0.0
            ),
            "comparison_ready": {
                "pid_vs_lqr_vs_smc_vs_mpc": True,
                "tracking_error": "ready",
                "control_effort": "ready",
                "robustness": "placeholder",
                "computation_time": "ready",
                "constraint_violations": "ready",
            },
        }

    def _build_state_vector(self, values):
        return {
            "position": _safe_float(values.get("position_error", values.get("position", 0.0))),
            "velocity": _safe_float(values.get("velocity", values.get("speed", 0.0))),
            "altitude": _safe_float(values.get("altitude", values.get("global_altitude", 0.0))),
            "attitude": _safe_float(values.get("attitude", values.get("heading", values.get("yaw", 0.0)))),
        }

    def _build_reference_vector(self, reference, state):
        return {
            "position": _safe_float(reference.get("position", reference.get("position_error", 0.0))),
            "velocity": _safe_float(reference.get("velocity", state.get("velocity", 0.0))),
            "altitude": _safe_float(reference.get("altitude", state.get("altitude", 0.0))),
            "attitude": _safe_float(reference.get("attitude", state.get("attitude", state.get("heading", 0.0)))),
        }

    def _compute_first_control_move(self, tracking_error):
        return {
            "longitudinal": 0.15 * tracking_error["position"] + 0.08 * tracking_error["velocity"],
            "vertical": 0.12 * tracking_error["altitude"],
            "yaw": 0.05 * tracking_error["attitude"],
        }

    def _compute_prediction_cost(self, tracking_error, control_output):
        state_cost = sum(
            self.config["q_weights"][key] * tracking_error[key] * tracking_error[key]
            for key in STATE_KEYS
        )
        input_cost = sum(
            self.config["r_weights"][key] * control_output[key] * control_output[key]
            for key in INPUT_KEYS
        )
        return (state_cost + input_cost) * self.config["prediction_horizon"]

    def _count_state_constraint_violations(self, state_vector):
        return sum(
            1
            for key in STATE_KEYS
            if (
                state_vector[key] < self.config["state_limits"][key][0]
                or state_vector[key] > self.config["state_limits"][key][1]
            )
        )

    def _update_weight_map(self, key, values):
        if not isinstance(values, dict):
            return

        for weight_key, value in values.items():
            if weight_key in self.config[key]:
                self.config[key][weight_key] = max(
                    0.0,
                    _safe_float(value, self.config[key][weight_key]),
                )

    def _update_limits(self, key, values):
        if not isinstance(values, dict):
            return

        for limit_key, limits in values.items():
            if limit_key not in self.config[key] or not isinstance(limits, list) or len(limits) != 2:
                continue

            lower = _safe_float(limits[0], self.config[key][limit_key][0])
            upper = _safe_float(limits[1], self.config[key][limit_key][1])

            if lower <= upper:
                self.config[key][limit_key] = [lower, upper]
