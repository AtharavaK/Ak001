const Joi = require('joi');

class ValidationService {
  constructor() {
    this.schemas = {
      full_name: Joi.string()
        .min(2)
        .max(100)
        .pattern(/^[a-zA-Z\s\-']+$/)
        .required()
        .messages({
          'string.min': 'Name must be at least 2 characters long',
          'string.max': 'Name must not exceed 100 characters',
          'string.pattern.base': 'Name must contain only letters, spaces, hyphens, and apostrophes',
          'any.required': 'Full name is required',
          'string.empty': 'Full name is required'
        }),

      email: Joi.string()
        .email({ tlds: { allow: false } })
        .max(254)
        .required()
        .messages({
          'string.email': 'Please enter a valid email address (e.g., name@company.com)',
          'string.max': 'Email address is too long',
          'any.required': 'Email address is required',
          'string.empty': 'Email address is required'
        }),

      phone: Joi.string()
        .pattern(/^[\+]?[1-9][\d]{0,15}$/)
        .min(10)
        .max(16)
        .required()
        .messages({
          'string.pattern.base': 'Please enter a valid phone number (10-15 digits, optional + prefix)',
          'string.min': 'Phone number must be at least 10 digits',
          'string.max': 'Phone number must not exceed 15 digits',
          'any.required': 'Phone number is required',
          'string.empty': 'Phone number is required'
        }),

      city_country: Joi.string()
        .min(3)
        .max(200)
        .required()
        .messages({
          'string.min': 'Location must be at least 3 characters long',
          'string.max': 'Location must not exceed 200 characters',
          'any.required': 'City and country are required',
          'string.empty': 'City and country are required'
        }),

      position_applied: Joi.string()
        .min(1)
        .max(200)
        .required()
        .messages({
          'string.min': 'Position must be at least 1 character long',
          'string.max': 'Position must not exceed 200 characters',
          'any.required': 'Position is required',
          'string.empty': 'Position is required'
        }),

      experience_years: Joi.number()
        .min(0)
        .max(50)
        .required()
        .messages({
          'number.min': 'Experience must be at least 0 years',
          'number.max': 'Experience must not exceed 50 years',
          'number.base': 'Experience must be a number',
          'any.required': 'Years of experience is required',
          'any.empty': 'Years of experience is required'
        }),

      skills: Joi.string()
        .min(2)
        .max(500)
        .required()
        .messages({
          'string.min': 'Skills must be at least 2 characters long',
          'string.max': 'Skills list is too long (maximum 500 characters)',
          'any.required': 'At least one skill is required',
          'string.empty': 'At least one skill is required'
        }),

      expected_salary: Joi.string()
        .min(1)
        .max(100)
        .required()
        .messages({
          'string.min': 'Expected salary is required',
          'string.max': 'Salary specification is too long',
          'any.required': 'Expected salary is required',
          'string.empty': 'Expected salary is required'
        }),

      availability: Joi.string()
        .min(1)
        .max(100)
        .required()
        .messages({
          'string.min': 'Availability is required',
          'string.max': 'Availability specification is too long',
          'any.required': 'Availability is required',
          'string.empty': 'Availability is required'
        })
    };
  }

  validateField(fieldName, value) {
    const schema = this.schemas[fieldName];
    if (!schema) {
      return {
        isValid: false,
        error: `Unknown field: ${fieldName}`,
        value: null
      };
    }

    // Clean input value
    let cleanValue = typeof value === 'string' ? value.trim() : value;

    const { error, value: validatedValue } = schema.validate(cleanValue);

    if (error) {
      return {
        isValid: false,
        error: error.details[0].message,
        value: cleanValue
      };
    }

    return {
      isValid: true,
      error: null,
      value: validatedValue
    };
  }

  validateCompleteApplication(applicationData) {
    const completeSchema = Joi.object({
      application_id: Joi.string().uuid().required(),
      full_name: this.schemas.full_name,
      email: this.schemas.email,
      phone: this.schemas.phone,
      city_country: this.schemas.city_country,
      position_applied: this.schemas.position_applied,
      experience_years: this.schemas.experience_years,
      skills: Joi.alternatives().try(
        this.schemas.skills,
        Joi.array().items(Joi.string().min(2).max(50)).min(1).max(10)
      ),
      expected_salary: this.schemas.expected_salary,
      availability: this.schemas.availability,
      application_date: Joi.date().iso().optional()
    });

    const { error, value } = completeSchema.validate(applicationData);

    if (error) {
      return {
        isValid: false,
        error: error.details[0].message,
        field: error.details[0].path[0]
      };
    }

    return {
      isValid: true,
      error: null,
      value
    };
  }

  sanitizeInput(input) {
    if (typeof input !== 'string') {
      return input;
    }

    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential XSS characters
      .replace(/javascript:/gi, '') // Remove javascript protocol
      .replace(/on\w+=/gi, ''); // Remove event handlers
  }

  validateSkillsList(skillsString) {
    const skills = skillsString
      .split(',')
      .map(skill => skill.trim())
      .filter(skill => skill.length > 0);

    if (skills.length === 0) {
      return {
        isValid: false,
        error: 'At least one skill is required',
        value: []
      };
    }

    if (skills.length > 10) {
      return {
        isValid: false,
        error: 'Please list a maximum of 10 skills',
        value: []
      };
    }

    for (const skill of skills) {
      if (skill.length < 2) {
        return {
          isValid: false,
          error: 'Each skill must be at least 2 characters long',
          value: []
        };
      }
      if (skill.length > 50) {
        return {
          isValid: false,
          error: 'Each skill must not exceed 50 characters',
          value: []
        };
      }
    }

    return {
      isValid: true,
      error: null,
      value: skills
    };
  }
}

module.exports = new ValidationService();