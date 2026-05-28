from fastapi import APIRouter
import subprocess

router = APIRouter()

@router.get("/ros2/status")
def ros2_status():
    try:
        result = subprocess.run(
            ["ros2", "topic", "list"],
            capture_output=True,
            text=True,
            timeout=3
        )

        topics = result.stdout.splitlines()

        return {
            "status": "running" if "/telemetry_data" in topics else "no telemetry",
            "topics": topics
        }

    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }