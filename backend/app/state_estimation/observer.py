import math


class PlaceholderObserver:
    def __init__(self):
        self.position = [0.0, 0.0]
        self.velocity = [0.0, 0.0]
        self.observer_gain = 0.35
        self.initialized = False

    def update(self, gps_x, gps_y, velocity_x=0.0, velocity_y=0.0):
        if not self.initialized:
            self.position = [gps_x, gps_y]
            self.velocity = [velocity_x, velocity_y]
            self.initialized = True
            estimation_error = 0.0
        else:
            position_error = [
                gps_x - self.position[0],
                gps_y - self.position[1],
            ]
            velocity_error = [
                velocity_x - self.velocity[0],
                velocity_y - self.velocity[1],
            ]

            self.position[0] += self.observer_gain * position_error[0]
            self.position[1] += self.observer_gain * position_error[1]
            self.velocity[0] += self.observer_gain * velocity_error[0]
            self.velocity[1] += self.observer_gain * velocity_error[1]

            estimation_error = math.sqrt(
                position_error[0] * position_error[0]
                + position_error[1] * position_error[1]
            )

        return {
            "estimated_x": self.position[0],
            "estimated_y": self.position[1],
            "estimated_vx": self.velocity[0],
            "estimated_vy": self.velocity[1],
            "observer_gain": self.observer_gain,
            "estimation_error": estimation_error,
        }
