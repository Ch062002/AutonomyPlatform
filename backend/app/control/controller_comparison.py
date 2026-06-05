import csv
import json
import os
from datetime import datetime, timezone

from app.control.controllers.adaptive_pid import adaptive_pid_controller
from app.control.controllers.lpv import lpv_controller
from app.control.controllers.robust_mpc import robust_mpc_controller

CONTROLLER_COMPARISON_LOG_FILE = "/tmp/controller_comparison_log.jsonl"
CONTROLLER_COMPARISON_EXPORT_FILE = "/tmp/controller_comparison_export.csv"

COMPARISON_FIELDS = [
    "controller",
    "tracking_error",
    "control_effort",
    "response_quality",
    "robustness_score",
    "computation_time_ms",
    "constraint_violations",
    "health_score",
    "overall_score",
]


def _safe_number(value, fallback=0.0):
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return float(value)

    try:
        return float(value)
    except (TypeError, ValueError):
        return fallback


def _bounded_inverse_score(value):
    return 1.0 / (1.0 + max(0.0, _safe_number(value)))


def _bounded_score(value):
    return max(0.0, min(1.0, _safe_number(value)))


def _average(values):
    numeric_values = [_safe_number(value) for value in values]
    return sum(numeric_values) / len(numeric_values) if numeric_values else 0.0


def _normalize_pid(analytics):
    tracking_error = analytics.get("average_error", 0.0)
    control_effort = analytics.get("control_effort", 0.0)

    return {
        "controller": "PID",
        "tracking_error": tracking_error,
        "control_effort": control_effort,
        "response_quality": _bounded_inverse_score(tracking_error),
        "robustness_score": 0.55,
        "computation_time_ms": 0.0,
        "constraint_violations": 0,
        "health_score": 1.0,
    }


def _normalize_lqr(analytics):
    tracking_error = analytics.get("average_state_error", 0.0)
    control_effort = analytics.get("control_effort", 0.0)

    return {
        "controller": "LQR",
        "tracking_error": tracking_error,
        "control_effort": control_effort,
        "response_quality": _bounded_score(analytics.get("response_quality", 0.0)),
        "robustness_score": _bounded_score(analytics.get("stability_score", 0.0)),
        "computation_time_ms": 0.0,
        "constraint_violations": 0,
        "health_score": 1.0,
    }


def _normalize_adaptive_pid(analytics):
    tracking_error = analytics.get("average_error", 0.0)
    control_effort = analytics.get("control_effort", 0.0)

    return {
        "controller": "Adaptive PID",
        "tracking_error": tracking_error,
        "control_effort": control_effort,
        "response_quality": _bounded_inverse_score(tracking_error),
        "robustness_score": _bounded_inverse_score(analytics.get("max_error", 0.0)),
        "computation_time_ms": 0.0,
        "constraint_violations": 0,
        "health_score": 0.0 if analytics.get("adaptation_health") == "disabled" else 1.0,
    }


def _normalize_lpv(analytics):
    tracking_error = analytics.get("average_tracking_error_placeholder", 0.0) or 0.0
    health = analytics.get("lpv_health", "unknown")

    return {
        "controller": "LPV",
        "tracking_error": tracking_error,
        "control_effort": 0.0,
        "response_quality": _bounded_inverse_score(tracking_error),
        "robustness_score": 0.72 if health == "ready" else 0.35,
        "computation_time_ms": 0.0,
        "constraint_violations": 0,
        "health_score": 1.0 if health == "ready" else 0.5,
    }


def _normalize_smc(analytics):
    tracking_error = analytics.get("average_sliding_surface", 0.0)
    control_effort = analytics.get("control_effort", 0.0)
    robustness_score = analytics.get("robustness_score", 0.0)

    return {
        "controller": "SMC",
        "tracking_error": tracking_error,
        "control_effort": control_effort,
        "response_quality": _bounded_inverse_score(tracking_error),
        "robustness_score": _bounded_score(robustness_score),
        "computation_time_ms": 0.0,
        "constraint_violations": 0,
        "health_score": 1.0,
    }


