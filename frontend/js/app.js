// HR Bot Application
window.HRBot = (function() {
    'use strict';

    // Private variables
    let socket = null;
    let currentSessionData = null;
    let isTyping = false;
    let conversationEnded = false;

    // DOM elements
    const elements = {
        chatWindow: null,
        messagesContainer: null,
        messageInput: null,
        sendBtn: null,
        progressBar: null,
        progressFill: null,
        progressText: null,
        typingIndicator: null,
        errorMessage: null,
        errorText: null,
        successMessage: null,
        successText: null,
        summarySection: null,
        summaryDetails: null,
        confirmBtn: null,
        editBtn: null,
        startOverSection: null,
        startOverBtn: null,
        editModal: null,
        editForm: null,
        modalClose: null,
        cancelEditBtn: null,
        saveEditBtn: null,
        characterCount: null,
        loadingScreen: null
    };

    // Initialize the application
    function init() {
        initializeElements();
        initializeSocket();
        bindEvents();
        hideLoadingScreen();
        startConversation();
    }

    // Initialize DOM elements
    function initializeElements() {
        elements.chatWindow = document.getElementById('chatWindow');
        elements.messagesContainer = document.getElementById('messagesContainer');
        elements.messageInput = document.getElementById('messageInput');
        elements.sendBtn = document.getElementById('sendBtn');
        elements.progressBar = document.getElementById('progressBar');
        elements.progressFill = document.getElementById('progressFill');
        elements.progressText = document.getElementById('progressText');
        elements.typingIndicator = document.getElementById('typingIndicator');
        elements.errorMessage = document.getElementById('errorMessage');
        elements.errorText = document.getElementById('errorText');
        elements.successMessage = document.getElementById('successMessage');
        elements.successText = document.getElementById('successText');
        elements.summarySection = document.getElementById('summarySection');
        elements.summaryDetails = document.getElementById('summaryDetails');
        elements.confirmBtn = document.getElementById('confirmBtn');
        elements.editBtn = document.getElementById('editBtn');
        elements.startOverSection = document.getElementById('startOverSection');
        elements.startOverBtn = document.getElementById('startOverBtn');
        elements.editModal = document.getElementById('editModal');
        elements.editForm = document.getElementById('editForm');
        elements.modalClose = document.getElementById('modalClose');
        elements.cancelEditBtn = document.getElementById('cancelEditBtn');
        elements.saveEditBtn = document.getElementById('saveEditBtn');
        elements.characterCount = document.getElementById('characterCount');
        elements.loadingScreen = document.getElementById('loadingScreen');
    }

    // Initialize Socket.IO connection
    function initializeSocket() {
        socket = io();

        socket.on('connect', () => {
            console.log('Connected to server');
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from server');
            showError('Connection lost. Please refresh the page.');
        });

        socket.on('bot-message', (data) => {
            hideTypingIndicator();
            addBotMessage(data.message);
            updateProgress(data.progress, data.step);

            if (data.validation && !data.validation.isValid) {
                showError(data.validation.error);
            } else {
                hideError();
            }

            if (data.isComplete) {
                showSummary();
                conversationEnded = true;
                disableInput();
            } else {
                enableInput();
            }
        });

        socket.on('summary', (data) => {
            hideTypingIndicator();
            displaySummary(data.applicationData);
            showSummary();
        });

        socket.on('submission-success', (data) => {
            hideTypingIndicator();
            showSuccess(data.message);
            hideSummary();
            hideInput();
            showStartOver();
            conversationEnded = true;
        });

        socket.on('submission-error', (data) => {
            hideTypingIndicator();
            showError(data.message);
            enableInput();
        });

        socket.on('error', (data) => {
            hideTypingIndicator();
            showError(data.message);
            enableInput();
        });
    }

    // Bind event listeners
    function bindEvents() {
        // Message input events
        elements.messageInput.addEventListener('input', handleInputChange);
        elements.messageInput.addEventListener('keypress', handleInputKeyPress);

        // Send button
        elements.sendBtn.addEventListener('click', sendMessage);

        // Summary actions
        elements.confirmBtn.addEventListener('click', confirmApplication);
        elements.editBtn.addEventListener('click', openEditModal);

        // Start over
        elements.startOverBtn.addEventListener('click', startOver);

        // Modal events
        elements.modalClose.addEventListener('click', closeEditModal);
        elements.cancelEditBtn.addEventListener('click', closeEditModal);
        elements.saveEditBtn.addEventListener('click', saveEditedApplication);

        // Close modal on overlay click
        elements.editModal.addEventListener('click', (e) => {
            if (e.target === elements.editModal) {
                closeEditModal();
            }
        });
    }

    // Handle input changes
    function handleInputChange() {
        const value = elements.messageInput.value.trim();
        elements.sendBtn.disabled = !value || conversationEnded;

        // Update character count
        const length = elements.messageInput.value.length;
        elements.characterCount.textContent = `${length} / 500`;

        if (length > 450) {
            elements.characterCount.style.color = '#dc3545';
        } else {
            elements.characterCount.style.color = '#666';
        }
    }

    // Handle input key press
    function handleInputKeyPress(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }

    // Start a new conversation
    function startConversation() {
        conversationEnded = false;
        currentSessionData = null;
        enableInput();
        clearMessages();
        hideSummary();
        hideStartOver();
        hideError();
        hideSuccess();
        updateProgress(0, 'Ready to start');

        socket.emit('start-conversation');
    }

    // Send message to bot
    function sendMessage() {
        const message = elements.messageInput.value.trim();

        if (!message || conversationEnded) {
            return;
        }

        // Add user message to chat
        addUserMessage(message);

        // Clear input and disable
        elements.messageInput.value = '';
        elements.sendBtn.disabled = true;
        disableInput();
        hideError();

        // Show typing indicator
        showTypingIndicator();

        // Send message to server
        socket.emit('user-message', { message });
    }

    // Add bot message to chat
    function addBotMessage(message) {
        const messageEl = document.createElement('div');
        messageEl.className = 'message bot';

        // Handle markdown-like formatting
        let formattedMessage = message
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');

        // Check if it's a summary message
        if (message.includes('Application Summary') || message.includes('Please review')) {
            messageEl.innerHTML = `<div class="message-summary">${formattedMessage}</div>`;
        } else {
            messageEl.innerHTML = formattedMessage;
        }

        messageEl.innerHTML += `<div class="message-time">${getCurrentTime()}</div>`;

        elements.messagesContainer.appendChild(messageEl);
        scrollToBottom();
    }

    // Add user message to chat
    function addUserMessage(message) {
        const messageEl = document.createElement('div');
        messageEl.className = 'message user';
        messageEl.textContent = message;
        messageEl.innerHTML += `<div class="message-time">${getCurrentTime()}</div>`;

        elements.messagesContainer.appendChild(messageEl);
        scrollToBottom();
    }

    // Display application summary
    function displaySummary(applicationData) {
        const summaryHTML = Object.entries(applicationData)
            .filter(([key]) => !['application_id', 'application_date'].includes(key))
            .map(([key, value]) => {
                const label = formatLabel(key);
                const formattedValue = Array.isArray(value) ? value.join(', ') : value;
                return `
                    <div class="summary-detail">
                        <span class="summary-label">${label}:</span>
                        <span class="summary-value">${formattedValue}</span>
                    </div>
                `;
            }).join('');

        elements.summaryDetails.innerHTML = summaryHTML;
        currentSessionData = { applicationData };
    }

    // Show summary section
    function showSummary() {
        elements.summarySection.style.display = 'block';
        hideInput();
    }

    // Hide summary section
    function hideSummary() {
        elements.summarySection.style.display = 'none';
    }

    // Confirm and submit application
    function confirmApplication() {
        if (!currentSessionData || !currentSessionData.applicationData) {
            showError('No application data to submit');
            return;
        }

        showTypingIndicator();
        hideSummary();

        socket.emit('submit-application', {
            applicationData: currentSessionData.applicationData
        });
    }

    // Open edit modal
    function openEditModal() {
        if (!currentSessionData || !currentSessionData.applicationData) {
            showError('No application data to edit');
            return;
        }

        const applicationData = currentSessionData.applicationData;
        const formHTML = Object.entries(applicationData)
            .filter(([key]) => !['application_id', 'application_date'].includes(key))
            .map(([key, value]) => {
                const label = formatLabel(key);
                const fieldValue = Array.isArray(value) ? value.join(', ') : value;

                if (key === 'skills') {
                    return `
                        <div class="form-group">
                            <label for="${key}">${label}:</label>
                            <textarea id="${key}" name="${key}" rows="3">${fieldValue}</textarea>
                        </div>
                    `;
                } else {
                    const inputType = getInputType(key);
                    return `
                        <div class="form-group">
                            <label for="${key}">${label}:</label>
                            <input type="${inputType}" id="${key}" name="${key}" value="${fieldValue}">
                        </div>
                    `;
                }
            }).join('');

        elements.editForm.innerHTML = formHTML;
        elements.editModal.style.display = 'flex';
    }

    // Close edit modal
    function closeEditModal() {
        elements.editModal.style.display = 'none';
    }

    // Save edited application
    function saveEditedApplication() {
        if (!currentSessionData) {
            showError('No session data available');
            return;
        }

        const formData = new FormData(elements.editForm);
        const updatedData = {};

        // Process form data
        for (const [key, value] of formData.entries()) {
            if (key === 'skills') {
                updatedData[key] = value.split(',').map(skill => skill.trim()).filter(skill => skill.length > 0);
            } else if (key === 'experience_years') {
                updatedData[key] = parseFloat(value) || 0;
            } else {
                updatedData[key] = value.trim();
            }
        }

        // Update current session data
        currentSessionData.applicationData = { ...currentSessionData.applicationData, ...updatedData };

        // Update summary display
        displaySummary(currentSessionData.applicationData);

        // Close modal
        closeEditModal();

        // Show success message
        showSuccess('Application updated successfully');
    }

    // Start over with new application
    function startOver() {
        startConversation();
    }

    // Show/hide typing indicator
    function showTypingIndicator() {
        elements.typingIndicator.style.display = 'flex';
        scrollToBottom();
    }

    function hideTypingIndicator() {
        elements.typingIndicator.style.display = 'none';
    }

    // Enable/disable input
    function enableInput() {
        elements.messageInput.disabled = false;
        elements.messageInput.focus();
    }

    function disableInput() {
        elements.messageInput.disabled = true;
        elements.sendBtn.disabled = true;
    }

    // Show/hide input area
    function hideInput() {
        elements.messageInput.parentElement.parentElement.style.display = 'none';
    }

    function showInput() {
        elements.messageInput.parentElement.parentElement.style.display = 'block';
    }

    // Show/hide start over section
    function showStartOver() {
        elements.startOverSection.style.display = 'block';
    }

    function hideStartOver() {
        elements.startOverSection.style.display = 'none';
    }

    // Show error message
    function showError(message) {
        elements.errorText.textContent = message;
        elements.errorMessage.style.display = 'flex';
        setTimeout(() => {
            elements.errorMessage.style.display = 'none';
        }, 5000);
    }

    function hideError() {
        elements.errorMessage.style.display = 'none';
    }

    // Show success message
    function showSuccess(message) {
        elements.successText.textContent = message;
        elements.successMessage.style.display = 'flex';
        setTimeout(() => {
            elements.successMessage.style.display = 'none';
        }, 5000);
    }

    function hideSuccess() {
        elements.successMessage.style.display = 'none';
    }

    // Update progress
    function updateProgress(progress, step) {
        elements.progressFill.style.width = `${progress}%`;
        elements.progressText.textContent = step || `${progress}% complete`;
    }

    // Clear messages
    function clearMessages() {
        const messages = elements.messagesContainer.querySelectorAll('.message');
        messages.forEach(message => message.remove());
    }

    // Scroll to bottom of chat
    function scrollToBottom() {
        elements.chatWindow.scrollTop = elements.chatWindow.scrollHeight;
    }

    // Hide loading screen
    function hideLoadingScreen() {
        if (elements.loadingScreen) {
            elements.loadingScreen.style.display = 'none';
        }
    }

    // Utility functions
    function getCurrentTime() {
        return new Date().toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    }

    function formatLabel(key) {
        return key.replace(/_/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    function getInputType(key) {
        const types = {
            email: 'email',
            phone: 'tel',
            experience_years: 'number'
        };
        return types[key] || 'text';
    }

    // Public API
    return {
        init: init
    };
})();

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.HRBot.init);
} else {
    window.HRBot.init();
}