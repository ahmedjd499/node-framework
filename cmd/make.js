#!/usr/bin/env node

const { program } = require('commander');
const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');

// Utility function to check if a file exists
const fileExists = (filePath) => fs.existsSync(filePath);

// Function to create a model
async function createModel(entityName, fields) {
  const modelName = `${entityName}Model`;
  const entityPath = path.join('src', 'entities', `${entityName}.js`);

  if (!fileExists(entityPath)) {
    console.log(`Entity ${entityName} does not exist. Please create it first.`);
    return;
  }

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

    return `  ${field.name}: { type: ${mongooseType}, required: true },`;
  }).join('\n');

  const modelTemplate = `
const mongoose = require('mongoose');

const ${modelName}Schema = new mongoose.Schema({
${mongooseFields}
});

module.exports = mongoose.model('${modelName}', ${modelName}Schema);
`;

  fs.writeFileSync(`./src/models/${modelName}.js`, modelTemplate.trim());
  console.log(`Model ${modelName} created with fields: ${fields.map(f => f.name).join(', ')}`);
}

// Function to create an entity with fields
async function createEntity(entityName) {


  // Prompt for fields
  const fields = [];
  let addMoreFields = true;

  while (addMoreFields) {
    const { fieldName, fieldType } = await inquirer.prompt([
      {
        type: 'input',
        name: 'fieldName',
        message: 'Enter field name:',
        validate: (input) => input ? true : 'Field name cannot be empty!',
      },
      {
        type: 'list',
        name: 'fieldType',
        message: 'Select field type:',
        choices: ['string', 'number', 'boolean', 'date', 'text'],
      }
    ]);
    fields.push({ name: fieldName, type: fieldType });

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

  const entityTemplate = `class ${entityName} {\n  constructor() {\n${fields.map(field => `    this.${field.name} = null; // ${field.type}`).join('\n')}\n  }\n}\n\nmodule.exports = ${entityName};`;

  fs.writeFileSync(`./src/entities/${entityName}.js`, entityTemplate.trim());
  console.log(`${entityName} entity created.`);

  // Automatically create model
  await createModel(entityName, fields);

  // Ask if user wants to create a controller
  const { createControllerAnswer } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'createControllerAnswer',
      message: `Do you want to create a controller for ${entityName}?`,
      default: true,
    }
  ]);

  if (createControllerAnswer) {
    await createController(entityName);
  }
}

// Function to create a controller with CRUD methods
async function createController(entityName) {
  const controllerName = `${entityName}Controller`;
  const modelName = `${entityName}Model`;


  const controllerTemplate = `
const ${modelName} = require('../models/${modelName}');
const connectDB = require('../configs/database');

class ${controllerName} {
  static async create(req, res) {
    try {
      await connectDB();
      const instance = new ${modelName}(req.body);
      await instance.save();
      res.status(201).json(instance);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  static async read(req, res) {
    try {
      await connectDB();
      const instances = await ${modelName}.find();
      res.status(200).json(instances);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  static async update(req, res) {
    try {
      await connectDB();
      const { id } = req.params;
      const updatedInstance = await ${modelName}.findByIdAndUpdate(id, req.body, { new: true });
      if (!updatedInstance) {
        return res.status(404).json({ message: 'Not found' });
      }
      res.status(200).json(updatedInstance);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  static async delete(req, res) {
    try {
      await connectDB();
      const { id } = req.params;
      const deletedInstance = await ${modelName}.findByIdAndDelete(id);
      if (!deletedInstance) {
        return res.status(404).json({ message: 'Not found' });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}

module.exports = ${controllerName};
`;

  fs.writeFileSync(`./src/controllers/${controllerName}.js`, controllerTemplate.trim());
  console.log(`${controllerName} controller created for model ${modelName}`);

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
    await createRoutes(entityName);
  }
}

