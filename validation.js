const Joi = require('joi');

// Define task schema validation
const taskValidation = (data) => {
    const schema = Joi.object({
        name: Joi.string().min(3).required(),
        completed: Joi.boolean().optional()
    });
    return schema.validate(data);
};

module.exports = taskValidation;
