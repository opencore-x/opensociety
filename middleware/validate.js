const Joi = require('joi');
Joi.objectid = require('joi-objectid')(Joi);

module.exports = function (joiSchema) {
  return function (req, res, next) {
    if (joiSchema === 'id') {
      joiSchema = { id: Joi.objectid() };
      const value = doValidate(joiSchema, req.params);
      req.params.id = value.id;
      next();
    } else {
      const value = doValidate(joiSchema, req.params);
      req.body = value;
      next();
    }
  };
};

function doValidate(joiSchema, objectToValidate) {
  const schema = Joi.object(joiSchema);
  const { value, error } = schema.validate(objectToValidate);
  if (error) return res.status(400).json({ message: error.details[0].message });
  return value;
}

//   module.exports = function (joiSchema) {
//     return function (req, res, next) {
//       if (joiSchema === 'id') {
//         joiSchema = { id: Joi.objectid() };
//         const schema = Joi.object(joiSchema);
//         const { value, error } = schema.validate(req.params);
//         if (error) return res.status(400).json({ message: error.details[0].message });
//         req.params.id = value.id;
//         next();
//       } else {
//         const schema = Joi.object(joiSchema);
//         const { value, error } = schema.validate(req.body);
//         if (error) return res.status(400).json({ message: error.details[0].message });
//         req.body = value;
//         next();
//       }
//     };
//   };
