from fastapi import APIRouter
import subprocess

router = APIRouter()


def run_command(command: str):
    subprocess.Popen([
        "bash",
        "-c",
        f"source /opt/ros/jazzy/setup.bash && source ~/Aerospace/ROS2/autonomy_ws/install/setup.bash && ros2 run px4_command_node command_node {command}"
    ])


@router.post("/command/arm")
def arm_vehicle():
    run_command("arm")
    return {"status": "success", "message": "ARM command sent"}


@router.post("/command/disarm")
def disarm_vehicle():
    run_command("disarm")
    return {"status": "success", "message": "DISARM command sent"}


@router.post("/command/takeoff")
def takeoff_vehicle():
    run_command("takeoff 10")
    return {"status": "success", "message": "TAKEOFF command sent"}


@router.post("/command/land")
def land_vehicle():
    run_command("land")
    return {"status": "success", "message": "LAND command sent"}


@router.post("/command/rtl")
def rtl_vehicle():
    run_command("rtl")
    return {"status": "success", "message": "RTL command sent"}


@router.post("/command/hold")
def hold_vehicle():
    run_command("hold")
    return {"status": "success", "message": "HOLD command sent"}