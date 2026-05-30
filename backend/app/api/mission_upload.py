import json
import subprocess

from fastapi import APIRouter
from pydantic import BaseModel


router = APIRouter()


class Waypoint(BaseModel):
    lat: float
    lon: float
    alt: float


class MissionUploadRequest(BaseModel):
    name: str
    waypoints: list[Waypoint]


@router.post("/mission/upload")
def upload_mission(mission: MissionUploadRequest):
    try:
        mission_json = json.dumps(mission.model_dump())

        command = (
            "source /opt/ros/jazzy/setup.bash && "
            "source ~/Aerospace/ROS2/autonomy_ws/install/setup.bash && "
            f"ros2 topic pub --once /mission_upload std_msgs/msg/String "
            f"'{{data: {json.dumps(mission_json)}}}'"
        )

        subprocess.Popen(["bash", "-c", command])

        return {
            "status": "success",
            "message": "Mission uploaded to ROS2",
            "mission": mission.model_dump()
        }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }