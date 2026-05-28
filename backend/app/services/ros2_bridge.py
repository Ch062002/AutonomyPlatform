import threading
import json

import rclpy
from rclpy.node import Node

from std_msgs.msg import String


latest_telemetry = {
    "altitude": "--",
    "velocity": "--",
    "battery": "--",
    "flight_mode": "--"
}


class TelemetrySubscriber(Node):

    def __init__(self):

        super().__init__('telemetry_subscriber')

        self.subscription = self.create_subscription(
            String,
            'telemetry_data',
            self.telemetry_callback,
            10
        )

    def telemetry_callback(self, msg):

        global latest_telemetry

        latest_telemetry = json.loads(msg.data)


def ros2_spin():

    rclpy.init()

    node = TelemetrySubscriber()

    rclpy.spin(node)

    node.destroy_node()

    rclpy.shutdown()


def start_ros2_bridge():

    thread = threading.Thread(
        target=ros2_spin,
        daemon=True
    )

    thread.start()