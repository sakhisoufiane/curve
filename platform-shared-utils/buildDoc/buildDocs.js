// eslint-disable-next-line import/no-extraneous-dependencies
const jsdoc2md = require('jsdoc-to-markdown');
const fs = require('fs');
const appRootDir = require('app-root-dir').get();
const logger = require('../libs/logger');

function createMarkdownFiles(rootFolder) {
  /* get template data */
  const inputFiles = `${appRootDir}/${rootFolder}/**/*.js`;
  const templateData = jsdoc2md.getTemplateDataSync({ files: inputFiles });

  /* reduce templateData to an array of module names */
  const modules = templateData.map((row) => ((row.kind === 'module') ? { name: row.name, path: row.meta.path } : null)).filter((row) => row);

  /* create a documentation file for each module */
  for (const module of modules) {
    const template = `{{#module name="${module.name}"}}{{>docs}}{{/module}}`;
    // set output folder and add any subfolder paths from template data
    const outputDir = `${appRootDir}/doc${module.path.substr(module.path.lastIndexOf(`/${rootFolder}`))}`;
    // create output directory if it doesn't already exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const outputPath = `${outputDir}/${module.name}.md`;
    // console.log(`creating ${module.name}, ${outputPath}`);
    const output = jsdoc2md.renderSync({ data: templateData, template });
    fs.writeFileSync(outputPath, output);
  }
}

logger.info('--- creating jsdoc markdown files for /libs/ ---');
createMarkdownFiles('libs');
