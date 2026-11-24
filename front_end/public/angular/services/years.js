angular.module('Curve')
  .factory('Years', () => {
    const date = new Date();
    const nextYear = date.getFullYear() + 1;
    const years = [];
    for (let i = nextYear; i >= 1950; i -= 1) {
      years.push(i);
    }
    return years;
  });
