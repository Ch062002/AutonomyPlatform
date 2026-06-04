from typing import Dict, List, Optional

from pydantic import BaseModel, Field

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.control.controller_comparison import (
    build_controller_comparison,
    export_comparison_csv,
    read_comparison_logs,
)
from app.control.controller_benchmark import (
    build_controller_benchmark,
    export_benchmark_csv,
)
from app.control.controllers.controller_manager import controller_manager
from app.control.disturbance_testing import disturbance_testing_manager

router = APIRouter(prefix="/control", tags=["control"])


class ControllerSelection(BaseModel):
    controller: Optional[str] = None
    controller_name: Optional[str] = None


class PIDAxisGains(BaseModel):
    kp: Optional[float] = None
    ki: Optional[float] = None
    kd: Optional[float] = None


class PIDConfigUpdate(BaseModel):
    gains: Dict[str, PIDAxisGains]


class LQRConfigUpdate(BaseModel):
    a_matrix: Optional[List[List[float]]] = None
    b_matrix: Optional[List[List[float]]] = None
    q_matrix: Optional[List[List[float]]] = None
    r_matrix: Optional[List[List[float]]] = None


class SMCAxisParameters(BaseModel):
    lambda_: Optional[float] = Field(default=None, alias="lambda")
    k: Optional[float] = None
    phi: Optional[float] = None
    mode: Optional[str] = None


class SMCConfigUpdate(BaseModel):
    parameters: Dict[str, SMCAxisParameters]


class MPCConfigUpdate(BaseModel):
    prediction_horizon: Optional[int] = None
    control_horizon: Optional[int] = None
    dt: Optional[float] = None
    q_weights: Optional[Dict[str, float]] = None
    r_weights: Optional[Dict[str, float]] = None
    input_limits: Optional[Dict[str, List[float]]] = None
    state_limits: Optional[Dict[str, List[float]]] = None


class DisturbanceApplyRequest(BaseModel):
    scenario_name: str


def get_latest_telemetry_data():
    try:
        import app.services.ros2_bridge as ros2_bridge

        return ros2_bridge.latest_telemetry or {}
    except Exception:
        return {}


def build_pid_state_from_telemetry():
    telemetry = get_latest_telemetry_data()

    return {
        "attitude": telemetry.get("heading", telemetry.get("yaw", 0.0)),
        "altitude": telemetry.get("altitude", telemetry.get("global_altitude", 0.0)),
        "velocity": telemetry.get("velocity", 0.0),
        "position": telemetry.get("position_error", 0.0),
    }


def build_pid_reference_from_telemetry():
    telemetry = get_latest_telemetry_data()

    return {
        "attitude": telemetry.get("desired_heading", telemetry.get("heading", 0.0)),
        "altitude": telemetry.get("target_altitude", telemetry.get("altitude", 0.0)),
        "velocity": telemetry.get("target_velocity", telemetry.get("velocity", 0.0)),
        "position": 0.0,
    }


def build_lqr_state_from_telemetry():
    telemetry = get_latest_telemetry_data()

    return {
        "position_error": telemetry.get(
            "cross_track_error",
            telemetry.get("position_error", 0.0),
        ),
        "velocity": telemetry.get("velocity", 0.0),
        "altitude": telemetry.get("altitude", telemetry.get("global_altitude", 0.0)),
        "attitude": telemetry.get("heading", telemetry.get("yaw", 0.0)),
    }


def build_lqr_reference_from_telemetry():
    telemetry = get_latest_telemetry_data()

    return {
        "position": 0.0,
        "velocity": telemetry.get("target_velocity", telemetry.get("velocity", 0.0)),
        "altitude": telemetry.get("target_altitude", telemetry.get("altitude", 0.0)),
        "attitude": telemetry.get("desired_heading", telemetry.get("heading", 0.0)),
    }


def build_smc_state_from_telemetry():
    telemetry = get_latest_telemetry_data()

    return {
        "attitude": telemetry.get("heading", telemetry.get("yaw", 0.0)),
        "altitude": telemetry.get("altitude", telemetry.get("global_altitude", 0.0)),
        "velocity": telemetry.get("velocity", 0.0),
        "position": telemetry.get(
            "cross_track_error",
            telemetry.get("position_error", 0.0),
        ),
    }


