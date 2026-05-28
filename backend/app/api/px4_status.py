from fastapi import APIRouter
import subprocess

router = APIRouter()

@router.get("/px4/status")
def px4_status():

    try:

        result = subprocess.run(
            ["pgrep", "-f", "px4"],
            capture_output=True,
            text=True
        )

        if result.stdout.strip():

            return {
                "status": "running"
            }

        else:

            return {
                "status": "not running"
            }

    except Exception as e:

        return {
            "status": "error",
            "error": str(e)
        }