def _normalize_mpc(analytics):
    tracking_error = analytics.get("average_tracking_error", 0.0)
    control_effort = analytics.get("average_control_effort", 0.0)
    constraint_violations = analytics.get("constraint_violation_count", 0)

    return {
        "controller": "MPC",
        "tracking_error": tracking_error,
        "control_effort": control_effort,
        "response_quality": _bounded_inverse_score(tracking_error),
        "robustness_score": _bounded_inverse_score(constraint_violations),
        "computation_time_ms": analytics.get("computation_time_ms", 0.0),
        "constraint_violations": constraint_violations,
        "health_score": 1.0 if analytics.get("solver_status") != "failed" else 0.0,
    }


def _normalize_robust_mpc(analytics):
    tracking_error = analytics.get("average_tracking_error", 0.0)
    control_effort = analytics.get("average_control_effort", 0.0)
    constraint_violations = analytics.get("constraint_violation_count", 0)

    return {
        "controller": "Robust MPC",
        "tracking_error": tracking_error,
        "control_effort": control_effort,
        "response_quality": _bounded_inverse_score(tracking_error),
        "robustness_score": _bounded_score(analytics.get("robustness_score", 0.0)),
        "computation_time_ms": analytics.get("computation_time", 0.0),
        "constraint_violations": constraint_violations,
        "health_score": _bounded_score(analytics.get("feasibility_rate", 0.0)),
    }


def _add_overall_score(metric):
    low_cost_score = _bounded_inverse_score(metric["control_effort"])
    low_time_score = _bounded_inverse_score(metric["computation_time_ms"])
    low_constraint_score = _bounded_inverse_score(metric["constraint_violations"])

    metric["overall_score"] = _average([
        _bounded_inverse_score(metric["tracking_error"]),
        low_cost_score,
        metric["response_quality"],
        metric["robustness_score"],
        low_time_score,
        low_constraint_score,
        metric["health_score"],
    ])
    return metric


def build_controller_comparison(controller_manager):
    pid_metrics = _normalize_pid(controller_manager.controllers["PID"].get_analytics())
    adaptive_pid_metrics = _normalize_adaptive_pid(adaptive_pid_controller.get_analytics())
    lqr_metrics = _normalize_lqr(controller_manager.controllers["LQR"].get_analytics())
    lpv_metrics = _normalize_lpv(lpv_controller.get_analytics())
    smc_metrics = _normalize_smc(controller_manager.controllers["SMC"].get_analytics())
    mpc_metrics = _normalize_mpc(controller_manager.controllers["MPC"].get_analytics())
    robust_mpc_metrics = _normalize_robust_mpc(robust_mpc_controller.get_analytics())
    controllers = [
        _add_overall_score(pid_metrics),
        _add_overall_score(adaptive_pid_metrics),
        _add_overall_score(lqr_metrics),
        _add_overall_score(lpv_metrics),
        _add_overall_score(smc_metrics),
        _add_overall_score(mpc_metrics),
        _add_overall_score(robust_mpc_metrics),
    ]
    best_controller = max(controllers, key=lambda item: item["overall_score"])
    result = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "active_controller": controller_manager.active_controller,
        "best_controller": best_controller["controller"],
        "metrics": controllers,
        "comparison_fields": COMPARISON_FIELDS,
    }

    append_comparison_log(result)
    return result


def append_comparison_log(result):
    with open(CONTROLLER_COMPARISON_LOG_FILE, "a") as f:
        f.write(json.dumps(result) + "\n")


def read_comparison_logs(limit=100):
    if not os.path.exists(CONTROLLER_COMPARISON_LOG_FILE):
        return []

    logs = []

    with open(CONTROLLER_COMPARISON_LOG_FILE, "r") as f:
        lines = f.readlines()[-limit:]

    for line in lines:
        try:
            logs.append(json.loads(line))
        except Exception:
            continue

    return logs


def export_comparison_csv():
    logs = read_comparison_logs(limit=100000)

    with open(CONTROLLER_COMPARISON_EXPORT_FILE, "w", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=["timestamp", "active_controller", "best_controller", *COMPARISON_FIELDS],
        )
        writer.writeheader()

        for log in logs:
            for metric in log.get("metrics", []):
                writer.writerow({
                    "timestamp": log.get("timestamp"),
                    "active_controller": log.get("active_controller"),
                    "best_controller": log.get("best_controller"),
                    **{
                        field: metric.get(field)
                        for field in COMPARISON_FIELDS
                    },
                })

    return CONTROLLER_COMPARISON_EXPORT_FILE
