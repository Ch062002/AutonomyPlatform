import json
import os
from datetime import datetime, timezone

import numpy as np

LQR_LOG_FILE = "/tmp/lqr_log.jsonl"

DEFAULT_A = [
    [1.0, 0.02, 0.0, 0.0],
    [0.0, 1.0, 0.0, 0.0],
    [0.0, 0.0, 1.0, 0.02],
    [0.0, 0.0, 0.0, 1.0],
]
DEFAULT_B = [
    [0.0, 0.0],
    [0.02, 0.0],
    [0.0, 0.0],
    [0.0, 0.02],
]
DEFAULT_Q = [
    [8.0, 0.0, 0.0, 0.0],
    [0.0, 2.0, 0.0, 0.0],
    [0.0, 0.0, 6.0, 0.0],
    [0.0, 0.0, 0.0, 2.0],
]
DEFAULT_R = [
    [1.0, 0.0],
    [0.0, 1.0],
]


def _is_number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def _safe_float(value, fallback=0.0):
    if _is_number(value):
        return float(value)

    try:
        return float(value)
    except (TypeError, ValueError):
        return fallback


def _matrix_to_float_list(matrix):
    return [
        [_safe_float(value) for value in row]
        for row in matrix
    ]


def _to_array(matrix, fallback):
    try:
        return np.array(_matrix_to_float_list(matrix), dtype=float)
    except Exception:
        return np.array(fallback, dtype=float)


def append_lqr_log(result):
    log_entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        **result,
    }

    with open(LQR_LOG_FILE, "a") as f:
        f.write(json.dumps(log_entry) + "\n")


def read_lqr_logs(limit=100000):
    if not os.path.exists(LQR_LOG_FILE):
        return []

    logs = []

    with open(LQR_LOG_FILE, "r") as f:
        lines = f.readlines()[-limit:]

    for line in lines:
        try:
            logs.append(json.loads(line))
        except Exception:
            continue

    return logs


