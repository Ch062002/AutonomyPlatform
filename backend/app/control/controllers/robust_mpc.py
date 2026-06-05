import copy
import json
import os
import time
from datetime import datetime, timezone

ROBUST_MPC_LOG_FILE = "/tmp/robust_mpc_log.jsonl"

STATE_KEYS = ["position", "velocity", "altitude", "attitude"]
INPUT_KEYS = ["longitudinal", "vertical", "yaw"]

DEFAULT_CONFIG = {
    "prediction_horizon": 14,
    "control_horizon": 5,
    "dt": 0.05,
    "uncertainty_models": {
        "wind_uncertainty": {"enabled": True, "bound": 0.18},
        "sensor_uncertainty": {"enabled": True, "bound": 0.06},
        "model_mismatch": {"enabled": True, "bound": 0.10},
        "actuator_uncertainty": {"enabled": True, "bound": 0.08},
    },
    "state_constraints": {
        "position": [-60.0, 60.0],
        "velocity": [-24.0, 24.0],
        "altitude": [-10.0, 140.0],
        "attitude": [-180.0, 180.0],
    },
    "input_constraints": {
        "longitudinal": [-1.8, 1.8],
        "vertical": [-1.2, 1.2],
        "yaw": [-0.65, 0.65],
    },
    "q_weights": {
        "position": 7.0,
        "velocity": 2.5,
        "altitude": 6.0,
        "attitude": 2.5,
    },
    "r_weights": {
        "longitudinal": 1.0,
        "vertical": 1.0,
        "yaw": 0.7,
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


def _safe_int(value, fallback):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return fallback

    return max(1, parsed)


def _copy(value):
    return copy.deepcopy(value)


def _clamp(value, limits):
    lower, upper = limits
    return max(lower, min(upper, value))


def append_robust_mpc_log(result):
    log_entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        **result,
    }

    with open(ROBUST_MPC_LOG_FILE, "a") as f:
        f.write(json.dumps(log_entry) + "\n")


def read_robust_mpc_logs(limit=100000):
    if not os.path.exists(ROBUST_MPC_LOG_FILE):
        return []

    logs = []

    with open(ROBUST_MPC_LOG_FILE, "r") as f:
        lines = f.readlines()[-limit:]

    for line in lines:
        try:
            logs.append(json.loads(line))
        except Exception:
            continue

    return logs


class RobustMPCController:
    name = "Robust MPC"

    def __init__(self):
        self.enabled = True
        self.config = _copy(DEFAULT_CONFIG)
        self.last_result = None

    def compute(self, state=None, reference=None):
        start_time = time.perf_counter()
        state = state or {}
        reference = reference or {}
        nominal_state = self._build_state_vector(state)
        reference_state = self._build_reference_vector(reference, state)
        uncertainty_bounds = self._uncertainty_bounds()
        disturbed_state = {
            key: nominal_state[key] + uncertainty_bounds[key]
            for key in STATE_KEYS
        }
        tracking_error = {
            key: reference_state[key] - disturbed_state[key]
            for key in STATE_KEYS
        }
        tracking_error_norm = sum(value * value for value in tracking_error.values()) ** 0.5
        raw_control = self._compute_control(tracking_error, uncertainty_bounds)
        control_output = {
            key: _clamp(raw_control[key], self.config["input_constraints"][key])
            for key in INPUT_KEYS
        }
        state_violations = self._count_state_constraint_violations(disturbed_state)
        input_violations = sum(
            1 for key in INPUT_KEYS if raw_control[key] != control_output[key]
        )
        constraint_violation_count = state_violations + input_violations
        control_effort = sum(value * value for value in control_output.values()) ** 0.5
        uncertainty_level = self._uncertainty_level()
        robust_cost = self._robust_cost(tracking_error, control_output, uncertainty_level)
        robust_feasible = constraint_violation_count == 0 and self.enabled
        computation_time_ms = (time.perf_counter() - start_time) * 1000.0
        robustness_score = self._robustness_score(
            uncertainty_level,
            constraint_violation_count,
            tracking_error_norm,
        )

        result = {
            "controller_name": self.name,
            "status": "active" if self.enabled else "disabled",
            "enabled": self.enabled,
            "nominal_state": nominal_state,
            "disturbed_state": disturbed_state,
            "reference_state": reference_state,
            "uncertainty_bounds": uncertainty_bounds,
            "uncertainty_models": _copy(self.config["uncertainty_models"]),
            "uncertainty_level": uncertainty_level,
            "state_constraints": _copy(self.config["state_constraints"]),
            "input_constraints": _copy(self.config["input_constraints"]),
            "tracking_error": tracking_error,
            "tracking_error_norm": tracking_error_norm,
            "control_output": control_output,
            "control_effort": control_effort,
            "robust_cost": robust_cost,
            "constraint_violation_count": constraint_violation_count,
            "robust_feasibility_status": "feasible" if robust_feasible else "infeasible",
            "feasible": robust_feasible,
            "robustness_score": robustness_score,
            "computation_time_ms": computation_time_ms,
            "health": "ready" if robust_feasible else "constraint-watch",
            "future_ready": self._future_ready(),
        }

        self.last_result = result
        append_robust_mpc_log(result)
        return result

    def get_status(self, state=None, reference=None):
        return self.compute(state=state, reference=reference)

    def get_config(self):
        return {
            "controller_name": self.name,
            "enabled": self.enabled,
            **_copy(self.config),
            "robust_cost_function": (
                "J_robust = nominal MPC cost + uncertainty penalty + constraint penalty"
            ),
            "future_ready": self._future_ready(),
        }

    def update_config(self, config):
        if not isinstance(config, dict):
            return self.get_config()

        if "enabled" in config:
            self.enabled = bool(config["enabled"])

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
            self.config["dt"] = max(0.001, _safe_float(config["dt"], self.config["dt"]))

        self._update_uncertainty_models(config.get("uncertainty_models"))
        self._update_limits("state_constraints", config.get("state_constraints"))
        self._update_limits("input_constraints", config.get("input_constraints"))
        self._update_weight_map("q_weights", config.get("q_weights"))
        self._update_weight_map("r_weights", config.get("r_weights"))
        return self.get_config()

    def get_analytics(self):
        logs = read_robust_mpc_logs()
        robustness_scores = []
        uncertainty_levels = []
        tracking_errors = []
        control_efforts = []
        computation_times = []
        constraint_violation_count = 0
        feasible_count = 0

        for log in logs:
            if _is_number(log.get("robustness_score")):
                robustness_scores.append(log["robustness_score"])
            if _is_number(log.get("uncertainty_level")):
                uncertainty_levels.append(log["uncertainty_level"])
            if _is_number(log.get("tracking_error_norm")):
                tracking_errors.append(abs(log["tracking_error_norm"]))
            if _is_number(log.get("control_effort")):
                control_efforts.append(abs(log["control_effort"]))
            if _is_number(log.get("computation_time_ms")):
                computation_times.append(log["computation_time_ms"])
            if _is_number(log.get("constraint_violation_count")):
                constraint_violation_count += int(log["constraint_violation_count"])
            if log.get("robust_feasibility_status") == "feasible":
                feasible_count += 1

        return {
            "controller_name": self.name,
            "samples": len(logs),
            "robustness_score": self._average(robustness_scores),
            "constraint_violation_count": constraint_violation_count,
            "uncertainty_level": self._average(uncertainty_levels),
            "average_tracking_error": self._average(tracking_errors),
            "average_control_effort": self._average(control_efforts),
            "feasibility_rate": feasible_count / len(logs) if logs else 0.0,
            "computation_time": self._average(computation_times),
            "computation_time_ms": self._average(computation_times),
            "future_ready": self._future_ready(),
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

    def _uncertainty_bounds(self):
        level = self._uncertainty_level()
        return {
            "position": 2.0 * level,
            "velocity": 0.8 * level,
            "altitude": 1.5 * level,
            "attitude": 4.0 * level,
        }

    def _uncertainty_level(self):
        enabled_bounds = [
            _safe_float(model.get("bound"), 0.0)
            for model in self.config["uncertainty_models"].values()
            if model.get("enabled", True)
        ]

        return sum(enabled_bounds) / len(enabled_bounds) if enabled_bounds else 0.0

    def _compute_control(self, tracking_error, uncertainty_bounds):
        uncertainty_padding = 1.0 + self._uncertainty_level()
        return {
            "longitudinal": uncertainty_padding * (
                0.14 * tracking_error["position"] + 0.08 * tracking_error["velocity"]
            ),
            "vertical": uncertainty_padding * 0.11 * tracking_error["altitude"],
            "yaw": uncertainty_padding * 0.045 * tracking_error["attitude"],
        }

    def _robust_cost(self, tracking_error, control_output, uncertainty_level):
        state_cost = sum(
            self.config["q_weights"][key] * tracking_error[key] * tracking_error[key]
            for key in STATE_KEYS
        )
        input_cost = sum(
            self.config["r_weights"][key] * control_output[key] * control_output[key]
            for key in INPUT_KEYS
        )
        uncertainty_penalty = 100.0 * uncertainty_level * uncertainty_level
        return (
            state_cost
            + input_cost
            + uncertainty_penalty
        ) * self.config["prediction_horizon"]

    def _count_state_constraint_violations(self, state_vector):
        return sum(
            1
            for key in STATE_KEYS
            if (
                state_vector[key] < self.config["state_constraints"][key][0]
                or state_vector[key] > self.config["state_constraints"][key][1]
            )
        )

    def _robustness_score(self, uncertainty_level, constraint_violations, tracking_error):
        uncertainty_score = 1.0 / (1.0 + uncertainty_level)
        constraint_score = 1.0 / (1.0 + constraint_violations)
        tracking_score = 1.0 / (1.0 + tracking_error)
        return (uncertainty_score + constraint_score + tracking_score) / 3.0

    def _update_uncertainty_models(self, values):
        if not isinstance(values, dict):
            return

        for model_name, model in values.items():
            if model_name not in self.config["uncertainty_models"] or not isinstance(model, dict):
                continue

            if "enabled" in model:
                self.config["uncertainty_models"][model_name]["enabled"] = bool(model["enabled"])
            if "bound" in model:
                self.config["uncertainty_models"][model_name]["bound"] = max(
                    0.0,
                    _safe_float(
                        model["bound"],
                        self.config["uncertainty_models"][model_name]["bound"],
                    ),
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

    def _average(self, values):
        return sum(values) / len(values) if values else 0.0

    def _future_ready(self):
        return {
            "tube_mpc": "extension_slot",
            "constrained_trajectory_tracking": "extension_slot",
            "robust_guidance_control_integration": "extension_slot",
        }


robust_mpc_controller = RobustMPCController()
