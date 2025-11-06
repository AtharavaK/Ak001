const { v4: uuidv4 } = require('uuid');
const validationService = require('./validationService');

class ConversationService {
  constructor() {
    this.conversationSteps = [
      'greeting',
      'full_name',
      'email',
      'phone',
      'city_country',
      'position_applied',
      'experience_years',
      'skills',
      'expected_salary',
      'availability',
      'summary'
    ];

    this.messages = {
      greeting: 'Hello! Welcome to our recruitment process. I\'m here to help you submit your application. I\'ll collect some information from you step by step. Let\'s begin!',
      full_name: 'What is your full name?',
      email: 'What is your email address?',
      phone: 'What is your phone number?',
      city_country: 'What city and country are you currently located in?',
      position_applied: 'What position are you applying for?',
      experience_years: 'How many years of experience do you have in this field?',
      skills: 'What are your primary skills? (Please list them separated by commas)',
      expected_salary: 'What is your expected salary?',
      availability: 'When would you be available to join? (Please specify in days or weeks)',
      summary: 'Thank you! Please review your information and confirm if everything is correct.'
    };
  }

  async startConversation() {
    const sessionId = uuidv4();
    const sessionData = {
      sessionId,
      currentStep: 0,
      currentMessage: this.messages.greeting,
      progress: 0,
      applicationData: {
        application_id: uuidv4(),
        application_date: new Date().toISOString()
      },
      isComplete: false
    };

    return sessionData;
  }

  async processMessage(sessionData, userMessage) {
    let response = {
      message: '',
      sessionData: { ...sessionData },
      validation: null
    };

    const currentStepName = this.conversationSteps[sessionData.currentStep];

    // Handle greeting step - move to first question
    if (sessionData.currentStep === 0) {
      response.sessionData.currentStep = 1;
      response.message = this.messages.full_name;
      response.sessionData.progress = Math.round((1 / (this.conversationSteps.length - 1)) * 100);
      return response;
    }

    // Validate and process user input for current step
    const fieldName = currentStepName;
    const validation = validationService.validateField(fieldName, userMessage);

    if (!validation.isValid) {
      response.validation = {
        isValid: false,
        error: validation.error,
        field: fieldName
      };
      response.message = validation.error;
      return response;
    }

    // Store validated data
    let processedValue = validation.value;

    if (fieldName === 'skills') {
      // Convert comma-separated skills to array
      processedValue = userMessage.split(',').map(skill => skill.trim()).filter(skill => skill.length > 0);
    } else if (fieldName === 'experience_years') {
      // Convert to number
      processedValue = parseFloat(validation.value);
    }

    response.sessionData.applicationData[fieldName] = processedValue;
    response.validation = {
      isValid: true,
      field: fieldName
    };

    // Move to next step
    response.sessionData.currentStep++;

    // Check if conversation is complete
    if (response.sessionData.currentStep >= this.conversationSteps.length - 1) {
      response.sessionData.isComplete = true;
      response.sessionData.progress = 100;
      response.message = this.generateSummary(response.sessionData.applicationData);
    } else {
      const nextStepName = this.conversationSteps[response.sessionData.currentStep];
      response.message = this.messages[nextStepName];
      response.sessionData.progress = Math.round(
        (response.sessionData.currentStep / (this.conversationSteps.length - 1)) * 100
      );
    }

    return response;
  }

  generateSummary(applicationData) {
    const skillsList = Array.isArray(applicationData.skills)
      ? applicationData.skills.join(', ')
      : applicationData.skills;

    return `Please review your application details:

**Full Name:** ${applicationData.full_name}
**Email:** ${applicationData.email}
**Phone:** ${applicationData.phone}
**Location:** ${applicationData.city_country}
**Position:** ${applicationData.position_applied}
**Experience:** ${applicationData.experience_years} years
**Skills:** ${skillsList}
**Expected Salary:** ${applicationData.expected_salary}
**Availability:** ${applicationData.availability}

If everything looks correct, please confirm to submit your application. If you need to make changes, please let me know which field you'd like to edit.`;
  }

  async updateField(sessionData, fieldName, newValue) {
    const validation = validationService.validateField(fieldName, newValue);

    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error
      };
    }

    let processedValue = validation.value;

    if (fieldName === 'skills') {
      processedValue = newValue.split(',').map(skill => skill.trim()).filter(skill => skill.length > 0);
    } else if (fieldName === 'experience_years') {
      processedValue = parseFloat(validation.value);
    }

    sessionData.applicationData[fieldName] = processedValue;

    return {
      success: true,
      message: `${fieldName.replace('_', ' ').toUpperCase()} updated successfully.`,
      sessionData
    };
  }
}

module.exports = new ConversationService();