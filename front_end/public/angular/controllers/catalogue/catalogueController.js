/* eslint-disable no-continue */
/* eslint-disable no-return-assign */
/* eslint-disable-next-line no-promise-executor-return */
angular.module('Curve')
  .controller('catalogueController', [
    '$scope', '$interval', 'Pagination', 'Composer', 'Publisher', 'Work', 'Loader', 'ManageCatalogue', 'SelectAll', 'Catalogue',
    function ($scope, $interval, Pagination, Composer, Publisher, Work, Loader, ManageCatalogue, SelectAll, Catalogue) {
      // Filtering
      $scope.currentPage = ManageCatalogue.pageIndex;
      $scope.totalPages = 0;
      $scope.total = 0;
      $scope.pages = Pagination.createArray($scope.currentPage, $scope.totalPages);

      // Page
      $scope.type = ManageCatalogue.type;

      // Index Page
      $scope.entities = [];
      $scope.selectedEntities = [];
      $scope.selectAllChecked = false;
      $scope.isRunning = {
        composer: false,
        publisher: false,
        work: false,
      };

      // Initial filter params
      $scope.filter = {
        orderBy: 'potentialDuplicatesCount',
        orderDir: 'desc',
        search: null,
        page: $scope.currentPage,
        text: '',
        limit: 25,
      };

      // Index page top-level entity columns
      $scope.headers = [
        { title: 'Name', name: 'name', sortable: true },
        { title: 'CAE', name: 'cae' },
        // { title: 'Confidence (%)', name: 'score', sortable: true },
        { title: 'Possible Duplicates', name: 'potentialDuplicatesCount', sortable: true },
      ];

      // Index page top-level entity columns (Works)
      $scope.workHeaders = [
        { title: 'Title', name: 'title', sortable: true },
        { title: 'Composer(s)', name: 'composer', sortable: true },
        { title: 'Potential Duplicates', name: 'potentialDuplicatesCount', sortable: true },
      ];

      // Index page child entity columns
      $scope.childHeaders = [
        { title: 'Name', name: 'name' },
        { title: 'CAE', name: 'cae' },
        { title: 'Main Society', name: 'mainPro' },
        { title: 'Main Society ID', name: 'mainProIdentifier' },
        { title: 'No. Works', name: 'worksCount' },
      ];

      // Index page child entity columns (Works)
      $scope.workChildHeaders = [
        { title: 'Title', name: 'title' },
        { title: 'Foreign ID', name: 'foreignId' },
        { title: 'Composer(s)', name: 'composer' },
      ];

      // Composers or Publishers to delete (in selection)
      $scope.entitiesToDelete = [];

      // Utils for entity type selection
      const getCatalogueService = () => {
        if ($scope.type === 'composer') return Composer;
        if ($scope.type === 'publisher') return Publisher;
        return Work;
      };

      // Utils for entity display name
      const getEntityName = ({ multi = false }) => {
        if ($scope.type === 'composer') return multi ? 'Composer(s)' : 'Composer';
        if ($scope.type === 'publisher') return multi ? 'Publisher(s)' : 'Publisher';
        return multi ? 'Work(s)' : 'Work';
      };
      $scope.getEntityName = () => getEntityName({ multi: false });
      $scope.getMultiEntityName = () => getEntityName({ multi: true });

      // Util for generating links to entity edit pages
      $scope.getEntityLink = (entityId) => ManageCatalogue.linkToEntity($scope.type, entityId);
      $scope.getWorkLink = (workId) => ManageCatalogue.linkToWork(workId);

      $scope.sortColumn = async (columnName) => {
        if (columnName === $scope.filter.orderBy) {
          $scope.filter.orderDir = $scope.filter.orderDir === 'asc' ? 'desc' : 'asc';
        } else {
          $scope.filter.orderBy = columnName;
        }
        Loader.load();
        await $scope.search();
        Loader.complete();
        $scope.$applyAsync();
      };

      $scope.selectRow = (entity) => {
        entity.selected = !entity.selected;

        if (entity.selected) $scope.selectedEntities.push(entity);
        else $scope.selectedEntities = $scope.selectedEntities.filter((c) => c._id !== entity._id);

        entity.potentialDuplicates.forEach((duplicate) => {
          duplicate.selected = entity.selected;
          const entityId = duplicate.workId ?? duplicate.composerId ?? duplicate.publisherId;
          if (duplicate.selected) $scope.selectedEntities.push({ ...duplicate, _id: entityId });
          else $scope.selectedEntities = $scope.selectedEntities.filter((c) => (c.workId ?? c.composerId ?? c.publisherId) !== entityId);
        });
      };

      $scope.selectRowChild = (entity) => {
        entity.selected = !entity.selected;
        const entityId = entity.workId ?? entity.composerId ?? entity.publisherId;
        if (entity.selected) $scope.selectedEntities.push({ ...entity, _id: entityId });
        else $scope.selectedEntities = $scope.selectedEntities.filter((c) => (c.workId ?? c.composerId ?? c.publisherId) !== entityId);
      };

      // Delete a Composer, Publisher or Work (from within potentialDuplicates)
      $scope.deleteEntityChild = async (entity, child) => {
        Loader.load();

        let deleteId = child?.workId;
        if ($scope.type === 'composer') deleteId = child?.composerId;
        if ($scope.type === 'publisher') deleteId = child?.publisherId;

        getCatalogueService().delete('duplicates', [deleteId], async (response) => {
          if (response.status === 200) {
            await $scope.search();
            Loader.success(`${getEntityName({ multi: false })} ${child?.title ?? child?.name} was deleted`);
          } else if (response.status === 201) {
            Loader.error(response.data);
          } else {
            Loader.error(`Error removing ${getEntityName({ multi: false })} as a duplicate`);
          }
          $scope.$applyAsync();
        });
      };

      // Flag a Composer or Publisher (from within potentialDuplicates) as not a duplicate
      $scope.removeDuplicate = async (entity, child) => {
        Loader.load();
        let request = {
          primaryWorkId: entity._id,
          // Remove the selected (child) work as a duplicate
          blacklistedDuplicateIds: [child.workId],
          deleteWorkIds: [],
          data: { _id: entity._id },
        };
        if ($scope.type === 'composer') {
          request = {
            primaryComposerId: entity._id,
            // Remove the selected (child) composer as a duplicate
            blacklistedDuplicateIds: [child.composerId],
            deleteComposerIds: [],
            data: { _id: entity._id },
          };
        }
        if ($scope.type === 'publisher') {
          request = {
            primaryPublisherId: entity._id,
            // Remove the selected (child) publisher as a duplicate
            blacklistedDuplicateIds: [child.publisherId],
            deletePublisherIds: [],
            data: { _id: entity._id },
          };
        }
        getCatalogueService().merge(request, async (response) => {
          if (response.status === 200) {
            await $scope.search();
            Loader.success(`${getEntityName({ multi: false })} ${child?.title ?? child?.name} was flagged as not a duplicate`);
            $scope.$applyAsync();
          }
        }).catch(() => {
          Loader.error(`Error removing ${getEntityName({ multi: false })} as a duplicate`);
        });
      };

      $scope.selectAll = () => {
        SelectAll.select($scope.entities);
        $scope.selectedEntities = $scope.entities.filter((c) => c.selected);
        $scope.selectAllChecked = true;
      };

      $scope.toggleChildRows = (entity) => {
        entity.expanded = !entity.expanded;
      };

      $scope.search = async () => {
        await new Promise((resolve, reject) => {
          const filterParams = {
            page: $scope.filter.page,
            limit: $scope.filter.limit,
            orderBy: $scope.filter.orderBy,
            orderDir: $scope.filter.orderDir,
            search: $scope.filter.text,
          };
          getCatalogueService().getDuplicates(filterParams, (response) => {
            if (response.status === 200) {
              $scope.entities = response.data.duplicates;
              $scope.currentPage = response.data.meta.currentPage;
              $scope.totalPages = response.data.meta.totalPages;
              $scope.total = response.data.meta.total;
              $scope.pages = Pagination.createArray($scope.currentPage, $scope.totalPages);
              resolve();
            }
          });
        });
        $scope.currentPage = ManageCatalogue.pageIndex;
      };

      const getStatus = async () => new Promise((resolve) => {
        Catalogue.getFindDuplicatesStatus({ type: $scope.type }, (response) => {
          if (response.status === 200) {
            resolve(response.data.isRunning);
          } else {
            resolve(false);
          }
        });
      });

      $scope.searchByName = async () => {
        Loader.load();
        ManageCatalogue.pageIndex = 1;
        $scope.filter.page = ManageCatalogue.pageIndex;
        await $scope.search();
        Loader.complete();
        $scope.$applyAsync();
      };

      $scope.changeType = async (catalogueType) => {
        ManageCatalogue.changeCatalogueType(catalogueType);
        ManageCatalogue.type = catalogueType;
      };

      $scope.changePage = async (page) => {
        Loader.load();
        ManageCatalogue.pageIndex = page;
        $scope.filter.page = ManageCatalogue.pageIndex;
        await $scope.search();
        Loader.complete();
        $scope.$applyAsync();
      };

      $scope.reviewEntity = (entity) => {
        $scope.selectRow(entity);
        ManageCatalogue.toMergePage();
      };

      $scope.reviewSelectedEntities = () => {
        ManageCatalogue.toMergePage();
      };

      $scope.deleteSelectedEntities = () => {
        $scope.entitiesToDelete = $scope.selectedEntities.map((c) => c._id);
        $('#deleteModal').modal('show');
      };

      $scope.confirmDelete = async () => {
        Loader.load();
        getCatalogueService().delete('duplicates', $scope.entitiesToDelete, async (response) => {
          $('#deleteModal').modal('hide');
          if (response.status === 200) {
            await $scope.search();
            Loader.success(`Successfully deleted ${$scope.entitiesToDelete.length} ${getEntityName({ multi: true })}`);
            $scope.entitiesToDelete = [];
            $scope.selectedEntities = [];
          } else if (response.status === 201) {
            Loader.error(response.data);
          } else {
            Loader.error(`Error deleting ${getEntityName({ multi: true })}`);
          }
          $scope.$applyAsync();
        });
      };

      $scope.showAll = async function () {
        Loader.load();
        $scope.isShowingAll = true;
        ManageCatalogue.pageIndex = 1;
        $scope.filter.page = ManageCatalogue.pageIndex;
        $scope.filter.limit = 500;
        await $scope.search();
        Loader.complete();
        $scope.$applyAsync();
      };

      async function init() {
        Loader.load();
        $scope.type = ManageCatalogue.type;
        $scope.isRunning[$scope.type] = await getStatus();
        await $scope.search();
        $scope.entities.forEach((entity) => entity.expanded = false);
        Loader.complete();
        $scope.$applyAsync();
      }

      $scope.$watch('selectedEntities', () => {
        ManageCatalogue.selectedEntities = $scope.selectedEntities;
      });

      $scope.runFindDuplicatesTask = async function () {
        Loader.load();
        Catalogue.runFindDuplicatesTask({ type: $scope.type }, async (response) => {
          if (response.status === 200) {
            $scope.isRunning[$scope.type] = true;
            Loader.success(`${response.data.message}`);
          } else {
            Loader.error('Error searching catalogue for duplicates');
          }
        }, () => {
          Loader.error('Error searching catalogue for duplicates');
        });
      };

      const interval = $interval(async () => {
        const initialStatus = structuredClone($scope.isRunning[$scope.type]);
        $scope.isRunning[$scope.type] = await getStatus();
        const newStatus = structuredClone($scope.isRunning[$scope.type]);
        // If a find duplicates task was running and then finished
        if (initialStatus === true && newStatus === false) {
          init();
        }
        $scope.$applyAsync();
      }, 10000);

      $scope.$on('$destroy', () => {
        if (interval) {
          $interval.cancel(interval);
        }
      });

      init();
    },
  ]);
