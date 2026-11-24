/* eslint-disable eqeqeq */

const {
  CISAC_COUNTRIES_AFRICA,
  AREA_CODES,
  CISAC_COUNTRIES_AMERICAS,
  CISAC_COUNTRIES_ASIA,
  CISAC_COUNTRIES_EUROPE,
  CISAC_COUNTRIES_OCEANIA,
  CISAC_APPROVED_COUNTRIES_CODES,
  CISAC_APPROVED_TERRITORIES,
  ALL_WORLD_CODE,
} = require('./cwr/territories');

// Check if a territory code exists in a specified continent
function territoryInContinent(territory, continent) {
  if (continent == AREA_CODES.Africa && Object.values(CISAC_COUNTRIES_AFRICA).includes(territory)) return true;
  if (continent == AREA_CODES.Americas && Object.values(CISAC_COUNTRIES_AMERICAS).includes(territory)) return true;
  if (continent == AREA_CODES.Asia && Object.values(CISAC_COUNTRIES_ASIA).includes(territory)) return true;
  if (continent == AREA_CODES.Europe && Object.values(CISAC_COUNTRIES_EUROPE).includes(territory)) return true;
  if (continent == AREA_CODES.Oceania && Object.values(CISAC_COUNTRIES_OCEANIA).includes(territory)) return true;
  return false;
}

// Get all country codes for a specified continent
function continentToTerritoryCodes(territory) {
  if (territory === AREA_CODES.Africa) return Object.values(CISAC_COUNTRIES_AFRICA);
  if (territory === AREA_CODES.Americas) return Object.values(CISAC_COUNTRIES_AMERICAS);
  if (territory === AREA_CODES.Asia) return Object.values(CISAC_COUNTRIES_ASIA);
  if (territory === AREA_CODES.Europe) return Object.values(CISAC_COUNTRIES_EUROPE);
  if (territory === AREA_CODES.Oceania) return Object.values(CISAC_COUNTRIES_OCEANIA);
  if (territory === AREA_CODES.WW || territory === AREA_CODES.World) return CISAC_APPROVED_COUNTRIES_CODES;
  if (Array.isArray(territory)) return territory;
  return [territory];
}

// Convert a CWR territory TIN code e.g. "0826" to a country code e.g. "GB"
function parseTerritoryString(territoryString) {
  const tinNumber = Number(territoryString);
  // If all world, return an array of all country codes
  if (tinNumber === ALL_WORLD_CODE) return CISAC_APPROVED_COUNTRIES_CODES;
  return CISAC_APPROVED_TERRITORIES[tinNumber];
}

/* eslint-disable max-len */
module.exports = {
  territoryInContinent,
  continentToTerritoryCodes,
  parseTerritoryString,
  allTerritories: CISAC_APPROVED_COUNTRIES_CODES,
  africa: CISAC_COUNTRIES_AFRICA,
  americas: CISAC_COUNTRIES_AMERICAS,
  asia: CISAC_COUNTRIES_ASIA,
  europe: CISAC_COUNTRIES_EUROPE,
  oceania: CISAC_COUNTRIES_EUROPE,
};
