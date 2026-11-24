const addDecimalPoint = (str, decimalPlaces) => {
  if (!str || str === '') return null;
  return (Number(str) / (10 ** decimalPlaces)).toFixed(decimalPlaces);
};

const formatDate = (dateStr, format) => {
  let date;
  if (dateStr && dateStr !== '') {
    if (format === 'YYYYMMDD' && dateStr !== '00000000') {
      date = `${dateStr.substr(6, 2)}/${dateStr.substr(4, 2)}/${dateStr.substr(0, 4)}`;
    } else if (format === 'YYYY-MM-DD') {
      date = `${dateStr.substr(8, 2)}/${dateStr.substr(5, 2)}/${dateStr.substr(0, 4)}`;
    }
  }
  return date;
};

module.exports = {
  addDecimalPoint,
  formatDate,
};