// Function to create routes for a controller
async function createRoutes(entityName) {
  const routeName = `${entityName}Routes`;
  const controllerName = `${entityName}Controller`;

  const routeTemplate = `
const express = require('express');
const ${controllerName} = require('../controllers/${controllerName}');

const router = express.Router();

// Define the routes for the ${entityName} resource
router.post('/create', ${controllerName}.create); // Create a new ${entityName}
router.get('/get', ${controllerName}.read); // Get all ${entityName}s
router.put('/edit/:id', ${controllerName}.update); // Update a ${entityName} by ID
router.delete('/delete/:id', ${controllerName}.delete); // Delete a ${entityName} by ID

module.exports = router;
`;

  fs.writeFileSync(`src/routes/${routeName}.js`, routeTemplate.trim());
  console.log(`${routeName} routes created for controller ${controllerName}`);

  // Update the index file to include the new routes
  await updateIndexFile(routeName);
}

// Function to update the index.js to include routes
async function updateIndexFile(routeName) {
  const indexPath = path.join('src', 'index.js');
  let indexFile = fs.readFileSync(indexPath, 'utf-8');

  const importStatement = `const ${routeName} = require('./routes/${routeName}');\n`;
  if (!indexFile.includes(importStatement)) {
    indexFile = importStatement + indexFile; // Add import at the top
  }

  const useStatement = `app.use('/api/${routeName.replace('Routes', '').toLowerCase()}', ${routeName});\n`;
  const serverStartIndex = indexFile.indexOf('app.listen');
  if (serverStartIndex !== -1 && !indexFile.includes(useStatement)) {
    indexFile = indexFile.slice(0, serverStartIndex) + useStatement + indexFile.slice(serverStartIndex); // Add use statement before server start
  }

  fs.writeFileSync(indexPath, indexFile);
  console.log(`Updated index.js to include ${routeName} routes`);
}

// Function to create a migration
async function createMigration() {
  // Migration creation logic here...
  console.log('Migration creation logic is not implemented yet.');
}

// Function to create CRUD operations
async function createCrud(entityName) {
  const modelName = `${entityName}Model`;
  const controllerName = `${entityName}Controller`;
  const routeName = `${entityName}Routes`;

  if (!fileExists(`./src/entities/${entityName}.js`)) {
    console.log(`Entity ${entityName} does not exist. Creating it now.`);
    await createEntity(entityName);
  }

  if (!fileExists(`./src/models/${modelName}.js`)) {
    console.log(`Model ${modelName} does not exist. Creating it now.`);
    await createModel(entityName);
  }

  if (!fileExists(`./src/controllers/${controllerName}.js`)) {
    console.log(`Controller ${controllerName} does not exist. Creating it now.`);
    await createController(entityName);
  }

  if (!fileExists(`./src/routes/${routeName}.js`)) {
    console.log(`Routes ${routeName} do not exist. Creating it now.`);
    await createRoutes(entityName);
  }
}

// Command definitions
program
  .command('entity')
  .description('Create a new entity')
  .action(async () => {
    const { entityName } = await inquirer.prompt([
      {
        type: 'input',
        name: 'entityName',
        message: 'Enter entity name:',
        validate: (input) => input ? true : 'Entity name cannot be empty!',
      }
    ]);
    await createEntity(entityName);
  });
program
  .command('controller')
  .description('Create a new controller')
  .action(async () => {
    const { entityName } = await inquirer.prompt([
      {
        type: 'input',
        name: 'entityName',
        message: 'Enter entity name:',
        validate: (input) => input ? true : 'Entity name cannot be empty!',
      }
    ]);
    await createController(entityName);
  });
program
  .command('routes')
  .description('Create a new routes file')
  .action(async () => {
    const { entityName } = await inquirer.prompt([
      {
        type: 'input',
        name: 'entityName',
        message: 'Enter entity name:',
        validate: (input) => input ? true : 'Entity name cannot be empty!',
      }
    ]);
    await createRoutes(entityName);
  });
program
  .command('migration')
  .description('Create a new migration file')
  .action(createMigration);

program
  .command('crud <entityName>')
  .description('Create CRUD operations for an entity')
  .action(createCrud);

// Parse commands
program.parse(process.argv);
