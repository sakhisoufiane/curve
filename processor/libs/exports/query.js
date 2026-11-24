/**
 * @param {Object} params
 * @param {BigQuery} params.bigQuery BigQuery client instance from PSU
 * @param {string} params.googleStoragePath Filepath in a Google Storage bucket e.g. gs://bucket-name/file-*.json
 * @param {Record<string, unknown>} params.query BigQuery query object to execute
 *
 * @description Run a BigQuery query & export it to a file located in a Google Storage bucket
 */
async function runExportQuery({ bigQuery, googleStoragePath, query }) {
  const exportQuery = `EXPORT DATA OPTIONS(uri='${googleStoragePath}', overwrite=true, format='JSON') AS ${query.query}`;
  await new Promise((resolve, reject) => {
    bigQuery.query({ ...query, query: exportQuery }, (err, res) => {
      if (err) reject(err);
      else resolve(res);
    });
  });
}

module.exports = {
  runExportQuery,
};
