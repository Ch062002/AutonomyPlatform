class MPCController:
    name = "MPC"

    def compute(self, control_axis=None, state=None, reference=None):
        return {
            "controller_name": self.name,
            "status": "placeholder",
            "control_axis": control_axis,
            "control_output": {},
            "health": "ready",
            "future_ready": {
                "attitude_control": "placeholder",
                "altitude_control": "placeholder",
                "velocity_control": "placeholder",
                "position_control": "placeholder",
            },
        }
