const validateFileType = ({ filename }) => {
  const validFileTypes = ['.pdf', '.xls', '.xlsx', '.xlsb', '.csv', '.doc', '.docx', '.rtf', '.png', '.jpeg', '.jpg', '.tiff', '.tif'];
  const fileNameSections = filename.split('.');
  const extension = `.${fileNameSections[fileNameSections.length - 1]}`.toLowerCase();

  if (validFileTypes.indexOf(extension) > -1) {
    return true;
  }

  return false;
};

const validateContentType = ({ contentType }) => {
  const validContentTypes = [
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.xlsb',
    'text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/rtf',
    'image/png',
    'image/jpeg',
    'image/tiff',
  ];

  if (validContentTypes.indexOf(contentType) > -1) {
    return true;
  }

  return false;
};

module.exports = { validateFileType, validateContentType };
