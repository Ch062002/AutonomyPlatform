import csv
import json
import os
from datetime import datetime, timezone

from app.control.controller_comparison import build_controller_comparison

CONTROLLER_BENCHMARK_LOG_FILE = "/tmp/controller_benchmark_log.jsonl"
CONTROLLER_BENCHMARK_EXPORT_FILE = "/tmp/controller_benchmark_export.csv"

BENCHMARK_FIELDS = [
    "controller",
    "samples",
    "tracking_error_score",
    "control_effort_score",
    "robustness_score",
    "response_quality_score",
    "computation_score",
    "disturbance_rejection_score",
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


def _controller_samples(controller):
    analytics = controller.get_analytics()
    return int(_safe_number(analytics.get("samples"), 0))


def _disturbance_rejection_score(metric, disturbance_manager, controller_name):
    if (
        disturbance_manager.active_scenario is not None
        and disturbance_manager.controller_under_test == controller_name
    ):
        severity = disturbance_manager.active_scenario.get("severity", 0.0)
        disturbed_error = metric.get("tracking_error", 0.0) * (1.0 + severity)
        return _bounded_inverse_score(disturbed_error + severity)

    return _bounded_score(metric.get("robustness_score", 0.0))


def build_controller_benchmark(controller_manager, disturbance_manager):
    comparison = build_controller_comparison(controller_manager)
    benchmark_rows = []

    for metric in comparison.get("metrics", []):
        controller_name = metric["controller"]
        tracking_error_score = _bounded_inverse_score(metric.get("tracking_error"))
        control_effort_score = _bounded_inverse_score(metric.get("control_effort"))
        robustness_score = _bounded_score(metric.get("robustness_score"))
        response_quality_score = _bounded_score(metric.get("response_quality"))
        computation_score = _bounded_inverse_score(metric.get("computation_time_ms"))
        disturbance_rejection_score = _disturbance_rejection_score(
            metric,
            disturbance_manager,
            controller_name,
        )
        overall_score = _average([
            tracking_error_score,
            control_effort_score,
            robustness_score,
            response_quality_score,
            computation_score,
            disturbance_rejection_score,
        ])

        benchmark_rows.append({
            "controller": controller_name,
            "samples": _controller_samples(controller_manager.controllers[controller_name]),
            "tracking_error_score": tracking_error_score,
            "control_effort_score": control_effort_score,
            "robustness_score": robustness_score,
            "response_quality_score": response_quality_score,
            "computation_score": computation_score,
            "disturbance_rejection_score": disturbance_rejection_score,
            "overall_score": overall_score,
        })

    best_controller = max(benchmark_rows, key=lambda item: item["overall_score"])
    result = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "active_controller": controller_manager.active_controller,
        "best_controller": best_controller["controller"],
        "benchmark_fields": BENCHMARK_FIELDS,
        "results": benchmark_rows,
    }

    append_benchmark_log(result)
    return result


def append_benchmark_log(result):
    with open(CONTROLLER_BENCHMARK_LOG_FILE, "a") as f:
        f.write(json.dumps(result) + "\n")


def read_benchmark_logs(limit=100):
    if not os.path.exists(CONTROLLER_BENCHMARK_LOG_FILE):
        return []

    logs = []

    with open(CONTROLLER_BENCHMARK_LOG_FILE, "r") as f:
        lines = f.readlines()[-limit:]

    for line in lines:
        try:
            logs.append(json.loads(line))
        except Exception:
            continue

    return logs


def export_benchmark_csv():
    logs = read_benchmark_logs(limit=100000)

    with open(CONTROLLER_BENCHMARK_EXPORT_FILE, "w", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=["timestamp", "active_controller", "best_controller", *BENCHMARK_FIELDS],
        )
        writer.writeheader()

        for log in logs:
            for row in log.get("results", []):
                writer.writerow({
                    "timestamp": log.get("timestamp"),
                    "active_controller": log.get("active_controller"),
                    "best_controller": log.get("best_controller"),
                    **{
                        field: row.get(field)
                        for field in BENCHMARK_FIELDS
                    },
                })

    return CONTROLLER_BENCHMARK_EXPORT_FILE
