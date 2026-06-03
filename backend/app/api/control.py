from pydantic import BaseModel

from fastapi import APIRouter, HTTPException

from app.control.controllers.controller_manager import controller_manager

router = APIRouter(prefix="/control", tags=["control"])


class ControllerSelection(BaseModel):
    controller_name: str


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
