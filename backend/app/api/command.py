import subprocess
import threading
import time

from fastapi import APIRouter

from app.api.mission_progress import (
    set_mission_aborted,
    set_mission_landing,
    reset_mission_progress
)

from app.api.mission_upload import (
    reset_upload_status,
    get_latest_uploaded_mission,
    publish_mission_to_ros2
)

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


def republish_latest_mission_after_delay():
    time.sleep(2)

    latest_mission = get_latest_uploaded_mission()

    if latest_mission is not None:
        publish_mission_to_ros2(latest_mission)

def publish_guidance_mode(mode):
    full_command = (
        "source /opt/ros/jazzy/setup.bash && "
        "source ~/Aerospace/ROS2/autonomy_ws/install/setup.bash && "
        f"ros2 topic pub --once /guidance_mode std_msgs/msg/String "
        f"'{{data: \"{mode}\"}}'"
    )

    subprocess.Popen(["bash", "-c", full_command])

def publish_mission_control(command_text):
    full_command = (
        "source /opt/ros/jazzy/setup.bash && "
        "source ~/Aerospace/ROS2/autonomy_ws/install/setup.bash && "
        f"ros2 topic pub --once /mission_control std_msgs/msg/String "
        f"'{{data: \"{command_text}\"}}'"
    )

    subprocess.Popen(["bash", "-c", full_command])


@router.post("/command/arm")
def arm_vehicle():
    run_command("arm")

    return {
        "status": "success",
        "message": "ARM command sent"
    }


@router.post("/command/disarm")
def disarm_vehicle():
    run_command("disarm")

    return {
        "status": "success",
        "message": "DISARM command sent"
    }


@router.post("/command/takeoff")
def takeoff_vehicle():
    run_command("takeoff")

    return {
        "status": "success",
        "message": "TAKEOFF command sent"
    }


@router.post("/command/land")
def land_vehicle():
    set_mission_landing()

    run_command("land")

    return {
        "status": "success",
        "message": "LAND command sent"
    }


@router.post("/command/rtl")
def rtl_vehicle():
    run_command("rtl")

    return {
        "status": "success",
        "message": "RTL command sent"
    }


@router.post("/command/hold")
def hold_vehicle():
    run_command("hold")

    return {
        "status": "success",
        "message": "HOLD command sent"
    }


@router.post("/command/offboard")
def offboard_vehicle():
    reset_mission_progress()

    run_offboard_executor()

    threading.Thread(
        target=republish_latest_mission_after_delay,
        daemon=True
    ).start()

    return {
        "status": "success",
        "message": "OFFBOARD executor started and latest mission republished"
    }


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


@router.post("/command/abort-mission")
def abort_mission():
    subprocess.Popen([
        "bash",
        "-c",
        (
            "pkill -f offboard_mission_executor && "
            "source /opt/ros/jazzy/setup.bash && "
            "source ~/Aerospace/ROS2/autonomy_ws/install/setup.bash && "
            "ros2 run px4_command_node command_node land"
        )
    ])

    set_mission_aborted()
    reset_upload_status()

    return {
        "status": "success",
        "message": "Mission aborted: OFFBOARD stopped and LAND command sent"
    }


@router.post("/mission/reset")
def reset_mission_state():
    reset_mission_progress()
    reset_upload_status()

    return {
        "status": "success",
        "message": "Mission state reset successfully"
    }


@router.post("/mission/pause")
def pause_mission():
    publish_mission_control("pause")

    return {
        "status": "success",
        "message": "Mission pause command sent"
    }


@router.post("/mission/resume")
def resume_mission():
    publish_mission_control("resume")

    return {
        "status": "success",
        "message": "Mission resume command sent"
    }

@router.post("/guidance/mode/{mode}")
def set_guidance_mode(mode: str):
    publish_guidance_mode(mode.upper())

    return {
        "status": "success",
        "message": f"Guidance mode set to {mode.upper()}"
    }