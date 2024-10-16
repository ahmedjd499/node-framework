#!/usr/bin/env node

const { program } = require('commander');
const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');

// Utility function to check if a file exists
const fileExists = (filePath) => fs.existsSync(filePath);

// Function to create a model
async function createModel(modelName, fields, addTimestamps) {
  const mongooseFields = fields.map(field => {
    let mongooseType;

    switch (field.type) {
      case 'string':
        mongooseType = 'String';
        break;
      case 'number':
        mongooseType = 'Number';
        break;
      case 'boolean':
        mongooseType = 'Boolean';
        break;
      case 'date':
        mongooseType = 'Date';
        break;
      case 'text':
        mongooseType = 'String';
        break;
      default:
        mongooseType = 'String';
        break;
    }

    return `  ${field.name}: { type: ${mongooseType}, required: ${field.required} },`;
  }).join('\n');

  const timestampsOption = addTimestamps ? `, { timestamps: true }` : '';

  const modelTemplate = `
const mongoose = require('mongoose');

const ${modelName}Schema = new mongoose.Schema({
${mongooseFields}
}${timestampsOption});

module.exports = mongoose.model('${modelName}', ${modelName}Schema);
`;

  fs.writeFileSync(`./src/models/${modelName}.js`, modelTemplate.trim());
  console.log(`Model ${modelName} created with fields: ${fields.map(f => f.name).join(', ')}`);

  // Ask if the user wants to create a controller
  const { createControllerAnswer } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'createControllerAnswer',
      message: `Do you want to create a controller for ${modelName}?`,
      default: true,
    }
  ]);

  if (createControllerAnswer) {
    await createController(modelName);
  }
}

// Function to create a controller with CRUD methods
async function createController(modelName) {
  const controllerName = `${modelName}Controller`;


  const controllerTemplate = `
const CrudController = require('./CrudController');
const mongooseModel = require('../models/${modelName}');

class ${controllerName} extends CrudController {
  constructor() {
    super(mongooseModel); // Pass the model to the parent CrudController
  }

  // Uncomment and override this method if you need custom create behavior
  // async create(req, res) {
  //   // Custom create logic here
  //   super.create(req, res); // Call the parent class method if needed
  // }

  // Uncomment and override this method if you need custom read behavior
  // async read(req, res) {
  //   // Custom read logic here
  //   super.read(req, res); // Call the parent class method if needed
  // }

  // Uncomment and override this method if you need custom update behavior
  // async update(req, res) {
  //   // Custom update logic here
  //   super.update(req, res); // Call the parent class method if needed
  // }

  // Uncomment and override this method if you need custom delete behavior
  // async delete(req, res) {
  //   // Custom delete logic here
  //   super.delete(req, res); // Call the parent class method if needed
  // }
}

module.exports = new ${controllerName}();
`;

  fs.writeFileSync(`./src/controllers/${controllerName}.js`, controllerTemplate.trim());
  console.log(`${controllerName} created, extending the global CRUD controller.`);

  // Ask if the user wants to create routes
  const { createRoutesAnswer } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'createRoutesAnswer',
      message: `Do you want to create routes for ${controllerName}?`,
      default: true,
    }
  ]);

  if (createRoutesAnswer) {
    await createRoutes(modelName);
  }
}

// Function to create routes for a controller
async function createRoutes(modelName) {
  const routeName = `${modelName}Routes`;
  const controllerName = `${modelName}Controller`;

  const routeTemplate = `
const express = require('express');
const ${controllerName} = require('../controllers/${controllerName}');

const router = express.Router();

// Define the routes for the ${modelName} resource
router.post('/create', ${controllerName}.create); // Create a new ${modelName}
router.get('/get', ${controllerName}.read); // Get all ${modelName}s
router.put('/edit/:id', ${controllerName}.update); // Update a ${modelName} by ID
router.delete('/delete/:id', ${controllerName}.delete); // Delete a ${modelName} by ID

module.exports = router;
`;

  fs.writeFileSync(`src/routes/${routeName}.js`, routeTemplate.trim());
  console.log(`${routeName} routes created for controller ${controllerName}`);

  // Add the new route to index.js
  await updateIndexFile(routeName, modelName);
}

// Function to update the index.js to include routes
async function updateIndexFile(routeName, modelName) {
  const indexPath = path.join('src', 'index.js');
  let indexFile = fs.readFileSync(indexPath, 'utf-8');

  const importStatement = `const ${routeName} = require('./routes/${routeName}');\n`;
  if (!indexFile.includes(importStatement)) {
    indexFile = indexFile.replace('//routes importes', `//routes importes\n${importStatement}`);
  }

  const useStatement = `app.use('/api/${modelName.toLowerCase()}', ${routeName});\n`;
  if (!indexFile.includes(useStatement)) {
    indexFile = indexFile.replace('// Use the  routes', `// Use the  routes\n${useStatement}`);
  }

  fs.writeFileSync(indexPath, indexFile);
  console.log(`Updated index.js to include ${routeName} routes`);
}

// Function to create a model directly
async function createModelDirectly() {
  const { modelName } = await inquirer.prompt([
    {
      type: 'input',
      name: 'modelName',
      message: 'Enter model name:',
      validate: (input) => input ? true : 'Model name cannot be empty!',
    }
  ]);

  // Prompt for fields
  const fields = [];
  let addMoreFields = true;

  while (addMoreFields) {
    const { fieldName, fieldType, fieldRequired } = await inquirer.prompt([
      {
        type: 'input',
        name: 'fieldName',
        message: '  Enter field name:',
        validate: (input) => input ? true : 'Field name cannot be empty!',
      },
      {
        type: 'list',
        name: 'fieldType',
        message: '  Select field type:',
        choices: ['string', 'number', 'boolean', 'date', 'text'],
      },
      {
        type: 'confirm',
        name: 'fieldRequired',
        message: '  Is the field required?',
        default: true,
      }
    ]);
    fields.push({ name: fieldName, type: fieldType, required: fieldRequired });

    const { addAnotherField } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'addAnotherField',
        message: 'Do you want to add another field?',
        default: true,
      }
    ]);

    addMoreFields = addAnotherField;
  }

  // Prompt for timestamps
  const { addTimestamps } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'addTimestamps',
      message: 'Do you want to add timestamps?',
      default: true,
    }
  ]);

  await createModel(modelName, fields, addTimestamps);
}

// Command to create model directly
program
  .command('model')
  .description('Create a new model')
  .action(createModelDirectly);

// Command to create CRUD operations
program
  .command('crud')
  .description('Create CRUD operations for a model')
  .action(createModelDirectly);

// Parse commands
program.parse(process.argv);
