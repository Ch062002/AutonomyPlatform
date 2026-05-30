import subprocess
from fastapi import APIRouter

router = APIRouter()


def run_command(command_name):
    command_map = {
        "arm": "ros2 run px4_command_node command_node arm",
        "disarm": "ros2 run px4_command_node command_node disarm",
        "takeoff": "ros2 run px4_command_node command_node takeoff 10",
        "land": "ros2 run px4_command_node command_node land",
        "rtl": "ros2 run px4_command_node command_node rtl",
        "hold": "ros2 run px4_command_node command_node hold"
    }

    full_command = (
        "source /opt/ros/jazzy/setup.bash && "
        "source ~/Aerospace/ROS2/autonomy_ws/install/setup.bash && "
        f"{command_map[command_name]}"
    )

    subprocess.Popen(["bash", "-c", full_command])


def run_offboard_executor():
    full_command = (
        "source /opt/ros/jazzy/setup.bash && "
        "source ~/Aerospace/ROS2/autonomy_ws/install/setup.bash && "
        "ros2 run px4_mission_node offboard_mission_executor"
    )

    subprocess.Popen(["bash", "-c", full_command])


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
    run_command("takeoff")
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


@router.post("/command/offboard")
def offboard_vehicle():
    run_offboard_executor()
    return {"status": "success", "message": "OFFBOARD executor started"}

@router.post("/command/stop-offboard")
def stop_offboard_vehicle():
    subprocess.Popen([
        "bash",
        "-c",
        "pkill -f offboard_mission_executor"
    ])

    return {
        "status": "success",
        "message": "OFFBOARD executor stopped"
    }