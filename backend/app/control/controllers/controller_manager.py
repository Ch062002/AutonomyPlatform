import json
import os
from datetime import datetime, timezone

from app.control.controllers.lqr import LQRController
from app.control.controllers.mpc import MPCController
from app.control.controllers.pid import PIDController
from app.control.controllers.smc import SMCController

CONTROL_LOG_FILE = "/tmp/control_log.jsonl"
CONTROLLER_SWITCH_LOG_FILE = "/tmp/controller_switch_log.jsonl"
CONTROL_AXES = [
    "attitude_control",
    "altitude_control",
    "velocity_control",
    "position_control",
]
FUTURE_CONTROLLER_EXTENSIONS = [
    "Gain Scheduling",
    "Adaptive PID",
    "LPV",
    "Robust MPC",
    "Tube MPC",
    "DOBC",
    "FTC",
    "Backstepping",
    "Adaptive SMC",
]


class ControllerManager:
    def __init__(self):
        self.controllers = {
            "PID": PIDController(),
            "LQR": LQRController(),
            "SMC": SMCController(),
            "MPC": MPCController(),
        }
        self.active_controller = "MPC"

    def get_controller_names(self):
        return list(self.controllers.keys())

    def get_controller_metadata(self, name):
        controller = self.controllers[name]

        return {
            "controller_name": name,
            "status": "active",
            "health": "ready",
            "active": name == self.active_controller,
            "supported_control_axes": CONTROL_AXES,
            "implementation_class": controller.__class__.__name__,
            "future_ready": FUTURE_CONTROLLER_EXTENSIONS,
        }

    def list_controllers(self):
        return [
            self.get_controller_metadata(name)
            for name in self.controllers
        ]

    def get_active_metadata(self):
        return {
            "active_controller": self.active_controller,
            "available_controllers": self.get_controller_names(),
            "controller_health": {
                name: "ready" for name in self.controllers
            },
            "active_controller_metadata": self.get_controller_metadata(
                self.active_controller
            ),
            "last_switch": self.get_last_switch(),
            "switch_history": self.read_switch_logs(limit=20),
            "future_ready": FUTURE_CONTROLLER_EXTENSIONS,
        }

    def get_active_controller_output(self):
        return self.controllers[self.active_controller].compute()

    def get_status(self):
        active_output = self.get_active_controller_output()

        return {
            **self.get_active_metadata(),
            "active_controller": self.active_controller,
            "controller_status": active_output["status"],
            "control_output": active_output["control_output"],
            "supported_control_axes": CONTROL_AXES,
            "active_controller_output": active_output,
        }

    def select_controller(self, controller_name):
        if not controller_name:
            return None

        normalized_name = controller_name.upper()

        if normalized_name not in self.controllers:
            return None

        previous_controller = self.active_controller
        self.active_controller = normalized_name
        self.append_switch_log(previous_controller, normalized_name)
        status = self.get_status()
        self.append_log("select_controller", status)
        return status

    def append_switch_log(self, previous_controller, new_controller):
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "previous_controller": previous_controller,
            "new_controller": new_controller,
        }

        with open(CONTROLLER_SWITCH_LOG_FILE, "a") as f:
            f.write(json.dumps(log_entry) + "\n")

    def read_switch_logs(self, limit=100):
        if not os.path.exists(CONTROLLER_SWITCH_LOG_FILE):
            return []

        logs = []

        with open(CONTROLLER_SWITCH_LOG_FILE, "r") as f:
            lines = f.readlines()[-limit:]

        for line in lines:
            try:
                logs.append(json.loads(line))
            except Exception:
                continue

        return logs

    def get_last_switch(self):
        logs = self.read_switch_logs(limit=1)

        if not logs:
            return None

        return logs[-1]

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
