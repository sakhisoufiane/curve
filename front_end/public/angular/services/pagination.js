angular.module('Curve')
  .factory('Pagination', () => ({
    createArray(currentPage, pages) {
      if (!currentPage) { currentPage = 1; }
      currentPage = parseInt(currentPage);
      let pagesArray = [];
      let i;
      if (pages > 5 && currentPage < 3) {
        pagesArray = [1, 2, 3, 4, 5];
      } else if (pages > 5 && currentPage > 3 && currentPage === pages) {
        for (i = currentPage - 4; i <= currentPage; i += 1) { pagesArray.push(i); }
      } else if (pages > 5 && currentPage > 3 && currentPage === pages - 1) {
        for (i = currentPage - 3; i <= currentPage + 1; i += 1) { pagesArray.push(i); }
      } else if (pages > 5 && currentPage >= 3) {
        for (i = currentPage - 2; i <= currentPage + 2; i += 1) { pagesArray.push(i); }
      } else {
        for (i = 1; i <= pages; i += 1) { pagesArray.push(i); }
      }
      return pagesArray;
    },
  }));
