const express = require('express');
const router = express.Router();
const conversationService = require('../services/conversationService');
const databaseService = require('../services/databaseService');
const validationService = require('../services/validationService');

// Start a new conversation
router.post('/start', async (req, res) => {
  try {
    const sessionData = await conversationService.startConversation();

    res.json({
      success: true,
      data: {
        sessionId: sessionData.sessionId,
        message: sessionData.currentMessage,
        step: sessionData.currentStep,
        progress: sessionData.progress
      }
    });
  } catch (error) {
    console.error('Error starting conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start conversation. Please try again.'
    });
  }
});

// Process user message in conversation
router.post('/message', async (req, res) => {
  try {
    const { sessionId, message, step } = req.body;

    if (!sessionId || !message) {
      return res.status(400).json({
        success: false,
        error: 'Session ID and message are required'
      });
    }

    // Reconstruct session data (in a real app, this would be stored in Redis or database)
    const sessionData = {
      sessionId,
      currentStep: step || 1,
      applicationData: req.body.applicationData || {}
    };

    const response = await conversationService.processMessage(sessionData, message);

    res.json({
      success: true,
      data: {
        message: response.message,
        step: response.sessionData.currentStep,
        progress: response.sessionData.progress,
        validation: response.validation,
        applicationData: response.sessionData.applicationData,
        isComplete: response.sessionData.isComplete
      }
    });
  } catch (error) {
    console.error('Error processing message:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred processing your message. Please try again.'
    });
  }
});

// Submit completed application
router.post('/submit', async (req, res) => {
  try {
    const { applicationData } = req.body;

    if (!applicationData) {
      return res.status(400).json({
        success: false,
        error: 'Application data is required'
      });
    }

    // Validate complete application
    const validation = validationService.validateCompleteApplication(applicationData);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: validation.error,
        field: validation.field
      });
    }

    // Save to database
    const result = await databaseService.saveApplication(applicationData);

    if (result.success) {
      res.json({
        success: true,
        data: {
          message: 'Your information has been successfully recorded. Thank you for applying!',
          applicationId: result.applicationId,
          databaseId: result.databaseId
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error submitting application:', error);
    res.status(500).json({
      success: false,
      error: 'We encountered an issue saving your data. Please try again.'
    });
  }
});

// Validate a single field
router.post('/validate', async (req, res) => {
  try {
    const { fieldName, value } = req.body;

    if (!fieldName || value === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Field name and value are required'
      });
    }

    const validation = validationService.validateField(fieldName, value);

    res.json({
      success: true,
      data: {
        isValid: validation.isValid,
        error: validation.error,
        value: validation.value
      }
    });
  } catch (error) {
    console.error('Error validating field:', error);
    res.status(500).json({
      success: false,
      error: 'Validation failed. Please try again.'
    });
  }
});

// Update application field
router.post('/update-field', async (req, res) => {
  try {
    const { sessionId, fieldName, newValue, applicationData } = req.body;

    if (!fieldName || newValue === undefined || !applicationData) {
      return res.status(400).json({
        success: false,
        error: 'Field name, new value, and application data are required'
      });
    }

    const sessionData = {
      sessionId,
      applicationData
    };

    const result = await conversationService.updateField(sessionData, fieldName, newValue);

    if (result.success) {
      res.json({
        success: true,
        data: {
          message: result.message,
          applicationData: result.sessionData.applicationData
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error updating field:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update field. Please try again.'
    });
  }
});

// Get application details (for admin purposes)
router.get('/application/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Application ID is required'
      });
    }

    const application = await databaseService.getApplication(id);

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    res.json({
      success: true,
      data: application
    });
  } catch (error) {
    console.error('Error retrieving application:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve application. Please try again.'
    });
  }
});

// Get all applications (for admin purposes)
router.get('/applications', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    const applications = await databaseService.getAllApplications(limit, offset);

    res.json({
      success: true,
      data: applications,
      pagination: {
        limit,
        offset,
        total: applications.length
      }
    });
  } catch (error) {
    console.error('Error retrieving applications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve applications. Please try again.'
    });
  }
});

// Get application statistics (for admin purposes)
router.get('/stats', async (req, res) => {
  try {
    const stats = await databaseService.getApplicationStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error retrieving application stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve statistics. Please try again.'
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'HR Bot API is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;