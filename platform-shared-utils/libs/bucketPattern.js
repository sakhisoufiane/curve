// This library provides a set of tools to add/removes documents to a model following the MongoDB bucket pattern
// https://www.mongodb.com/blog/post/building-with-patterns-the-bucket-pattern

const Bucket = this;

// default bucket size
const bucketSize = 200;

/**
 * Handles adding values to the buckets.
 * When a bucket reaches the maximum size, a new bucket is created.
 * @param {constructor} Model - The model to add to
 * @param {object} filter - Filter to run against the model to retrieve the bucket
 * @param {string} field - The array containing our values
 * @param {string} value - The value to add to the array
 */
Bucket.add = async ({ Model, filter, field, value }) => {
  // Keep original filter in case we need to create a new bucket
  const originalFilter = { ...filter };
  if (!filter?.clientId) throw Error('Client ID is required');
  // add size condition to the filter: we check the if the array has an element size-1, if so we create a new bucket
  // otherwise we continue adding more items to the existing document
  filter[`${field}.${bucketSize - 1}`] = { $exists: false };

  const bucket = await Model.findOne(filter) || new Model(originalFilter);
  // make sure the field exists, default to empty array otherwise
  bucket[field] = bucket[field] || [];

  bucket[field].push(value);

  await bucket.save();
};

module.exports = Bucket;
