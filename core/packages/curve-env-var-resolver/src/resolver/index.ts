import {
  memoisedFunctions,
  getEnvVars,
  getEnvVarAWS,
  getEnvVarAWSWithConfig
} from './envResolver.js';

export const getEnvVar = memoisedFunctions.memoisedGetEnvVar;
export const getEnvVarWithConfig = memoisedFunctions.memoisedGetEnvVarWithConfig;
export { getEnvVars, getEnvVarAWS, getEnvVarAWSWithConfig };