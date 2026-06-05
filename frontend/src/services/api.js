import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:8000";

export const getBackendStatus = () => {
  return axios.get(`${API_BASE_URL}/health`);
};

export const getRos2Status = () => {
  return axios.get(`${API_BASE_URL}/ros2/status`);
};

export const getPx4Status = () => {
  return axios.get(`${API_BASE_URL}/px4/status`);
};

export const getGazeboStatus = () => {
  return axios.get(`${API_BASE_URL}/gazebo/status`);
};

export const getTelemetry = () => {
  return axios.get(`${API_BASE_URL}/telemetry`);
};

export const getMission = () => {
  return axios.get(`${API_BASE_URL}/mission`);
};

export const createMission = (mission) => {
  return axios.post(`${API_BASE_URL}/mission`, mission);
};

export const resetMission = () => {
  return axios.delete(`${API_BASE_URL}/mission`);
};

export const armVehicle = () => {
  return axios.post(`${API_BASE_URL}/command/arm`);
};

export const disarmVehicle = () => {
  return axios.post(`${API_BASE_URL}/command/disarm`);
};

export const takeoffVehicle = () => {
  return axios.post(`${API_BASE_URL}/command/takeoff`);
};

export const landVehicle = () => {
  return axios.post(`${API_BASE_URL}/command/land`);
};

export const rtlVehicle = () => {
  return axios.post(`${API_BASE_URL}/command/rtl`);
};

export const holdVehicle = () => {
  return axios.post(`${API_BASE_URL}/command/hold`);
};

export const uploadMission = (mission) => {
  return axios.post(`${API_BASE_URL}/mission/upload`, mission);
};

export const getMissionUploadStatus = () => {
  return axios.get(`${API_BASE_URL}/mission/upload/status`);
};

export const offboardVehicle = () => {
  return axios.post(`${API_BASE_URL}/command/offboard`);
};

export const stopOffboardVehicle = () => {
  return axios.post(`${API_BASE_URL}/command/stop-offboard`);
};

export const getMissionProgress = () => {
  return axios.get(`${API_BASE_URL}/mission/progress`);
};

export const abortMission = () => {
  return axios.post(`${API_BASE_URL}/command/abort-mission`);
};


export const resetMissionState = () => {
  return axios.post(`${API_BASE_URL}/mission/reset`);
};

export const pauseMission = () => {
  return axios.post(`${API_BASE_URL}/mission/pause`);
};

export const resumeMission = () => {
  return axios.post(`${API_BASE_URL}/mission/resume`);
};

export const setGuidanceMode = (mode) => {
  return axios.post(`${API_BASE_URL}/guidance/mode/${mode}`);
};

export const getGuidanceLogs = () => {
  return axios.get(`${API_BASE_URL}/guidance/logs`);
};

export const getGuidanceAnalytics = () => {
  return axios.get(`${API_BASE_URL}/guidance/analytics`);
};

export const getNavigationLogs = () => {
  return axios.get(`${API_BASE_URL}/navigation/logs`);
};

export const getNavigationAnalytics = () => {
  return axios.get(`${API_BASE_URL}/navigation/analytics`);
};

export const getNavigationReplay = (index = 0) => {
  return axios.get(`${API_BASE_URL}/navigation/replay`, {
    params: { index }
  });
};

export const clearNavigationLogs = () => {
  return axios.post(`${API_BASE_URL}/navigation/logs/clear`);
};

export const exportNavigationLogs = () => {
  window.open(`${API_BASE_URL}/navigation/logs/export`, "_blank");
};

export const getStateEstimationStatus = () => {
  return axios.get(`${API_BASE_URL}/state-estimation/status`);
};

export const getEkfStatus = () => {
  return axios.get(`${API_BASE_URL}/state-estimation/ekf`);
};

export const getUkfStatus = () => {
  return axios.get(`${API_BASE_URL}/state-estimation/ukf`);
};

export const getObserverStatus = () => {
  return axios.get(`${API_BASE_URL}/state-estimation/observer`);
};

