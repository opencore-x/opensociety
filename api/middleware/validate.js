const Joi = require('joi');
Joi.objectid = require('joi-objectid')(Joi);

module.exports = function (joiSchema) {
  return function (req, res, next) {
    if (joiSchema === 'id') {
      joiSchema = { id: Joi.objectid() };
      const value = doValidate(res, joiSchema, req.params);
      req.params.id = value.id;
      next();
    } else {
      const value = doValidate(res, joiSchema, req.body);
      req.body = value;
      next();
    }
  };
};

function doValidate(res, joiSchema, objectToValidate) {
  const schema = Joi.object(joiSchema);
  const { value, error } = schema.validate(objectToValidate);
  if (error) return res.status(400).json({ message: error.details[0].message });
  return value;
}
