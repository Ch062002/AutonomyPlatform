import json
from datetime import datetime, timezone

from app.control.controllers.lqr import LQRController
from app.control.controllers.mpc import MPCController
from app.control.controllers.pid import PIDController
from app.control.controllers.smc import SMCController

CONTROL_LOG_FILE = "/tmp/control_log.jsonl"
CONTROL_AXES = [
    "attitude_control",
    "altitude_control",
    "velocity_control",
    "position_control",
]


class ControllerManager:
    def __init__(self):
        self.controllers = {
            "PID": PIDController(),
            "LQR": LQRController(),
            "SMC": SMCController(),
            "MPC": MPCController(),
        }
        self.active_controller = "PID"

    def list_controllers(self):
        return [
            {
                "controller_name": name,
                "status": "placeholder",
                "health": "ready",
                "active": name == self.active_controller,
                "supported_control_axes": CONTROL_AXES,
            }
            for name in self.controllers
        ]

    def get_active_controller_output(self):
        return self.controllers[self.active_controller].compute()

    def get_status(self):
        active_output = self.get_active_controller_output()

        return {
            "active_controller": self.active_controller,
            "available_controllers": list(self.controllers.keys()),
            "controller_health": {
                name: "ready" for name in self.controllers
            },
            "controller_status": active_output["status"],
            "control_output": active_output["control_output"],
            "supported_control_axes": CONTROL_AXES,
            "active_controller_output": active_output,
        }

    def select_controller(self, controller_name):
        normalized_name = controller_name.upper()

        if normalized_name not in self.controllers:
            return None

        self.active_controller = normalized_name
        status = self.get_status()
        self.append_log("select_controller", status)
        return status

    def append_log(self, event, payload):
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "event": event,
            "active_controller": self.active_controller,
            "payload": payload,
        }

        with open(CONTROL_LOG_FILE, "a") as f:
            f.write(json.dumps(log_entry) + "\n")


controller_manager = ControllerManager()
