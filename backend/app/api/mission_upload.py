import json
import subprocess
from datetime import datetime

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

latest_uploaded_mission = None

latest_mission_status = {
    "status": "idle",
    "message": "No mission uploaded yet",
    "mission_name": None,
    "waypoint_count": 0,
    "last_updated": None
}


class Waypoint(BaseModel):
    lat: float
    lon: float
    alt: float


class MissionUploadRequest(BaseModel):
    name: str
    waypoints: list[Waypoint]


def publish_mission_to_ros2(mission_data: dict):
    mission_json = json.dumps(mission_data)

    command = (
        "source /opt/ros/jazzy/setup.bash && "
        "source ~/Aerospace/ROS2/autonomy_ws/install/setup.bash && "
        f"ros2 topic pub --once /mission_upload std_msgs/msg/String "
        f"'{{data: {json.dumps(mission_json)}}}'"
    )

    subprocess.Popen(["bash", "-c", command])


def get_latest_uploaded_mission():
    return latest_uploaded_mission


def reset_upload_status():
    global latest_mission_status, latest_uploaded_mission

    latest_uploaded_mission = None
    latest_mission_status = {
        "status": "idle",
        "message": "No mission uploaded yet",
        "mission_name": None,
        "waypoint_count": 0,
        "last_updated": None
    }


@router.post("/mission/upload")
def upload_mission(mission: MissionUploadRequest):
    global latest_mission_status, latest_uploaded_mission

    latest_uploaded_mission = mission.model_dump()
    publish_mission_to_ros2(latest_uploaded_mission)

    latest_mission_status = {
        "status": "success",
        "message": "Mission uploaded to ROS2 mission node",
        "mission_name": mission.name,
        "waypoint_count": len(mission.waypoints),
        "last_updated": datetime.now().strftime("%H:%M:%S")
    }

    return latest_mission_status


@router.get("/mission/upload/status")
def get_mission_upload_status():
    return latest_mission_status