const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class DatabaseService {
  constructor() {
    this.dbPath = path.join(__dirname, '../../data/recruitment.db');
    this.db = null;
  }

  async initializeDatabase() {
    return new Promise((resolve, reject) => {
      // Ensure data directory exists
      const fs = require('fs');
      const dataDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err.message);
          reject(err);
        } else {
          console.log('Connected to SQLite database.');
          this.createTables()
            .then(() => resolve())
            .catch(reject);
        }
      });
    });
  }

  async createTables() {
    return new Promise((resolve, reject) => {
      const createApplicationsTable = `
        CREATE TABLE IF NOT EXISTS applications (
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
        )
      `;

      const createIndexes = [
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_application_id ON applications(application_id)',
        'CREATE INDEX IF NOT EXISTS idx_email ON applications(email)',
        'CREATE INDEX IF NOT EXISTS idx_position ON applications(position_applied)',
        'CREATE INDEX IF NOT EXISTS idx_status ON applications(status)',
        'CREATE INDEX IF NOT EXISTS idx_application_date ON applications(application_date)'
      ];

      this.db.run(createApplicationsTable, (err) => {
        if (err) {
          reject(err);
          return;
        }

        // Create indexes
        Promise.all(
          createIndexes.map(indexQuery =>
            new Promise((resolveIndex, rejectIndex) => {
              this.db.run(indexQuery, (indexErr) => {
                if (indexErr) rejectIndex(indexErr);
                else resolveIndex();
              });
            })
          )
        )
        .then(() => resolve())
        .catch(reject);
      });
    });
  }

  async saveApplication(applicationData) {
    return new Promise((resolve, reject) => {
      const validation = this.validateApplicationData(applicationData);
      if (!validation.isValid) {
        resolve({
          success: false,
          error: validation.error
        });
        return;
      }

      const {
        application_id,
        full_name,
        email,
        phone,
        city_country,
        position_applied,
        experience_years,
        skills,
        expected_salary,
        availability,
        application_date
      } = applicationData;

      const skillsJson = Array.isArray(skills) ? JSON.stringify(skills) : skills;

      const query = `
        INSERT INTO applications (
          application_id, full_name, email, phone, city_country,
          position_applied, experience_years, skills, expected_salary,
          availability, application_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        application_id,
        full_name,
        email,
        phone,
        city_country,
        position_applied,
        experience_years,
        skillsJson,
        expected_salary,
        availability,
        application_date || new Date().toISOString()
      ];

      this.db.run(query, values, function(err) {
        if (err) {
          console.error('Error saving application:', err.message);
          resolve({
            success: false,
            error: 'We encountered an issue saving your data. Please try again.'
          });
        } else {
          resolve({
            success: true,
            applicationId: application_id,
            databaseId: this.lastID
          });
        }
      });
    });
  }

  async getApplication(applicationId) {
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM applications WHERE application_id = ?';

      this.db.get(query, [applicationId], (err, row) => {
        if (err) {
          console.error('Error retrieving application:', err.message);
          reject(err);
        } else if (!row) {
          resolve(null);
        } else {
          // Parse skills back to array
          const application = {
            ...row,
            skills: JSON.parse(row.skills)
          };
          resolve(application);
        }
      });
    });
  }

  async getAllApplications(limit = 100, offset = 0) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM applications
        ORDER BY application_date DESC
        LIMIT ? OFFSET ?
      `;

      this.db.all(query, [limit, offset], (err, rows) => {
        if (err) {
          console.error('Error retrieving applications:', err.message);
          reject(err);
        } else {
          const applications = rows.map(row => ({
            ...row,
            skills: JSON.parse(row.skills)
          }));
          resolve(applications);
        }
      });
    });
  }

  async updateApplicationStatus(applicationId, status) {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE applications
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE application_id = ?
      `;

      this.db.run(query, [status, applicationId], function(err) {
        if (err) {
          console.error('Error updating application status:', err.message);
          reject(err);
        } else {
          resolve({
            success: true,
            changes: this.changes
          });
        }
      });
    });
  }

  async getApplicationStats() {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT
          COUNT(*) as total_applications,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_applications,
          COUNT(CASE WHEN status = 'reviewed' THEN 1 END) as reviewed_applications,
          COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_applications,
          COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted_applications,
          DATE(application_date) as application_date
        FROM applications
        GROUP BY DATE(application_date)
        ORDER BY application_date DESC
        LIMIT 30
      `;

      this.db.all(query, [], (err, rows) => {
        if (err) {
          console.error('Error retrieving application stats:', err.message);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  validateApplicationData(applicationData) {
    const requiredFields = [
      'application_id',
      'full_name',
      'email',
      'phone',
      'city_country',
      'position_applied',
      'experience_years',
      'skills',
      'expected_salary',
      'availability'
    ];

    for (const field of requiredFields) {
      if (!applicationData[field] || applicationData[field] === '') {
        return {
          isValid: false,
          error: `Missing required field: ${field}`
        };
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(applicationData.email)) {
      return {
        isValid: false,
        error: 'Invalid email format'
      };
    }

    // Validate phone number
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(applicationData.phone)) {
      return {
        isValid: false,
        error: 'Invalid phone number format'
      };
    }

    // Validate experience years
    const experience = parseFloat(applicationData.experience_years);
    if (isNaN(experience) || experience < 0 || experience > 50) {
      return {
        isValid: false,
        error: 'Invalid experience years value'
      };
    }

    return {
      isValid: true,
      error: null
    };
  }

  async close() {
    return new Promise((resolve) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            console.error('Error closing database:', err.message);
          } else {
            console.log('Database connection closed.');
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = new DatabaseService();