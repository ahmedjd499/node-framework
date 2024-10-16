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


async function createViews(modelName) {
  // Import the model to extract its schema
  const mongooseModel = require(`../src/models/${modelName.toLowerCase()}`); // Adjust path as needed
  const viewsDir = path.join('src', 'views'); // Directory to store views
  const filePath = path.join(viewsDir, `${modelName}.html`); // Define the path for the HTML file

  // Check if the views directory exists, create it if not
  if (!fs.existsSync(viewsDir)) {
    fs.mkdirSync(viewsDir);
  }

  // Extract attributes from the model schema
  const attributes = Object.keys(mongooseModel.schema.paths)
    .filter(key => !key.startsWith('_')) // Ignore internal properties
    .map(key => ({ name: key }));

  // Generate form fields based on model attributes
  const formFields = attributes.map(attr => {
    if(attr.name in ['createdAt', 'updatedAt']) return ``;
    return `
      <label for="${attr.name}">${attr.name}:</label>
      <input type="text" name="${attr.name}" placeholder="${attr.name}" required />
    `;
  }).join('\n');

  // Define the view template
  const viewTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${modelName} CRUD</title>
    <script>
        async function fetchData() {
            const response = await fetch('/api/${modelName}/get');
            const data = await response.json();
            const list = document.getElementById('data-list');
            list.innerHTML = ''; // Clear existing data
            data.forEach(item => {
                const li = document.createElement('li');
                li.textContent = JSON.stringify(item); // Display item data
                list.appendChild(li);
            });
        }

        async function createItem(event) {
            event.preventDefault();
            const formData = new FormData(event.target);
            const response = await fetch('/api/${modelName}/create', {
                method: 'POST',
                body: JSON.stringify(Object.fromEntries(formData)),
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (response.ok) {
                fetchData(); // Refresh data after creating
            }
        }

        async function deleteItem(id) {
            const response = await fetch('/api/${modelName}/delete/' + id, {
                method: 'DELETE'
            });
            if (response.ok) {
                fetchData(); // Refresh data after deletion
            }
        }
    </script>
</head>
<body onload="fetchData()">
    <h1>${modelName} CRUD Operations</h1>

    <form onsubmit="createItem(event)">
        ${formFields} <!-- Insert dynamically generated form fields here -->
        <button type="submit">Create</button>
    </form>

    <ul id="data-list"></ul>
</body>
</html>
`;

  // Write the view template to an HTML file
  fs.writeFileSync(filePath, viewTemplate.trim());
  console.log(`${modelName} view created at ${filePath}`);
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

// Command to create views
program
  .command('views')
  .description('Create a view for CRUD operations for a model')
  .action(async () => {
    const { modelName } = await inquirer.prompt([
      {
        type: 'input',
        name: 'modelName',
        message: 'Enter model name for CRUD view:',
        validate: (input) => input ? true : 'Model name cannot be empty!',
      }
    ]);
    await createViews(modelName);
  });


// Parse commands
program.parse(process.argv);
