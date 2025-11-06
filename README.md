# HR Recruitment Assistant

A conversational HR bot that collects candidate information through a structured chat interface, validates inputs, and stores applications in a recruitment database.

## Features

- **Conversational Interface**: Chat-style UI with real-time messaging
- **Step-by-Step Data Collection**: Guides candidates through application process
- **Real-time Validation**: Input validation with immediate feedback
- **Progress Tracking**: Visual progress indicator showing completion status
- **Summary & Confirmation**: Review and edit information before submission
- **Database Storage**: Persistent storage with SQLite
- **Responsive Design**: Works on desktop and mobile devices
- **Error Handling**: Graceful error handling with user-friendly messages

## Application Flow

1. **Greeting**: Bot welcomes candidate and explains the process
2. **Data Collection**: Sequentially collects:
   - Full Name
   - Email Address
   - Phone Number
   - Current City and Country
   - Position Applied For
   - Years of Experience
   - Primary Skills
   - Expected Salary
   - Availability to Join
3. **Validation**: Real-time validation of all inputs
4. **Summary**: Display all collected information for review
5. **Confirmation**: Candidate confirms or edits information
6. **Submission**: Save to database and show success message

## Technology Stack

### Backend
- **Node.js** with Express.js
- **Socket.IO** for real-time communication
- **SQLite** for database storage
- **Joi** for input validation
- **Helmet** for security headers
- **Rate limiting** for spam prevention

### Frontend
- **HTML5**, **CSS3**, **Vanilla JavaScript**
- **Socket.IO Client** for real-time messaging
- **Responsive CSS Grid/Flexbox**
- **CSS animations** for better UX

## Installation

### Prerequisites
- Node.js (version 16 or higher)
- npm or yarn

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Ak001
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env file with your configuration
   ```

4. **Start the application**
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

5. **Access the application**
   Open your browser and navigate to `http://localhost:3000`

## Project Structure

```
Ak001/
├── backend/
│   ├── server.js              # Main server file
│   ├── routes/
│   │   └── bot.js            # API routes
│   ├── services/
│   │   ├── conversationService.js  # Conversation logic
│   │   ├── validationService.js    # Input validation
│   │   └── databaseService.js      # Database operations
│   └── models/                 # Data models (if needed)
├── frontend/
│   ├── index.html            # Main HTML file
│   ├── css/
│   │   └── styles.css        # CSS styles
│   ├── js/
│   │   └── app.js           # Frontend JavaScript
│   └── assets/
│       └── images/          # Image assets
├── data/                    # Database files
├── tests/                   # Test files
├── package.json            # Dependencies and scripts
├── .env.example           # Environment variables template
└── README.md              # This file
```

## API Endpoints

### REST API
- `POST /api/conversation/start` - Start new conversation
- `POST /api/conversation/message` - Process user message
- `POST /api/conversation/submit` - Submit application
- `POST /api/conversation/validate` - Validate field
- `POST /api/conversation/update-field` - Update application field
- `GET /api/conversation/application/:id` - Get application details
- `GET /api/conversation/applications` - Get all applications (admin)
- `GET /api/conversation/health` - Health check

### WebSocket Events
- `start-conversation` - Initialize new session
- `user-message` - Send user message to bot
- `bot-message` - Receive bot response
- `summary` - Receive application summary
- `submit-application` - Submit completed application
- `submission-success` - Application submitted successfully
- `submission-error` - Application submission failed

## Database Schema

```sql
CREATE TABLE applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    city_country TEXT NOT NULL,
    position_applied TEXT NOT NULL,
    experience_years REAL NOT NULL,
    skills TEXT NOT NULL,
    expected_salary TEXT NOT NULL,
    availability TEXT NOT NULL,
    application_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Validation Rules

- **Name**: 2-100 characters, letters only
- **Email**: Valid email format
- **Phone**: 10-15 digits, optional + prefix
- **Experience**: 0-50 years, numeric
- **Skills**: Comma-separated, max 10 skills
- **Required Fields**: All fields are required

## Configuration

### Environment Variables
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)
- `DB_PATH`: SQLite database file path
- `RATE_LIMIT_WINDOW_MS`: Rate limiting window
- `RATE_LIMIT_MAX_REQUESTS`: Max requests per window

## Development

### Running Tests
```bash
npm test
```

### Linting
```bash
npm run lint
```

### Development Mode
```bash
npm run dev
```

Uses `nodemon` for automatic restart on file changes.

## Deployment

### Production Build
1. Set `NODE_ENV=production`
2. Configure reverse proxy (nginx/Apache)
3. Set up SSL certificate
4. Configure environment variables
5. Start with `npm start`

### Security Considerations
- Uses Helmet.js for security headers
- Rate limiting to prevent spam
- Input sanitization to prevent XSS
- HTTPS recommended for production

## Monitoring and Maintenance

### Logs
- Application logs printed to console
- Consider using Winston for structured logging

### Backups
- SQLite database file should be backed up regularly
- Location: `/data/recruitment.db`

### Performance
- Monitor response times (< 2s target)
- Database query optimization
- Consider Redis for session storage at scale

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions:
- Create an issue in the repository
- Contact the development team

## Future Enhancements

- Email notifications for applications
- Admin dashboard for application management
- File upload for resumes
- Multi-language support
- Advanced analytics and reporting
- Integration with HR systems
- AI-powered candidate matching