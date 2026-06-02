import math
from datetime import datetime, timezone


class SimpleEKF:
    def __init__(self):
        self.state = [0.0, 0.0, 0.0, 0.0]
        self.covariance = [10.0, 10.0, 5.0, 5.0]
        self.process_noise = [0.02, 0.02, 0.05, 0.05]
        self.measurement_noise = [1.0, 1.0, 0.5, 0.5]
        self.initialized = False
        self.last_timestamp = None

    def _get_dt(self):
        now = datetime.now(timezone.utc)

        if self.last_timestamp is None:
            self.last_timestamp = now
            return 1.0

        dt = (now - self.last_timestamp).total_seconds()
        self.last_timestamp = now

        if dt <= 0:
            return 1.0

        return min(dt, 5.0)

    def _predict(self, dt):
        self.state[0] += self.state[2] * dt
        self.state[1] += self.state[3] * dt

        self.covariance = [
            self.covariance[0] + self.covariance[2] * dt * dt + self.process_noise[0],
            self.covariance[1] + self.covariance[3] * dt * dt + self.process_noise[1],
            self.covariance[2] + self.process_noise[2],
            self.covariance[3] + self.process_noise[3],
        ]

    def _update(self, measurement):
        innovation = [
            measurement[index] - self.state[index]
            for index in range(4)
        ]

        for index in range(4):
            gain = self.covariance[index] / (
                self.covariance[index] + self.measurement_noise[index]
            )
            self.state[index] += gain * innovation[index]
            self.covariance[index] = (1.0 - gain) * self.covariance[index]

        return math.sqrt(sum(value * value for value in innovation))

    def update(self, gps_x, gps_y, velocity_x=0.0, velocity_y=0.0):
        measurement = [gps_x, gps_y, velocity_x, velocity_y]

        if not self.initialized:
            self.state = measurement[:]
            self.initialized = True
            self.last_timestamp = datetime.now(timezone.utc)
            return {
                "estimated_x": self.state[0],
                "estimated_y": self.state[1],
                "estimated_vx": self.state[2],
                "estimated_vy": self.state[3],
                "innovation": 0.0,
                "covariance_trace": sum(self.covariance),
            }

        dt = self._get_dt()
        self._predict(dt)
        innovation = self._update(measurement)

        return {
            "estimated_x": self.state[0],
            "estimated_y": self.state[1],
            "estimated_vx": self.state[2],
            "estimated_vy": self.state[3],
            "innovation": innovation,
            "covariance_trace": sum(self.covariance),
        }
