const UnmappedConfig = this;

UnmappedConfig.logKey = 'Unmapped Sales Report V2';

UnmappedConfig.BUCKET_NAME = process.env.GCS_UNREPORTED_SALES_EXPORT ?? 'unreportsales-report-output';

UnmappedConfig.CONCURRENY_LIMIT = 20;

module.exports = UnmappedConfig;
