from fastapi import APIRouter
import subprocess

router = APIRouter()

@router.get("/gazebo/status")
def gazebo_status():
    try:
        result = subprocess.run(
            ["pgrep", "-f", "gz"],
            capture_output=True,
            text=True
        )

        if result.stdout.strip():
            return {"status": "running"}
        else:
            return {"status": "not running"}

    except Exception as e:
        return {"status": "error", "error": str(e)}
