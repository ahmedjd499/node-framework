#!/usr/bin/env node

const { program } = require("commander");
const inquirer = require("inquirer");
const fs = require("fs");
const path = require("path");

// Utility function to check if a file exists
const fileExists = (filePath) => fs.existsSync(filePath);

// Function to create a model
async function createModel(modelName, fields, addTimestamps) {
  const mongooseFields = fields
    .map((field) => {
      let mongooseType;

      switch (field.type) {
        case "string":
          mongooseType = "String";
          break;
        case "number":
          mongooseType = "Number";
          break;
        case "boolean":
          mongooseType = "Boolean";
          break;
        case "date":
          mongooseType = "Date";
          break;
        case "text":
          mongooseType = "String";
          break;
        default:
          mongooseType = "String";
          break;
      }

      return `  ${field.name}: { type: ${mongooseType}, required: ${field.required} },`;
    })
    .join("\n");

  const timestampsOption = addTimestamps ? `, { timestamps: true }` : "";

  const modelTemplate = `
const mongoose = require('mongoose');

const ${modelName}Schema = new mongoose.Schema({
${mongooseFields}
}${timestampsOption});

module.exports = mongoose.model('${modelName}', ${modelName}Schema);
`;

  fs.writeFileSync(`src/models/${modelName}.js`, modelTemplate.trim());
  console.log(
    `Model ${modelName} created with fields: ${fields
      .map((f) => f.name)
      .join(", ")}`
  );

  // Ask if the user wants to create a controller
  const { createControllerAnswer } = await inquirer.prompt([
    {
      type: "confirm",
      name: "createControllerAnswer",
      message: `Do you want to create a controller for ${modelName}?`,
      default: true,
    },
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

  fs.writeFileSync(
    `src/controllers/${controllerName}.js`,
    controllerTemplate.trim()
  );
  console.log(
    `${controllerName} created, extending the global CRUD controller.`
  );

  // Ask if the user wants to create routes
  const { createRoutesAnswer } = await inquirer.prompt([
    {
      type: "confirm",
      name: "createRoutesAnswer",
      message: `Do you want to create routes for ${controllerName}?`,
      default: true,
    },
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
  await updateIndexFile(routeName, 'api/'+modelName);
}

async function updateIndexFile(routeName, modelName) {
  const indexPath = path.join('src', 'index.js');
  let indexFile = fs.readFileSync(indexPath, 'utf-8');

  const importStatement = `const ${routeName} = require('./routes/${routeName}');\n`;
  const useStatement = `app.use('/${modelName}', ${routeName});\n`;

  // Check if the import statement already exists
  if (!indexFile.includes(importStatement)) {
    indexFile = indexFile.replace('//routes importes', `//routes importes\n${importStatement}`);
    console.log(`Added import for ${routeName}`);
  } else {
    console.log(`Import for ${routeName} already exists.`);
  }

  // Check if the app.use statement already exists
  if (!indexFile.includes(useStatement)) {
    indexFile = indexFile.replace('// Use the  routes', `// Use the  routes\n${useStatement}`);
    console.log(`Added app.use for ${modelName}`);
  } else {
    console.log(`app.use for ${modelName} already exists.`);
  }

  // Write back to index.js
  fs.writeFileSync(indexPath, indexFile);
  console.log(`Updated index.js for ${routeName}`);
}



// Function to create a model directly
async function createModelDirectly() {
  const { modelName } = await inquirer.prompt([
    {
      type: "input",
      name: "modelName",
      message: "Enter model name:",
      validate: (input) => (input ? true : "Model name cannot be empty!"),
    },
  ]);

  // Prompt for fields
  const fields = [];
  let addMoreFields = true;

  while (addMoreFields) {
    const { fieldName, fieldType, fieldRequired } = await inquirer.prompt([
      {
        type: "input",
        name: "fieldName",
        message: "  Enter field name:",
        validate: (input) => (input ? true : "Field name cannot be empty!"),
      },
      {
        type: "list",
        name: "fieldType",
        message: "  Select field type:",
        choices: ["string", "number", "boolean", "date", "text"],
      },
      {
        type: "confirm",
        name: "fieldRequired",
        message: "  Is the field required?",
        default: true,
      },
    ]);
    fields.push({ name: fieldName, type: fieldType, required: fieldRequired });

    const { addAnotherField } = await inquirer.prompt([
      {
        type: "confirm",
        name: "addAnotherField",
        message: "Do you want to add another field?",
        default: true,
      },
    ]);

    addMoreFields = addAnotherField;
  }

  // Prompt for timestamps
  const { addTimestamps } = await inquirer.prompt([
    {
      type: "confirm",
      name: "addTimestamps",
      message: "Do you want to add timestamps?",
      default: true,
    },
  ]);

  await createModel(modelName, fields, addTimestamps);
}

// Function to determine the input type based on Mongoose field instance
function getInputType(instance) {
  switch (instance) {
    case "String":
      return "text";
    case "Number":
      return "number";
    case "Date":
      return "date";
    case "Boolean":
      return "checkbox";
    case "Array":
      return "array"; // Handle arrays separately
    default:
      return "text";
  }
}


// Recursively generate form fields for complex objects or nested schemas
function generateFormFields(attributes, parent = "") {
  return attributes
    .map((attr) => {
      const fullName = parent ? `${parent}.${attr.name}` : attr.name;

      if (attr.schema) {
        // Handle nested schema or subdocuments
        return `
        <fieldset>
          <legend>${attr.name}</legend>
          ${generateFormFields(Object.keys(attr.schema.paths)
            .filter(key => !["id", "_id", "__v"].includes(key))
            .map((key) => {
              const schemaType = attr.schema.paths[key];
              return {
                name: key,
                type: getInputType(schemaType.instance),
                schema: schemaType.schema, // Include nested schemas
                required: schemaType.isRequired || false,
              };
            }), fullName)}
        </fieldset>
        `;
      }

      if (attr.type === "array") {
        // Handle arrays, support for array of strings, numbers, or even objects
        return `
        <div class="form-group">
          <label for="${fullName}">${attr.name} (multiple):</label>
          <input class="form-control" type="text" name="${fullName}[]" placeholder="Enter multiple ${attr.name}" />
        </div>
      `;
      }

      // Regular fields
      return `
      <div class="form-group">
        <label for="${fullName}">${attr.name}:</label>
        <input class="form-control" type="${attr.type}" name="${fullName}" placeholder="${attr.name}" ${attr.required ? "required" : ""} />
      </div>
      `;
    })
    .join("\n");
}
// Function to create views for CRUD operations
// Function to create views for CRUD operations
async function createViews(modelName) {
  const mongooseModel = require(`../src/models/${modelName.toLowerCase()}`); // Adjust the model path
  const viewsDir = path.join("src", "views");
  const filePath = path.join(viewsDir, `${modelName}.html`);

  // Check if the views directory exists, create it if not
  if (!fs.existsSync(viewsDir)) {
    fs.mkdirSync(viewsDir);
  }

  // Extract attributes from the model schema, excluding '_id', 'createdAt', 'updatedAt', '__v'
  const attributes = Object.keys(mongooseModel.schema.paths)
    .filter((key) => !["_id", "createdAt", "updatedAt", "__v"].includes(key)) // Exclude keys
    .map((key) => {
      const schemaType = mongooseModel.schema.paths[key];
      return {
        name: key,
        type: getInputType(schemaType.instance), // Map Mongoose type to HTML input type
        schema: schemaType.schema || null, // Pass nested schema if available
        required: schemaType.isRequired || false, // Check if the field is required
      };
    });

  // Generate form fields based on model attributes, including nested objects
  const formFields = generateFormFields(attributes);

  // Build the complete HTML form structure
  const formHTML = `
      ${formFields}
  `;
  // Define the view template with Bootstrap and DataTables
  const viewTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${modelName} CRUD</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.datatables.net/1.11.5/css/jquery.dataTables.min.css" rel="stylesheet">
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.datatables.net/1.11.5/js/jquery.dataTables.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        $(document).ready(function() {
            $('#data-table').DataTable();
            fetchData();
        });

        async function fetchData() {
            const response = await fetch('/api/${modelName}/get');
            const data = await response.json();
            const tableBody = document.getElementById('data-body');
            tableBody.innerHTML = ''; // Clear existing data
            var i=1 ;
            data.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = \`
                    <td>\${i}</td>
                    ${attributes
                      .map((attr) => `<td>\${item.${attr.name}}</td>`)
                      .join("")}
                    <td>
                        <button class="btn btn-primary" onclick="editItem('\${item._id}')">Edit</button>
                        <button class="btn btn-danger" onclick="deleteItem('\${item._id}')">Delete</button>
                    </td>
                \`;
                tableBody.appendChild(row);
                i=i+1;
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
                $('#createModal').modal('hide');
                document.getElementById('createForm').reset();
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

        function editItem(id) {
            // Add your edit item logic here (you can open a modal and populate the form)
            alert('Edit functionality not implemented yet');
        }
    </script>
</head>
<body class="container">
    <h1 class="my-4">${modelName} CRUD Operations</h1>

    <button class="btn btn-success mb-4" data-bs-toggle="modal" data-bs-target="#createModal">Create New ${modelName}</button>

    <table id="data-table" class="table table-striped table-bordered">
        <thead>
            <tr>
                <th>ID</th>
                ${attributes.map((attr) => `<th>${attr.name}</th>`).join("")}
                <th width='15%'>Actions</th>
            </tr>
        </thead>
        <tbody id="data-body"></tbody>
    </table>

    <!-- Modal for creating new ${modelName} -->
    <div class="modal fade" id="createModal" tabindex="-1" aria-labelledby="createModalLabel" aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="createModalLabel">Create New ${modelName}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <form onsubmit="createItem(event)" id='createForm'>
                    <div class="modal-body">
                        ${formFields} <!-- Insert dynamically generated form fields here -->
                    </div>
                    <div class="modal-footer">
                        <button type="submit" class="btn btn-primary">Create</button>
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</body>
</html>
`;

  // Write the view template to an HTML file
  fs.writeFileSync(filePath, viewTemplate.trim());
  console.log(`${modelName} view created at ${filePath}`);

  await createViewsRouters(modelName);
}

// Function to create view routes and add them to index.js
async function createViewsRouters(modelName) {
  const routesDir = path.join("src", "routes"); // Directory to store routes
  const routeFilePath = path.join(routesDir, `${modelName}ViewRoutes.js`); // Define the path for the routes file

  // Check if the routes directory exists, create it if not
  if (!fs.existsSync(routesDir)) {
    fs.mkdirSync(routesDir);
  }

  // Generate the view route template
  const viewRouteTemplate = `
const express = require('express');
const path = require('path');
const router = express.Router();

// Serve the ${modelName} view
router.get('/page', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../views/${modelName}.html'));
});

module.exports = router;
`;

  // Write the view route to a file
  fs.writeFileSync(routeFilePath, viewRouteTemplate.trim());
  console.log(`${modelName} view route created at ${routeFilePath}`);

  // Update the index.js file to include the route
  await updateIndexFile(`${modelName}ViewRoutes`, modelName);
}



// Command to create model directly
program
  .command("model")
  .description("Create a new model")
  .action(createModelDirectly);

// Command to create CRUD operations
program
  .command("crud")
  .description("Create CRUD operations for a model")
  .action(createModelDirectly);

// Command to create views
program
  .command("views")
  .description("Create a view for CRUD operations for a model")
  .action(async () => {
    const { modelName } = await inquirer.prompt([
      {
        type: "input",
        name: "modelName",
        message: "Enter model name for CRUD view:",
        validate: (input) => (input ? true : "Model name cannot be empty!"),
      },
    ]);
    await createViews(modelName);
  });


  program
  .command("routes")
  .description("Create a view for CRUD operations for a model")
  .action(async () => {
    const { modelName } = await inquirer.prompt([
      {
        type: "input",
        name: "modelName",
        message: "Enter model name :",
        validate: (input) => (input ? true : "Model name cannot be empty!"),
      },
    ]);
    await createRoutes(modelName);
  });

program
  .command("views-routers")
  .description("Create routes for serving CRUD views and add them to index.js")
  .action(async () => {
    const { modelName } = await inquirer.prompt([
      {
        type: "input",
        name: "modelName",
        message: "Enter model name for CRUD view route:",
        validate: (input) => (input ? true : "Model name cannot be empty!"),
      },
    ]);
    await createViewsRouters(modelName);
  });
// Parse commands
program.parse(process.argv);
