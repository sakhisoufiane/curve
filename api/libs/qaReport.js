const mergeObjectNames = function (arrayIds, modelData) {
  const results = [];
  arrayIds.forEach((id) => {
    const obj = modelData.find((item) => item._id.toString() === id);
    results.push(obj || { _id: `${id} (Deleted)` });
  });
  return results;
};
module.exports = mergeObjectNames;

//! Grab name from delete object steps.
// pass name of patch as an argument
// concat with _patch,
// lookup table with deleted ID
// grab the delete doc in patches table
// bring back name of delete item