export const getEkfAnalytics = () => {
  return axios.get(`${API_BASE_URL}/state-estimation/ekf/analytics`);
};

export const getEstimationComparison = () => {
  return axios.get(`${API_BASE_URL}/state-estimation/comparison`);
};

export const getEstimationComparisonAnalytics = () => {
  return axios.get(`${API_BASE_URL}/state-estimation/comparison/analytics`);
};

export const getStateEstimationBenchmark = () => {
  return axios.get(`${API_BASE_URL}/state-estimation/benchmark`);
};

export const exportStateEstimationBenchmark = () => {
  window.open(`${API_BASE_URL}/state-estimation/benchmark/export`, "_blank");
};

export const getStateEstimationLogs = () => {
  return axios.get(`${API_BASE_URL}/state-estimation/logs`);
};

export const getControlStatus = () => {
  return axios.get(`${API_BASE_URL}/control/status`);
};

export const getControlControllers = () => {
  return axios.get(`${API_BASE_URL}/control/controllers`);
};

export const getActiveController = () => {
  return axios.get(`${API_BASE_URL}/control/active`);
};

export const selectControlController = (controllerName) => {
  return axios.post(`${API_BASE_URL}/control/select`, {
    controller: controllerName
  });
};

export const getPidStatus = () => {
  return axios.get(`${API_BASE_URL}/control/pid/status`);
};

export const getPidConfig = () => {
  return axios.get(`${API_BASE_URL}/control/pid/config`);
};

export const updatePidConfig = (gains) => {
  return axios.post(`${API_BASE_URL}/control/pid/config`, {
    gains
  });
};

export const getPidAnalytics = () => {
  return axios.get(`${API_BASE_URL}/control/pid/analytics`);
};

export const getAdaptivePidStatus = () => {
  return axios.get(`${API_BASE_URL}/control/adaptive-pid/status`);
};

export const getAdaptivePidConfig = () => {
  return axios.get(`${API_BASE_URL}/control/adaptive-pid/config`);
};

export const updateAdaptivePidConfig = (config) => {
  return axios.post(`${API_BASE_URL}/control/adaptive-pid/config`, {
    config
  });
};

export const getAdaptivePidAnalytics = () => {
  return axios.get(`${API_BASE_URL}/control/adaptive-pid/analytics`);
};

export const getLpvStatus = () => {
  return axios.get(`${API_BASE_URL}/control/lpv/status`);
};

export const getLpvConfig = () => {
  return axios.get(`${API_BASE_URL}/control/lpv/config`);
};

export const updateLpvConfig = (config) => {
  return axios.post(`${API_BASE_URL}/control/lpv/config`, {
    config
  });
};

export const getLpvAnalytics = () => {
  return axios.get(`${API_BASE_URL}/control/lpv/analytics`);
};

export const getLqrStatus = () => {
  return axios.get(`${API_BASE_URL}/control/lqr/status`);
};

export const getLqrConfig = () => {
  return axios.get(`${API_BASE_URL}/control/lqr/config`);
};

export const updateLqrConfig = (config) => {
  return axios.post(`${API_BASE_URL}/control/lqr/config`, config);
};

export const getLqrAnalytics = () => {
  return axios.get(`${API_BASE_URL}/control/lqr/analytics`);
};

export const getSmcStatus = () => {
  return axios.get(`${API_BASE_URL}/control/smc/status`);
};

export const getSmcConfig = () => {
  return axios.get(`${API_BASE_URL}/control/smc/config`);
};

export const updateSmcConfig = (parameters) => {
  return axios.post(`${API_BASE_URL}/control/smc/config`, {
    parameters
  });
};

export const getSmcAnalytics = () => {
  return axios.get(`${API_BASE_URL}/control/smc/analytics`);
};

export const getMpcStatus = () => {
  return axios.get(`${API_BASE_URL}/control/mpc/status`);
};