class LQRController:
    name = "LQR"

    def __init__(self):
        self.a_matrix = _matrix_to_float_list(DEFAULT_A)
        self.b_matrix = _matrix_to_float_list(DEFAULT_B)
        self.q_matrix = _matrix_to_float_list(DEFAULT_Q)
        self.r_matrix = _matrix_to_float_list(DEFAULT_R)
        self.gain_matrix = []
        self.last_result = None
        self.recompute_gain()

    def compute(self, control_axis=None, state=None, reference=None):
        state_vector = self._build_state_vector(state or {})
        reference_vector = self._build_reference_vector(reference or {}, state or {})
        state_error = reference_vector - state_vector
        gain_matrix = np.array(self.gain_matrix, dtype=float)
        control_output = -gain_matrix @ state_error
        error_norm = float(np.linalg.norm(state_error))
        control_norm = float(np.linalg.norm(control_output))

        result = {
            "controller_name": self.name,
            "status": "active",
            "control_axis": control_axis,
            "state_vector": state_vector.tolist(),
            "reference_vector": reference_vector.tolist(),
            "state_error": state_error.tolist(),
            "state_error_norm": error_norm,
            "control_output": control_output.tolist(),
            "control_effort": control_norm,
            "gain_matrix_k": self.gain_matrix,
            "health": "ready",
            "future_ready": {
                "gain_scheduling": "placeholder",
                "lpv_control": "placeholder",
                "pid_vs_lqr_comparison": {
                    "tracking_error": "placeholder",
                    "settling_time": "placeholder",
                    "overshoot": "placeholder",
                    "control_effort": "ready",
                },
            },
        }

        self.last_result = result
        append_lqr_log(result)
        return result

    def get_status(self, state=None, reference=None):
        return self.compute(state=state, reference=reference)

    def get_config(self):
        return {
            "controller_name": self.name,
            "a_matrix": self.a_matrix,
            "b_matrix": self.b_matrix,
            "q_matrix": self.q_matrix,
            "r_matrix": self.r_matrix,
            "gain_matrix_k": self.gain_matrix,
            "state_space_model": "x_dot = Ax + Bu",
            "control_law": "u = -Kx",
            "future_ready": {
                "gain_scheduling": "placeholder",
                "lpv_control": "placeholder",
            },
        }

    def update_config(self, config):
        candidate_a = _to_array(config.get("a_matrix", self.a_matrix), self.a_matrix)
        candidate_b = _to_array(config.get("b_matrix", self.b_matrix), self.b_matrix)
        candidate_q = _to_array(config.get("q_matrix", self.q_matrix), self.q_matrix)
        candidate_r = _to_array(config.get("r_matrix", self.r_matrix), self.r_matrix)

        if not self._valid_dimensions(candidate_a, candidate_b, candidate_q, candidate_r):
            return {
                "status": "invalid_config",
                "message": "Expected A nxn, B nxm, Q nxn, R mxm with compatible dimensions.",
                **self.get_config(),
            }

        self.a_matrix = candidate_a.tolist()
        self.b_matrix = candidate_b.tolist()
        self.q_matrix = candidate_q.tolist()
        self.r_matrix = candidate_r.tolist()
        self.recompute_gain()
        return self.get_config()

    def get_analytics(self):
        logs = read_lqr_logs()
        state_errors = []
        control_efforts = []

        for log in logs:
            state_error_norm = log.get("state_error_norm")
            control_effort = log.get("control_effort")

            if _is_number(state_error_norm):
                state_errors.append(abs(state_error_norm))

            if _is_number(control_effort):
                control_efforts.append(abs(control_effort))

        average_state_error = (
            sum(state_errors) / len(state_errors)
            if state_errors
            else 0.0
        )
        max_state_error = max(state_errors) if state_errors else 0.0
        control_effort = sum(control_efforts)

        return {
            "controller_name": self.name,
            "samples": len(logs),
            "average_state_error": average_state_error,
            "max_state_error": max_state_error,
            "control_effort": control_effort,
            "stability_score": self._stability_score(),
            "response_quality": self._response_quality(average_state_error, control_effort),
            "comparison_ready": {
                "pid_vs_lqr": True,
                "tracking_error": average_state_error,
                "settling_time": "placeholder",
                "overshoot": "placeholder",
                "control_effort": control_effort,
            },
        }

    def recompute_gain(self):
        a = np.array(self.a_matrix, dtype=float)
        b = np.array(self.b_matrix, dtype=float)
        q = np.array(self.q_matrix, dtype=float)
        r = np.array(self.r_matrix, dtype=float)
        p = q.copy()

        for _ in range(150):
            regularized = r + b.T @ p @ b
            next_p = a.T @ p @ a - a.T @ p @ b @ np.linalg.pinv(regularized) @ b.T @ p @ a + q

            if np.linalg.norm(next_p - p) < 1e-8:
                p = next_p
                break

            p = next_p

        gain = np.linalg.pinv(r + b.T @ p @ b) @ b.T @ p @ a
        self.gain_matrix = gain.tolist()
        return self.gain_matrix

    def _valid_dimensions(self, a, b, q, r):
        if a.ndim != 2 or b.ndim != 2 or q.ndim != 2 or r.ndim != 2:
            return False

        state_count = a.shape[0]
        input_count = b.shape[1]

        return (
            a.shape == (state_count, state_count)
            and b.shape[0] == state_count
            and q.shape == (state_count, state_count)
            and r.shape == (input_count, input_count)
        )

    def _build_state_vector(self, values):
        return np.array([
            _safe_float(values.get("position_error", values.get("position", 0.0))),
            _safe_float(values.get("velocity", values.get("speed", 0.0))),
            _safe_float(values.get("altitude", values.get("global_altitude", 0.0))),
            _safe_float(values.get("attitude", values.get("heading", values.get("yaw", 0.0)))),
        ], dtype=float)

    def _build_reference_vector(self, reference, state):
        return np.array([
            _safe_float(reference.get("position", reference.get("position_error", 0.0))),
            _safe_float(reference.get("velocity", state.get("velocity", 0.0))),
            _safe_float(reference.get("altitude", state.get("altitude", 0.0))),
            _safe_float(reference.get("attitude", state.get("attitude", state.get("heading", 0.0)))),
        ], dtype=float)

    def _stability_score(self):
        try:
            a = np.array(self.a_matrix, dtype=float)
            b = np.array(self.b_matrix, dtype=float)
            k = np.array(self.gain_matrix, dtype=float)
            eigenvalues = np.linalg.eigvals(a - b @ k)
            spectral_radius = max(abs(value) for value in eigenvalues)
            return float(max(0.0, min(1.0, 1.0 / (1.0 + spectral_radius))))
        except Exception:
            return 0.0

    def _response_quality(self, average_state_error, control_effort):
        score = 1.0 / (1.0 + average_state_error + 0.01 * control_effort)
        return float(max(0.0, min(1.0, score)))
