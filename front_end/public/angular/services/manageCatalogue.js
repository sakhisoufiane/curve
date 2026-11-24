angular.module('Curve')
  .service('ManageCatalogue', ManageCatalogue);

function ManageCatalogue($location) {
  // Type of catalogue being edited, composer, publisher or work
  const type = $location.search().type ?? 'composer';

  // Pagination index on the index page
  const pageIndex = 1;

  // Selected entities to be reviewed & merged
  const selectedEntities = [];

  const toMergePage = () => $location.path('/catalogue/manage/merge');
  const toIndexPage = () => $location.path('/catalogue/manage');

  const linkToEntity = (catalogueType, entityId) => {
    if (catalogueType === 'composer') return `/#/composers/${entityId}/edit`;
    if (catalogueType === 'publisher') return `/#/publishers/${entityId}/edit`;
    return `/#/works/${entityId}/edit`;
  };

  const linkToWork = (workId) => `/#/works/${workId}/edit`;

  const changeCatalogueType = (catalogueType) => $location.search('type', catalogueType);

  return {
    type,
    changeCatalogueType,
    pageIndex,
    selectedEntities,
    toMergePage,
    toIndexPage,
    linkToEntity,
    linkToWork,
  };
}
