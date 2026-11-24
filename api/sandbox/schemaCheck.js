/* eslint-disable no-await-in-loop */
const appRootDir = require('app-root-dir').get();
const fs = require('fs');
const _ = require('lodash');

const apiModelPath = `${appRootDir}/models/`;
const processorModelPath = `${appRootDir}/../processor/models/`;
const coreModelPath = `${appRootDir}/../core/packages/models/src/`;

async function main() {
  const apiModelDir = fs.readdirSync(apiModelPath).map((m) => m.replace('.js', ''));
  const processorModelDir = fs.readdirSync(processorModelPath).map((m) => m.replace('.js', ''));
  const coreModelDir = fs.readdirSync(coreModelPath)
    .map((m) => m.replace('.ts', ''))
    .filter((m) => !['index', 'mongoose'].includes(m));

  const uniqueModels = [...new Set([...apiModelDir, ...processorModelDir])];

  const extraCoreModels = _.difference(coreModelDir, uniqueModels);
  const extraUniqueModels = _.difference(uniqueModels, coreModelDir);

  console.log('API + Processor models:', uniqueModels.length);
  console.log('Core models:', coreModelDir.length);

  for (const modelFile of apiModelDir.filter((m) => m === 'client')) {
    console.log('Finding schemas in:', modelFile);

    const file = fs.readFileSync(`${apiModelPath}/${modelFile}.js`).toString('utf8');
    const schemas = extractSchemaDefinitions(file);
    const names = extractSchemaVariableNames(schemas);

    for (const schemaName of names) {
      console.log('Checking schema:', schemaName);
      const coreFilePath = schemaName.includes('Schema') && !schemaName.includes(modelFile)
        ? `${coreModelPath}${schemaName}.ts`
        : `${coreModelPath}${schemaName.replace('Schema', '')}.ts`;

      const coreFile = fs.readFileSync(coreFilePath).toString('utf8');
      console.log(coreFile);
    }
  }
}

function extractSchemaDefinitions(code) {
  const schemaDefinitions = [];
  const schemaRegex = /const\s+(\w+Schema)\s*=\s*new\s+Schema\(([\s\S]*?)\);\n/g;
  let match;
  while ((match = schemaRegex.exec(code)) !== null) {
    schemaDefinitions.push(match[0]);
  }
  return schemaDefinitions;
}

function extractSchemaVariableNames(schemaStrings) {
  return schemaStrings.map((schema) => {
    // Regular expression to extract the variable name before `= new Schema`
    const varNameRegex = /const\s+(\w+Schema)\s*=\s*new\s+Schema/;
    const match = schema.match(varNameRegex);
    return match ? match[1] : null; // Return the variable name
  }).filter(Boolean); // Filter out any nulls in case of non-matching strings
}

main();
