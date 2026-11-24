/* eslint-disable eqeqeq */
/* eslint-disable radix */
module.exports = {
  valueOrDefault(queryPage, def) {
    if (queryPage) {
      return parseInt(queryPage);
    }
    return def;
  },
  sortOrDefault(querySortBy, querySortDir) {
    let sortString = '';
    if (querySortBy && querySortBy != '') {
      if (querySortDir && querySortDir == 'desc') {
        sortString = `-${querySortBy}`;
      } else {
        sortString = querySortBy;
      }
    }
    return sortString;
  },
  mongoDbSortOrDefault(querySortBy, querySortDir) {
    const sortArray = [];
    if (querySortBy && querySortBy != '') {
      if (querySortDir && querySortDir == 'desc') {
        sortArray.push([querySortBy, -1]);
      } else {
        sortArray.push([querySortBy, 1]);
      }
    }
    return sortArray;
  },
  mongoDbSkipByPage(queryPage, def, limit) {
    if (queryPage) {
      return (parseInt(queryPage) - 1) * parseInt(limit);
    }
    return def;
  },
};
