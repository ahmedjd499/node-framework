
class CrudController {
  constructor(model) {
        this.model = model;

      // Bind methods
      this.create = this.create.bind(this);
      this.read = this.read.bind(this);
      this.update = this.update.bind(this);
      this.delete = this.delete.bind(this);
  }

  // Create a new instance
  async create(req, res) {
    try {
      const instance = new this.model(req.body);
      await instance.save();
      res.status(201).json(instance);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // Get all instances
  async read(req, res) {
    try {
      const instances = await this.model.find();
      res.status(200).json(instances);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // Update an instance by ID
  async update(req, res) {
    try {
      const { id } = req.params;
      const updatedInstance = await this.model.findByIdAndUpdate(id, req.body, { new: true });
      if (!updatedInstance) {
        return res.status(404).json({ message: 'Not found' });
      }
      res.status(200).json(updatedInstance);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // Delete an instance by ID
  async delete(req, res) {
    try {
      const { id } = req.params;
      const deletedInstance = await this.model.findByIdAndDelete(id);
      if (!deletedInstance) {
        return res.status(404).json({ message: 'Not found' });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}

module.exports = CrudController;
