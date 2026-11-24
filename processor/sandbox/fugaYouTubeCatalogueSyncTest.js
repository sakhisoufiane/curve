require('dotenv').config();
require('../models/db');
const fugaYouTubeCatalogSync = require('../libs/fuga/fugaYouTubeCatalogSync');

const message = {
  "kind": "storage#object",
  "id": "fuga-dev-rad-splits/yt_catalog/17/2025-08-15.csv/1755271524945693",
  "selfLink": "https://www.googleapis.com/storage/v1/b/fuga-dev-rad-splits/yt_catalog/17/2025-08-15.csv",
  "name": "yt_catalog/17/2025-08-15.csv",
  "bucket": "fuga-dev-rad-splits",
  "generation": "1754912258743499",
  "metageneration": "1",
  "contentType": "text/csv",
  "timeCreated": "2025-08-11T11:37:38.757Z",
  "updated": "2025-08-11T11:37:38.757Z",
  "storageClass": "STANDARD",
  "timeStorageClassUpdated": "2025-08-11T11:37:38.757Z",
  "size": "2785",
  "md5Hash": "JdXKM1Tfab8U+07Fn3Pc7Q==",
  "mediaLink": "https://storage.googleapis.com/download/storage/v1/b/fuga-dev-rad-splits/yt_catalog/17/2025-08-15.csv?generation=1754912258743499&alt=media",
  "metadata": {
    "statement_run_title": "2025-08-15.csv",
    "statement_id": "123456",
    "date": "2025-08-11",
    "account": "main",
    "curve_client_id": "686b9369103ffbc0cb45ba29",
    "fuga_organization_id": "1078053",
    "file_format": "youtube_catalog"
  },
  "crc32c": "1wylaw==",
  "etag": "CMu5rc7Vgo8DEAE="
};

(async function runFugaYouTubeCatalogSync() {
  try {
    await fugaYouTubeCatalogSync(message);
    console.log('Completed fugaYouTubeCatalogSync');
  } catch (err) {
    console.log('Errored fugaYouTubeCatalogSync', err);
  }
})();
