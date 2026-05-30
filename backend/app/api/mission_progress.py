import json
import subprocess

from fastapi import APIRouter

router = APIRouter()


latest_progress = {
    "mission_state": "Idle",
    "active_waypoint": 0,
    "total_waypoints": 0,
    "progress_percent": 0
}


@router.get("/mission/progress")
def get_mission_progress():
    try:
        command = (
            "source /opt/ros/jazzy/setup.bash && "
            "source ~/Aerospace/ROS2/autonomy_ws/install/setup.bash && "
            "timeout 2 ros2 topic echo /mission_progress --once"
        )

        result = subprocess.run(
            ["bash", "-c", command],
            capture_output=True,
            text=True,
            timeout=3
        )

        output = result.stdout

        for line in output.splitlines():
            line = line.strip()

            if line.startswith("data:"):
                raw_data = line.replace("data:", "").strip().strip("'")
                progress = json.loads(raw_data)
                return progress

        return latest_progress

    except Exception:
        return latest_progress