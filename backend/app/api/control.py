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