def build_smc_reference_from_telemetry():
    telemetry = get_latest_telemetry_data()

    return {
        "attitude": telemetry.get("desired_heading", telemetry.get("heading", 0.0)),
        "altitude": telemetry.get("target_altitude", telemetry.get("altitude", 0.0)),
        "velocity": telemetry.get("target_velocity", telemetry.get("velocity", 0.0)),
        "position": 0.0,
    }


def build_mpc_state_from_telemetry():
    telemetry = get_latest_telemetry_data()

    return {
        "position_error": telemetry.get(
            "cross_track_error",
            telemetry.get("position_error", 0.0),
        ),
        "velocity": telemetry.get("velocity", 0.0),
        "altitude": telemetry.get("altitude", telemetry.get("global_altitude", 0.0)),
        "attitude": telemetry.get("heading", telemetry.get("yaw", 0.0)),
    }


def build_mpc_reference_from_telemetry():
    telemetry = get_latest_telemetry_data()

    return {
        "position": 0.0,
        "velocity": telemetry.get("target_velocity", telemetry.get("velocity", 0.0)),
        "altitude": telemetry.get("target_altitude", telemetry.get("altitude", 0.0)),
        "attitude": telemetry.get("desired_heading", telemetry.get("heading", 0.0)),
    }


def get_pid_controller():
    return controller_manager.controllers["PID"]


def get_lqr_controller():
    return controller_manager.controllers["LQR"]


def get_smc_controller():
    return controller_manager.controllers["SMC"]


def get_mpc_controller():
    return controller_manager.controllers["MPC"]


def build_metric_lookup(rows, key="controller"):
    return {
        row.get(key): row
        for row in rows
        if row.get(key)
    }


def build_controller_status_cards(comparison, benchmark):
    comparison_metrics = build_metric_lookup(comparison.get("metrics", []))
    benchmark_metrics = build_metric_lookup(benchmark.get("results", []))
    cards = []

    for controller_name in ("PID", "LQR", "SMC", "MPC"):
        comparison_row = comparison_metrics.get(controller_name, {})
        benchmark_row = benchmark_metrics.get(controller_name, {})

        cards.append({
            "controller": controller_name,
            "active": controller_name == controller_manager.active_controller,
            "health": "ready",
            "tracking_error": comparison_row.get("tracking_error", 0.0),
            "control_effort": comparison_row.get("control_effort", 0.0),
            "response_quality": comparison_row.get("response_quality", 0.0),
            "robustness_score": comparison_row.get("robustness_score", 0.0),
            "computation_time_ms": comparison_row.get("computation_time_ms", 0.0),
            "benchmark_score": benchmark_row.get("overall_score", 0.0),
            "samples": benchmark_row.get("samples", 0),
        })

    return cards


def build_metric_summary(cards, metric_name, prefer_low=True):
    if not cards:
        return {
            "metric": metric_name,
            "best_controller": None,
            "best_value": 0.0,
            "values": {},
        }

    best = min(cards, key=lambda item: item.get(metric_name, 0.0)) if prefer_low else max(
        cards,
        key=lambda item: item.get(metric_name, 0.0),
    )

    return {
        "metric": metric_name,
        "best_controller": best["controller"],
        "best_value": best.get(metric_name, 0.0),
        "values": {
            card["controller"]: card.get(metric_name, 0.0)
            for card in cards
        },
    }


def build_controller_leaderboard(cards):
    ranked_cards = sorted(
        cards,
        key=lambda item: item.get("benchmark_score", 0.0),
        reverse=True,
    )

    return [
        {
            "rank": index + 1,
            "controller": card["controller"],
            "active": card["active"],
            "overall_score": card.get("benchmark_score", 0.0),
            "tracking_error": card.get("tracking_error", 0.0),
            "control_effort": card.get("control_effort", 0.0),
            "robustness_score": card.get("robustness_score", 0.0),
            "computation_time_ms": card.get("computation_time_ms", 0.0),
            "health": card.get("health", "unknown"),
        }
        for index, card in enumerate(ranked_cards)
    ]