export const getMpcConfig = () => {
  return axios.get(`${API_BASE_URL}/control/mpc/config`);
};

export const updateMpcConfig = (config) => {
  return axios.post(`${API_BASE_URL}/control/mpc/config`, config);
};

export const getMpcAnalytics = () => {
  return axios.get(`${API_BASE_URL}/control/mpc/analytics`);
};

export const getRobustMpcStatus = () => {
  return axios.get(`${API_BASE_URL}/control/robust-mpc/status`);
};

export const getRobustMpcConfig = () => {
  return axios.get(`${API_BASE_URL}/control/robust-mpc/config`);
};

export const updateRobustMpcConfig = (config) => {
  return axios.post(`${API_BASE_URL}/control/robust-mpc/config`, {
    config
  });
};

export const getRobustMpcAnalytics = () => {
  return axios.get(`${API_BASE_URL}/control/robust-mpc/analytics`);
};

export const getTubeMpcStatus = () => {
  return axios.get(`${API_BASE_URL}/control/tube-mpc/status`);
};

export const getTubeMpcConfig = () => {
  return axios.get(`${API_BASE_URL}/control/tube-mpc/config`);
};

export const updateTubeMpcConfig = (config) => {
  return axios.post(`${API_BASE_URL}/control/tube-mpc/config`, {
    config
  });
};

export const getTubeMpcAnalytics = () => {
  return axios.get(`${API_BASE_URL}/control/tube-mpc/analytics`);
};

export const getControllerComparison = () => {
  return axios.get(`${API_BASE_URL}/control/comparison`);
};

export const getControllerComparisonLogs = () => {
  return axios.get(`${API_BASE_URL}/control/comparison/logs`);
};

export const exportControllerComparison = () => {
  window.open(`${API_BASE_URL}/control/comparison/export`, "_blank");
};

export const getDisturbanceScenarios = () => {
  return axios.get(`${API_BASE_URL}/control/disturbance/scenarios`);
};

export const applyDisturbanceScenario = (scenarioName) => {
  return axios.post(`${API_BASE_URL}/control/disturbance/apply`, {
    scenario_name: scenarioName
  });
};

export const clearDisturbanceScenario = () => {
  return axios.post(`${API_BASE_URL}/control/disturbance/clear`);
};

export const getDisturbanceStatus = () => {
  return axios.get(`${API_BASE_URL}/control/disturbance/status`);
};

export const getDisturbanceAnalytics = () => {
  return axios.get(`${API_BASE_URL}/control/disturbance/analytics`);
};

export const getControllerBenchmark = () => {
  return axios.get(`${API_BASE_URL}/control/benchmark`);
};

export const exportControllerBenchmark = () => {
  window.open(`${API_BASE_URL}/control/benchmark/export`, "_blank");
};

export const getControlResearchSummary = () => {
  return axios.get(`${API_BASE_URL}/control/research-summary`);
};

export const getGainSchedulingStatus = () => {
  return axios.get(`${API_BASE_URL}/control/gain-scheduling/status`);
};

export const getGainSchedulingConfig = () => {
  return axios.get(`${API_BASE_URL}/control/gain-scheduling/config`);
};

export const updateGainSchedulingConfig = (config) => {
  return axios.post(`${API_BASE_URL}/control/gain-scheduling/config`, {
    config
  });
};

export const getGainSchedulingAnalytics = () => {
  return axios.get(`${API_BASE_URL}/control/gain-scheduling/analytics`);
};

export const clearStateEstimationLogs = () => {
  return axios.post(`${API_BASE_URL}/state-estimation/logs/clear`);
};

export const exportStateEstimationLogs = () => {
  window.open(`${API_BASE_URL}/state-estimation/logs/export`, "_blank");
};

export const clearGuidanceLogs = () => {
  return axios.post(`${API_BASE_URL}/guidance/logs/clear`);
};

export const exportGuidanceLogs = () => {
  window.open(`${API_BASE_URL}/guidance/logs/export`, "_blank");
};
