import copy
import json
import os
import time
from datetime import datetime, timezone

TUBE_MPC_LOG_FILE = "/tmp/tube_mpc_log.jsonl"

STATE_KEYS = ["position", "velocity", "altitude", "attitude"]
INPUT_KEYS = ["longitudinal", "vertical", "yaw"]

DEFAULT_CONFIG = {
    "prediction_horizon": 14,
    "control_horizon": 5,
    "dt": 0.05,
    "tube_radius": 1.25,
    "disturbance_bound": 0.22,
    "constraint_tightening_level": 0.12,
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


def append_tube_mpc_log(result):
    log_entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        **result,
    }

    with open(TUBE_MPC_LOG_FILE, "a") as f:
        f.write(json.dumps(log_entry) + "\n")


def read_tube_mpc_logs(limit=100000):
    if not os.path.exists(TUBE_MPC_LOG_FILE):
        return []

    logs = []

    with open(TUBE_MPC_LOG_FILE, "r") as f:
        lines = f.readlines()[-limit:]

    for line in lines:
        try:
            logs.append(json.loads(line))
        except Exception:
            continue

    return logs


class TubeMPCController:
    name = "Tube MPC"

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
        nominal_trajectory = self._build_nominal_trajectory(nominal_state, reference_state)
        actual_state = {
            key: nominal_state[key] + self.config["disturbance_bound"] * self._state_disturbance_scale(key)
            for key in STATE_KEYS
        }
        actual_trajectory = self._build_actual_trajectory(nominal_trajectory)
        error_tube = self._build_error_tube(nominal_trajectory, actual_trajectory)
        tube_error_norm = self._tube_error_norm(error_tube)
        tightened_constraints = self._tightened_constraints()
        tracking_error = {
            key: reference_state[key] - actual_state[key]
            for key in STATE_KEYS
        }
        tracking_error_norm = sum(value * value for value in tracking_error.values()) ** 0.5
        raw_control = self._compute_control(tracking_error, tube_error_norm)
        control_output = {
            key: _clamp(raw_control[key], tightened_constraints["input_constraints"][key])
            for key in INPUT_KEYS
        }
        control_effort = sum(value * value for value in control_output.values()) ** 0.5
        tube_violation_count = self._count_tube_violations(error_tube)
        constraint_violation_count = self._count_constraint_violations(
            actual_state,
            raw_control,
            tightened_constraints,
        )
        feasible = self.enabled and tube_violation_count == 0 and constraint_violation_count == 0
        computation_time_ms = (time.perf_counter() - start_time) * 1000.0
        robustness_score = self._robustness_score(
            tube_error_norm,
            tube_violation_count,
            constraint_violation_count,
        )

        result = {
            "controller_name": self.name,
            "status": "active" if self.enabled else "disabled",
            "enabled": self.enabled,
            "nominal_trajectory": nominal_trajectory,
            "actual_trajectory": actual_trajectory,
            "error_tube": error_tube,
            "tube_radius": self.config["tube_radius"],
            "disturbance_bound": self.config["disturbance_bound"],
            "constraint_tightening_level": self.config["constraint_tightening_level"],
            "tightened_constraints": tightened_constraints,
            "invariant_set_placeholder": {
                "status": "placeholder",
                "description": "terminal robust positively invariant set extension slot",
            },
            "tracking_error": tracking_error,
            "tracking_error_norm": tracking_error_norm,
            "tube_error_norm": tube_error_norm,
            "control_output": control_output,
            "control_effort": control_effort,
            "tube_violation_count": tube_violation_count,
            "constraint_violation_count": constraint_violation_count,
            "tube_feasibility_status": "feasible" if feasible else "infeasible",
            "feasible": feasible,
            "robustness_score": robustness_score,
            "computation_time_ms": computation_time_ms,
            "health": "ready" if feasible else "tube-watch",
            "future_ready": self._future_ready(),
        }

        self.last_result = result
        append_tube_mpc_log(result)
        return result

    def get_status(self, state=None, reference=None):
        return self.compute(state=state, reference=reference)

    def get_config(self):
        return {
            "controller_name": self.name,
            "enabled": self.enabled,
            **_copy(self.config),
            "invariant_set_placeholder": "terminal robust positively invariant set",
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

        for key in ("dt", "tube_radius", "disturbance_bound", "constraint_tightening_level"):
            if key in config:
                self.config[key] = max(0.0, _safe_float(config[key], self.config[key]))

        self._update_limits("state_constraints", config.get("state_constraints"))
        self._update_limits("input_constraints", config.get("input_constraints"))
        return self.get_config()

    def get_analytics(self):
        logs = read_tube_mpc_logs()
        tube_radii = []
        disturbance_bounds = []
        tightening_levels = []
        tracking_errors = []
        control_efforts = []
        robustness_scores = []
        computation_times = []
        tube_violation_count = 0
        feasible_count = 0

        for log in logs:
            if _is_number(log.get("tube_radius")):
                tube_radii.append(log["tube_radius"])
            if _is_number(log.get("disturbance_bound")):
                disturbance_bounds.append(log["disturbance_bound"])
            if _is_number(log.get("constraint_tightening_level")):
                tightening_levels.append(log["constraint_tightening_level"])
            if _is_number(log.get("tracking_error_norm")):
                tracking_errors.append(abs(log["tracking_error_norm"]))
            if _is_number(log.get("control_effort")):
                control_efforts.append(abs(log["control_effort"]))
            if _is_number(log.get("robustness_score")):
                robustness_scores.append(log["robustness_score"])
            if _is_number(log.get("computation_time_ms")):
                computation_times.append(log["computation_time_ms"])
            if _is_number(log.get("tube_violation_count")):
                tube_violation_count += int(log["tube_violation_count"])
            if log.get("tube_feasibility_status") == "feasible":
                feasible_count += 1

        return {
            "controller_name": self.name,
            "samples": len(logs),
            "tube_radius": self._average(tube_radii),
            "disturbance_bound": self._average(disturbance_bounds),
            "constraint_tightening_level": self._average(tightening_levels),
            "tube_violation_count": tube_violation_count,
            "feasibility_rate": feasible_count / len(logs) if logs else 0.0,
            "average_tracking_error": self._average(tracking_errors),
            "average_control_effort": self._average(control_efforts),
            "robustness_score": self._average(robustness_scores),
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

    def _build_nominal_trajectory(self, nominal_state, reference_state):
        horizon = self.config["prediction_horizon"]
        trajectory = []

        for step in range(horizon):
            blend = (step + 1) / horizon
            trajectory.append({
                key: nominal_state[key] + blend * (reference_state[key] - nominal_state[key])
                for key in STATE_KEYS
            })

        return trajectory

    def _build_actual_trajectory(self, nominal_trajectory):
        return [
            {
                key: point[key] + self.config["disturbance_bound"] * self._state_disturbance_scale(key)
                for key in STATE_KEYS
            }
            for point in nominal_trajectory
        ]

    def _build_error_tube(self, nominal_trajectory, actual_trajectory):
        return [
            {
                key: actual_point[key] - nominal_point[key]
                for key in STATE_KEYS
            }
            for nominal_point, actual_point in zip(nominal_trajectory, actual_trajectory)
        ]

    def _tube_error_norm(self, error_tube):
        if not error_tube:
            return 0.0

        max_norm = 0.0

        for point in error_tube:
            point_norm = sum(value * value for value in point.values()) ** 0.5
            max_norm = max(max_norm, point_norm)

        return max_norm

    def _compute_control(self, tracking_error, tube_error_norm):
        tube_feedback = 1.0 + min(1.0, tube_error_norm / max(self.config["tube_radius"], 0.001))
        return {
            "longitudinal": tube_feedback * (
                0.13 * tracking_error["position"] + 0.08 * tracking_error["velocity"]
            ),
            "vertical": tube_feedback * 0.10 * tracking_error["altitude"],
            "yaw": tube_feedback * 0.04 * tracking_error["attitude"],
        }

    def _tightened_constraints(self):
        tightening = self.config["constraint_tightening_level"]

        return {
            "state_constraints": {
                key: self._tighten_limits(value, tightening)
                for key, value in self.config["state_constraints"].items()
            },
            "input_constraints": {
                key: self._tighten_limits(value, tightening)
                for key, value in self.config["input_constraints"].items()
            },
        }

    def _tighten_limits(self, limits, tightening):
        lower, upper = limits
        span = upper - lower
        margin = max(0.0, span * min(0.45, tightening) * 0.5)
        return [lower + margin, upper - margin]

    def _count_tube_violations(self, error_tube):
        radius = self.config["tube_radius"]
        return sum(
            1
            for point in error_tube
            if sum(value * value for value in point.values()) ** 0.5 > radius
        )

    def _count_constraint_violations(self, actual_state, raw_control, tightened_constraints):
        state_violations = sum(
            1
            for key in STATE_KEYS
            if (
                actual_state[key] < tightened_constraints["state_constraints"][key][0]
                or actual_state[key] > tightened_constraints["state_constraints"][key][1]
            )
        )
        input_violations = sum(
            1
            for key in INPUT_KEYS
            if (
                raw_control[key] < tightened_constraints["input_constraints"][key][0]
                or raw_control[key] > tightened_constraints["input_constraints"][key][1]
            )
        )
        return state_violations + input_violations

    def _state_disturbance_scale(self, key):
        return {
            "position": 2.0,
            "velocity": 0.7,
            "altitude": 1.2,
            "attitude": 3.0,
        }.get(key, 1.0)

    def _robustness_score(self, tube_error_norm, tube_violations, constraint_violations):
        tube_score = 1.0 / (1.0 + max(0.0, tube_error_norm - self.config["tube_radius"]))
        violation_score = 1.0 / (1.0 + tube_violations + constraint_violations)
        disturbance_score = 1.0 / (1.0 + self.config["disturbance_bound"])
        return (tube_score + violation_score + disturbance_score) / 3.0

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
            "robust_trajectory_tracking": "extension_slot",
            "uncertainty_aware_path_following": "extension_slot",
            "robust_guidance_control_integration": "extension_slot",
        }


tube_mpc_controller = TubeMPCController()
