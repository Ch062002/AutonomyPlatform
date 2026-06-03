from typing import Dict, List, Optional

from pydantic import BaseModel

from fastapi import APIRouter, HTTPException

from app.control.controllers.controller_manager import controller_manager

router = APIRouter(prefix="/control", tags=["control"])


class ControllerSelection(BaseModel):
    controller_name: str


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


def get_pid_controller():
    return controller_manager.controllers["PID"]


def get_lqr_controller():
    return controller_manager.controllers["LQR"]


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
    }
    controller_manager.append_log("controllers", response)
    return response


@router.post("/select")
def select_control_controller(selection: ControllerSelection):
    status = controller_manager.select_controller(selection.controller_name)

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