def build_control_analytics(comparison, benchmark, disturbance_analytics, cards):
    comparison_metrics = comparison.get("metrics", [])
    benchmark_results = benchmark.get("results", [])
    active_card = next(
        (card for card in cards if card.get("active")),
        {},
    )

    return {
        "controller_count": len(cards),
        "active_controller": controller_manager.active_controller,
        "active_health": active_card.get("health", "unknown"),
        "comparison_samples": len(comparison_metrics),
        "benchmark_samples": sum(row.get("samples", 0) for row in benchmark_results),
        "disturbance_active": disturbance_analytics.get("disturbance_active", False),
        "disturbance_scenario": disturbance_analytics.get("scenario_name"),
        "average_tracking_error": (
            sum(card.get("tracking_error", 0.0) for card in cards) / len(cards)
            if cards
            else 0.0
        ),
        "average_control_effort": (
            sum(card.get("control_effort", 0.0) for card in cards) / len(cards)
            if cards
            else 0.0
        ),
        "average_benchmark_score": (
            sum(card.get("benchmark_score", 0.0) for card in cards) / len(cards)
            if cards
            else 0.0
        ),
    }


@router.get("/status")
def get_control_status():
    status = controller_manager.get_status()
    controller_manager.append_log("status", status)
    return status


@router.get("/controllers")
def get_control_controllers():
    response = {
        "supported_controllers": ["PID", "LQR", "SMC", "MPC"],
        "controllers": controller_manager.list_controllers(),
        "active_controller": controller_manager.active_controller,
        "future_ready": controller_manager.get_active_metadata()["future_ready"],
    }
    controller_manager.append_log("controllers", response)
    return response


@router.get("/comparison")
def get_controller_comparison():
    return build_controller_comparison(controller_manager)


@router.get("/comparison/logs")
def get_controller_comparison_logs():
    return {
        "logs": read_comparison_logs(limit=100)
    }


@router.get("/comparison/export")
def export_controller_comparison():
    export_file = export_comparison_csv()
    return FileResponse(
        export_file,
        media_type="text/csv",
        filename="controller_comparison_export.csv",
    )


@router.get("/benchmark")
def get_controller_benchmark():
    return build_controller_benchmark(
        controller_manager,
        disturbance_testing_manager,
    )


@router.get("/benchmark/export")
def export_controller_benchmark():
    export_file = export_benchmark_csv()
    return FileResponse(
        export_file,
        media_type="text/csv",
        filename="controller_benchmark_export.csv",
    )


@router.get("/research-summary")
def get_control_research_summary():
    controller_status = controller_manager.get_status()
    comparison = build_controller_comparison(controller_manager)
    disturbance_analytics = disturbance_testing_manager.analytics(controller_manager)
    benchmark = build_controller_benchmark(
        controller_manager,
        disturbance_testing_manager,
    )
    controller_cards = build_controller_status_cards(comparison, benchmark)
    tracking_error_summary = build_metric_summary(
        controller_cards,
        "tracking_error",
        prefer_low=True,
    )
    control_effort_summary = build_metric_summary(
        controller_cards,
        "control_effort",
        prefer_low=True,
    )
    robustness_summary = build_metric_summary(
        controller_cards,
        "robustness_score",
        prefer_low=False,
    )
    computation_time_summary = build_metric_summary(
        controller_cards,
        "computation_time_ms",
        prefer_low=True,
    )

    return {
        "active_controller": controller_manager.active_controller,
        "controller_status": controller_status,
        "comparison": comparison,
        "disturbance_analytics": disturbance_analytics,
        "benchmark": benchmark,
        "controller_cards": controller_cards,
        "controller_leaderboard": build_controller_leaderboard(controller_cards),
        "control_analytics": build_control_analytics(
            comparison,
            benchmark,
            disturbance_analytics,
            controller_cards,
        ),
        "best_controller_summary": {
            "comparison_best": comparison.get("best_controller"),
            "benchmark_best": benchmark.get("best_controller"),
            "lowest_tracking_error": tracking_error_summary.get("best_controller"),
            "highest_robustness": robustness_summary.get("best_controller"),
            "lowest_control_effort": control_effort_summary.get("best_controller"),
            "fastest_computation": computation_time_summary.get("best_controller"),
        },
        "control_effort_summary": control_effort_summary,
        "tracking_error_summary": tracking_error_summary,
        "robustness_summary": robustness_summary,
        "computation_time_summary": computation_time_summary,
    }


