module.exports = {
  getExportBucketName: async () => process.env.GCS_ALL_SALES_CSV_EXPORT ?? 'all-period-sales-export',
};
