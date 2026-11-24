module.exports = {
  getExportBucketName: async () => process.env.GCS_CUSTOM_REPORT_EXPORT ?? 'curve-custom-reports',
};