@router.get("/disturbance/scenarios")
def get_disturbance_scenarios():
    return disturbance_testing_manager.list_scenarios()


@router.post("/disturbance/apply")
def apply_disturbance(request: DisturbanceApplyRequest):
    status = disturbance_testing_manager.apply(
        request.scenario_name,
        controller_manager,
    )

    if status is None:
        raise HTTPException(
            status_code=400,
            detail="Unsupported disturbance scenario.",
        )

    return status


@router.post("/disturbance/clear")
def clear_disturbance():
    return disturbance_testing_manager.clear(controller_manager)


@router.get("/disturbance/status")
def get_disturbance_status():
    return disturbance_testing_manager.status(controller_manager)


@router.get("/disturbance/analytics")
def get_disturbance_analytics():
    return disturbance_testing_manager.analytics(controller_manager)


@router.get("/active")
def get_active_controller():
    return controller_manager.get_active_metadata()


@router.post("/select")
def select_control_controller(selection: ControllerSelection):
    selected_controller = selection.controller or selection.controller_name
    status = controller_manager.select_controller(selected_controller)

    if status is None:
        raise HTTPException(
            status_code=400,
            detail="Unsupported controller. Supported controllers: PID, LQR, SMC, MPC",
        )

    return status


@router.get("/pid/status")
def get_pid_status():
    return get_pid_controller().get_status(
        state=build_pid_state_from_telemetry(),
        reference=build_pid_reference_from_telemetry(),
    )


@router.get("/pid/config")
def get_pid_config():
    return get_pid_controller().get_config()


@router.post("/pid/config")
def update_pid_config(config: PIDConfigUpdate):
    gains = {
        axis: axis_gains.model_dump(exclude_none=True)
        for axis, axis_gains in config.gains.items()
    }
    return get_pid_controller().update_config(gains)


@router.get("/pid/analytics")
def get_pid_analytics():
    return get_pid_controller().get_analytics()


@router.get("/lqr/status")
def get_lqr_status():
    return get_lqr_controller().get_status(
        state=build_lqr_state_from_telemetry(),
        reference=build_lqr_reference_from_telemetry(),
    )


@router.get("/lqr/config")
def get_lqr_config():
    return get_lqr_controller().get_config()


@router.post("/lqr/config")
def update_lqr_config(config: LQRConfigUpdate):
    return get_lqr_controller().update_config(
        config.model_dump(exclude_none=True)
    )


@router.get("/lqr/analytics")
def get_lqr_analytics():
    return get_lqr_controller().get_analytics()


@router.get("/smc/status")
def get_smc_status():
    return get_smc_controller().get_status(
        state=build_smc_state_from_telemetry(),
        reference=build_smc_reference_from_telemetry(),
    )


@router.get("/smc/config")
def get_smc_config():
    return get_smc_controller().get_config()


@router.post("/smc/config")
def update_smc_config(config: SMCConfigUpdate):
    parameters = {}

    for axis, axis_parameters in config.parameters.items():
        axis_dump = axis_parameters.model_dump(exclude_none=True)

        if "lambda_" in axis_dump:
            axis_dump["lambda"] = axis_dump.pop("lambda_")

        parameters[axis] = axis_dump

    return get_smc_controller().update_config(parameters)


@router.get("/smc/analytics")
def get_smc_analytics():
    return get_smc_controller().get_analytics()


@router.get("/mpc/status")
def get_mpc_status():
    return get_mpc_controller().get_status(
        state=build_mpc_state_from_telemetry(),
        reference=build_mpc_reference_from_telemetry(),
    )


@router.get("/mpc/config")
def get_mpc_config():
    return get_mpc_controller().get_config()


@router.post("/mpc/config")
def update_mpc_config(config: MPCConfigUpdate):
    return get_mpc_controller().update_config(
        config.model_dump(exclude_none=True)
    )


@router.get("/mpc/analytics")
def get_mpc_analytics():
    return get_mpc_controller().get_analytics()
