angular.module('Curve')
  .factory('SelectAll', () => ({
    select(array) {
      let state = true;
      array.forEach((el) => {
        state = state && el.selected === true;
      });
      array.forEach((el) => {
        if (state) {
          el.selected = false;
        } else {
          el.selected = true;
        }
      });
    },
  }));
