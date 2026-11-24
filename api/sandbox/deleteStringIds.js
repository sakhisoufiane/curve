require("../models/db");

const deleteStringId = async ({ model }) => {
  const Model = require(`../models/${model}`)

  const result = await Model.deleteMany({ _id: { $type: "string" } });
  console.log(result);
}

// Use nodemon and type in the model you want to clear down as a string e.g. 'work' not 'Work'
deleteStringId({ model: 'work' }).then(() => {
  console.log('Complete');
  process.exit();
}).catch((err) => {
  console.error(err);
  process.exit();
});
