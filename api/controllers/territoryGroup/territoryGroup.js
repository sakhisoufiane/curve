const territoryGroupTerritories = require('../../libs/territoryGroupTerritories');

const TerritoryGroupController = this;

/**
* Checks if the given name is disallowed.
* @param {string} name - The name to check.
* @returns {boolean} - returns true if the name is disallowed, otherwise false.
*/
TerritoryGroupController.isNameDisallowed = (name) => {
  const upperCaseName = name?.toUpperCase();
  return territoryGroupTerritories.some((territory) => territory.code.toUpperCase() === upperCaseName
    || territory.name.toUpperCase() === upperCaseName
    || territory.continent.toUpperCase() === upperCaseName
    || territory?.alternativeName?.toUpperCase() === upperCaseName
    || territory?.secondAlternativeName?.toUpperCase() === upperCaseName
    || territory?.thirdAlternativeName?.toUpperCase() === upperCaseName);
};

TerritoryGroupController.validate = (territoryGroup) => {
  const errors = [];
  const allowedCharactersRegex = /^[A-Za-z0-9()'\-, ]*$/;
  if (territoryGroup.name.length > 150 || !allowedCharactersRegex.test(territoryGroup.name)) {
    errors.push("Territory Group name must be <150 characters and contain only characters: A-Z a-z 0-9 () ' - , and spaces");
  }
  return errors;
};

module.exports = TerritoryGroupController;
