const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Password Hashing Utility
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedValue) {
  if (!storedValue || !storedValue.includes(':')) return false;
  const [salt, originalHash] = storedValue.split(':');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === originalHash;
}

const SQLITE_DB_PATH = path.join(__dirname, 'database.sqlite');
const JSON_DB_PATH = path.join(__dirname, 'db.json');

let dbType = 'sqlite'; // 'postgres', 'sqlite', or 'json'
let sqliteDB = null;
let pgPool = null;
let jsonData = { tutors: [], reports: [], admin: [] };

// Initialize JSON database fallback helper
function loadJsonDB() {
  try {
    if (fs.existsSync(JSON_DB_PATH)) {
      const data = fs.readFileSync(JSON_DB_PATH, 'utf8');
      jsonData = JSON.parse(data);
    } else {
      saveJsonDB();
    }
  } catch (err) {
    console.error('Error reading JSON DB file, initializing empty state:', err);
  }
}

function saveJsonDB() {
  try {
    fs.writeFileSync(JSON_DB_PATH, JSON.stringify(jsonData, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing to JSON DB file:', err);
  }
}

// Seeding Data Lists (72 Official Tutors)
const DEFAULT_TUTORS = [
  'Opeyemi Otegbola',
  'Oladuntoye Florence Ayodeji',
  'Popoola Maria',
  'Habibat Adedoyin Meshioye',
  'Jesuware Esther Oliwamayowa',
  'OGUNLEYE GBENGA',
  'Johnbeloved Afolabi',
  'Eseosa Ehinmosan',
  'Omokolade Fatanmi',
  'Chibuzo Onuorah',
  'Yussuf Bidemi',
  'Aderemi Dolapo Emmanuel',
  'Ayooba Ademola',
  'Oluwasuyi Linda Oyindamola',
  'Chinweze Chibuzo Anene',
  'Ms. Lydia Oyekunle',
  'Mbah Blessing Chioma',
  'Oyebimpe Sunday',
  'Oladele Moses Oluwajuwonlo',
  'Ekene Nwadiogo Ugwu',
  'Oloyede Abdussamod Segun',
  'Loveth Oghwere',
  'Odunayo Blessing Okedare',
  'Adesiyan Hannah Joy',
  'Oni Gabriel',
  'Victoria Oyedokun',
  'Gloria Samuel Anayeokwu',
  'Mayowa Opeyemi Musa',
  'Taiwo Ayodeji Gbolagade',
  'CHIBUZO MACANTHONY',
  'Afolabi Akintunde Emmanuel',
  'Oluwasijibomi Akindele-Obe',
  'Abiodun Oyebola',
  'Abigael Taiwo',
  'Edonogie Osagie-Iyamu',
  'Odubiyi Oluwatamilore Eunice',
  'Sodiq Akanni Yusuf',
  'Michael Chukwudi Onwujekwe',
  'Ruth Ogechi Okafor',
  'Deborah Olumoye',
  'Oyedokun Samuel',
  'Ogunjinmi Oluwatobi Paul',
  'Iwuanyanwu Chimanma Marycynthia',
  'Adedokun Jelil Lanre',
  'Andrew Okoroafor',
  'Falujo Margaret',
  'Akinoso Daniel',
  'Thomas Moses Moko',
  'Mercy Chizoba Nnajieme',
  'Akinyemi Irorunoluwa Daniel',
  'Tayo Akosile',
  'Michael Olatunji',
  'Ilori Dabira Emmanuel',
  'Egbonwon Daniel',
  'Gideon Chioma Success',
  'Elizabeth Ogbewele',
  'Arowoogun Adekunle Victor',
  'Ms jamal Juliet',
  'Akintunde Imoleayo Victoria',
  'Giami Fortune Chienweatu',
  'Nwose Lovette Chidimma',
  'Benson Egwu',
  'Okolie Chinetugo Victoria',
  'Desmond Josephat',
  'Akinoso Victor',
  'Benita Akubudike',
  'Yakubu Aisha Osheiza',
  'Tina obebeduo',
  'Blessing Efe',
  'Ajibade Deborah Jesudamilola',
  'Nzekwe Favour Ifunanya',
  'Morah Emmanuel Ifeanyi',
  'Anichukwueze Mary Jennifer'
];

const DEFAULT_ADMIN = {
  username: 'admin',
  password: hashPassword('GiantStrides2026!')
};

// Database interface
const db = {
  dbType: () => dbType,

  init: async () => {
    // 1. Check if PostgreSQL URL is provided (Supabase / Production Cloud)
    if (process.env.DATABASE_URL) {
      try {
        console.log('PostgreSQL Connection string found. Initializing Cloud Postgres...');
        const { Pool } = require('pg');
        
        pgPool = new Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: {
            rejectUnauthorized: false // Safe for Supabase and Render hosting connections
          }
        });

        // Test connection
        await pgPool.query('SELECT NOW()');
        console.log('Successfully connected to Cloud Postgres (Supabase).');

        // Create Tables for Postgres
        await pgPool.query(`
          CREATE TABLE IF NOT EXISTS tutors (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);

        await pgPool.query(`
          CREATE TABLE IF NOT EXISTS reports (
            id SERIAL PRIMARY KEY,
            tutor_name VARCHAR(255) NOT NULL,
            student_name VARCHAR(255) NOT NULL,
            class_date VARCHAR(20) NOT NULL,
            subject VARCHAR(255) NOT NULL,
            topic VARCHAR(255) NOT NULL,
            assignment_given VARCHAR(5) NOT NULL,
            assignment_details TEXT,
            learner_observation TEXT NOT NULL,
            other_feedback TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);

        await pgPool.query(`
          CREATE TABLE IF NOT EXISTS admins (
            id SERIAL PRIMARY KEY,
            username VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL
          )
        `);

        // Seed Tutors and Admin in Postgres
        const tutorsCountRes = await pgPool.query("SELECT COUNT(*) as count FROM tutors");
        if (parseInt(tutorsCountRes.rows[0].count, 10) === 0) {
          console.log('Seeding Cloud Postgres with default tutors list...');
          for (const tutor of DEFAULT_TUTORS) {
            await pgPool.query("INSERT INTO tutors (name) VALUES ($1) ON CONFLICT DO NOTHING", [tutor]);
          }
          console.log('Seeded Postgres with default tutors.');
        }

        const adminCountRes = await pgPool.query("SELECT COUNT(*) as count FROM admins WHERE username = 'admin'");
        if (parseInt(adminCountRes.rows[0].count, 10) === 0) {
          await pgPool.query(
            "INSERT INTO admins (username, password) VALUES ($1, $2)",
            [DEFAULT_ADMIN.username, DEFAULT_ADMIN.password]
          );
          console.log('Seeded Postgres with default admin account.');
        }

        dbType = 'postgres';
        return;
      } catch (err) {
        console.warn('Failed to connect to Cloud Postgres database. Falling back to local databases...', err.message);
      }
    }

    // 2. Local fallback - Attempt SQLite
    return new Promise((resolve) => {
      try {
        const sqlite3 = require('sqlite3').verbose();
        sqliteDB = new sqlite3.Database(SQLITE_DB_PATH, (err) => {
          if (err) {
            console.warn('SQLite connection error, falling back to JSON database:', err.message);
            switchToJSON();
            resolve();
          } else {
            // Setup SQLite schemas
            sqliteDB.serialize(() => {
              sqliteDB.run(`
                CREATE TABLE IF NOT EXISTS tutors (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  name TEXT UNIQUE NOT NULL,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
              `);

              sqliteDB.run(`
                CREATE TABLE IF NOT EXISTS reports (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  tutor_name TEXT NOT NULL,
                  student_name TEXT NOT NULL,
                  class_date TEXT NOT NULL,
                  subject TEXT NOT NULL,
                  topic TEXT NOT NULL,
                  assignment_given TEXT NOT NULL,
                  assignment_details TEXT,
                  learner_observation TEXT NOT NULL,
                  other_feedback TEXT,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
              `);

              sqliteDB.run(`
                CREATE TABLE IF NOT EXISTS admins (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  username TEXT UNIQUE NOT NULL,
                  password TEXT NOT NULL
                )
              `);

              // Seed Tutors and Admin in SQLite
              sqliteDB.get("SELECT COUNT(*) as count FROM tutors", (err, row) => {
                if (!err && row.count === 0) {
                  const stmt = sqliteDB.prepare("INSERT INTO tutors (name) VALUES (?)");
                  DEFAULT_TUTORS.forEach(tutor => stmt.run(tutor));
                  stmt.finalize();
                  console.log('Seeded SQLite with default tutors.');
                }
              });

              sqliteDB.get("SELECT COUNT(*) as count FROM admins WHERE username = 'admin'", (err, row) => {
                if (!err && row.count === 0) {
                  sqliteDB.run(
                    "INSERT INTO admins (username, password) VALUES (?, ?)",
                    [DEFAULT_ADMIN.username, DEFAULT_ADMIN.password],
                    (err) => {
                      if (!err) console.log('Seeded SQLite with default admin account.');
                    }
                  );
                }
              });

              console.log('SQLite database initialized successfully.');
              dbType = 'sqlite';
              resolve();
            });
          }
        });
      } catch (err) {
        console.warn('SQLite3 module not installed or failed to load. Falling back to JSON database:', err.message);
        switchToJSON();
        resolve();
      }
    });

    function switchToJSON() {
      dbType = 'json';
      loadJsonDB();
      
      // Seed Tutors
      if (jsonData.tutors.length === 0) {
        jsonData.tutors = DEFAULT_TUTORS.map((name, index) => ({ id: index + 1, name }));
        console.log('Seeded JSON DB with default tutors.');
      }
      
      // Seed Admin
      const adminExists = jsonData.admin.some(u => u.username === DEFAULT_ADMIN.username);
      if (!adminExists) {
        jsonData.admin.push({ id: 1, ...DEFAULT_ADMIN });
        console.log('Seeded JSON DB with default admin account.');
      }

      // Seed Reports
      if (jsonData.reports.length === 0) {
        jsonData.reports = [
          {
            id: 1,
            tutor_name: 'Opeyemi Otegbola',
            student_name: 'David Mark',
            class_date: '2026-08-18',
            subject: 'Mathematics',
            topic: 'Algebraic Fractions',
            assignment_given: 'Yes',
            assignment_details: 'Complete exercise 4B questions 1-10.',
            learner_observation: 'David showed great understanding of simplifying algebraic expressions. He struggled slightly with finding the lowest common denominator but caught on quickly after two examples.',
            other_feedback: 'Class went smoothly. Next class scheduled for next Tuesday.',
            created_at: '2026-08-18T10:00:00.000Z'
          },
          {
            id: 2,
            tutor_name: 'Opeyemi Otegbola',
            student_name: 'David Mark',
            class_date: '2026-08-20',
            subject: 'Mathematics',
            topic: 'Simultaneous Equations',
            assignment_given: 'No',
            assignment_details: '',
            learner_observation: 'We reviewed the elimination method. David was able to solve 4 equations correctly on his own. Excellent focus today.',
            other_feedback: '',
            created_at: '2026-08-20T10:00:00.000Z'
          },
          {
            id: 3,
            tutor_name: 'Opeyemi Otegbola',
            student_name: 'Aisha Yusuf',
            class_date: '2026-08-19',
            subject: 'Mathematics',
            topic: 'Calculus Introduction',
            assignment_given: 'Yes',
            assignment_details: 'Solve page 112 questions 3 and 4.',
            learner_observation: 'Aisha has a solid grasp of basic differentiation rules. We will cover optimization problems next lesson.',
            other_feedback: 'Internet was a bit unstable at the beginning, but we resolved it.',
            created_at: '2026-08-19T11:00:00.000Z'
          },
          {
            id: 4,
            tutor_name: 'Oladuntoye Florence Ayodeji',
            student_name: 'Emma Watson',
            class_date: '2026-08-17',
            subject: 'Creative Writing',
            topic: 'Character Development',
            assignment_given: 'Yes',
            assignment_details: 'Write a 300-word character profile using descriptive adjectives.',
            learner_observation: 'Emma is highly creative. Her vocabulary is outstanding. We focused on showing character traits through action rather than telling.',
            other_feedback: 'She participated enthusiastically.',
            created_at: '2026-08-17T14:00:00.000Z'
          },
          {
            id: 5,
            tutor_name: 'Oladuntoye Florence Ayodeji',
            student_name: 'Emma Watson',
            class_date: '2026-08-21',
            subject: 'Creative Writing',
            topic: 'Setting and Atmosphere',
            assignment_given: 'No',
            assignment_details: '',
            learner_observation: 'Today we discussed how settings reflect a character\'s mood. Emma wrote a beautiful descriptive paragraph about a stormy beach.',
            other_feedback: '',
            created_at: '2026-08-21T14:00:00.000Z'
          }
        ];
        console.log('Seeded JSON DB with default reports.');
      }
      
      saveJsonDB();
      console.log('JSON Database fallback initialized successfully.');
    }
  },

  // Tutor Repository Methods
  getTutors: () => {
    return new Promise(async (resolve, reject) => {
      if (dbType === 'postgres') {
        try {
          const res = await pgPool.query("SELECT id, name FROM tutors ORDER BY name ASC");
          resolve(res.rows);
        } catch (err) {
          reject(err);
        }
      } else if (dbType === 'sqlite') {
        sqliteDB.all("SELECT id, name FROM tutors ORDER BY name ASC", [], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      } else {
        const sorted = [...jsonData.tutors].sort((a, b) => a.name.localeCompare(b.name));
        resolve(sorted);
      }
    });
  },

  addTutor: (name) => {
    return new Promise(async (resolve, reject) => {
      const cleanName = name.trim();
      if (!cleanName) return reject(new Error('Tutor name cannot be empty.'));

      if (dbType === 'postgres') {
        try {
          const res = await pgPool.query(
            "INSERT INTO tutors (name) VALUES ($1) RETURNING id, name",
            [cleanName]
          );
          resolve(res.rows[0]);
        } catch (err) {
          if (err.message.includes('unique') || err.code === '23505') {
            reject(new Error('Tutor already exists.'));
          } else {
            reject(err);
          }
        }
      } else if (dbType === 'sqlite') {
        sqliteDB.run("INSERT INTO tutors (name) VALUES (?)", [cleanName], function (err) {
          if (err) {
            if (err.message.includes('UNIQUE')) {
              reject(new Error('Tutor already exists.'));
            } else {
              reject(err);
            }
          } else {
            resolve({ id: this.lastID, name: cleanName });
          }
        });
      } else {
        const exists = jsonData.tutors.some(t => t.name.toLowerCase() === cleanName.toLowerCase());
        if (exists) return reject(new Error('Tutor already exists.'));

        const newId = jsonData.tutors.reduce((max, t) => t.id > max ? t.id : max, 0) + 1;
        const newTutor = { id: newId, name: cleanName };
        jsonData.tutors.push(newTutor);
        saveJsonDB();
        resolve(newTutor);
      }
    });
  },

  deleteTutor: (id) => {
    return new Promise(async (resolve, reject) => {
      const numericId = parseInt(id, 10);

      if (dbType === 'postgres') {
        try {
          const res = await pgPool.query("DELETE FROM tutors WHERE id = $1", [numericId]);
          resolve({ changes: res.rowCount });
        } catch (err) {
          reject(err);
        }
      } else if (dbType === 'sqlite') {
        sqliteDB.run("DELETE FROM tutors WHERE id = ?", [numericId], function (err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        });
      } else {
        const initialLength = jsonData.tutors.length;
        jsonData.tutors = jsonData.tutors.filter(t => t.id !== numericId);
        saveJsonDB();
        resolve({ changes: initialLength - jsonData.tutors.length });
      }
    });
  },

  // Report Repository Methods
  addReport: (report) => {
    return new Promise(async (resolve, reject) => {
      const {
        tutor_name,
        student_name,
        class_date,
        subject,
        topic,
        assignment_given,
        assignment_details,
        learner_observation,
        other_feedback
      } = report;

      if (!tutor_name || !student_name || !class_date || !subject || !topic || !assignment_given || !learner_observation) {
        return reject(new Error('All required report fields must be provided.'));
      }

      if (dbType === 'postgres') {
        try {
          const res = await pgPool.query(
            `INSERT INTO reports (
              tutor_name, student_name, class_date, subject, topic, 
              assignment_given, assignment_details, learner_observation, other_feedback
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
            [
              tutor_name,
              student_name,
              class_date,
              subject,
              topic,
              assignment_given,
              assignment_details || '',
              learner_observation,
              other_feedback || ''
            ]
          );
          resolve({ id: res.rows[0].id });
        } catch (err) {
          reject(err);
        }
      } else if (dbType === 'sqlite') {
        sqliteDB.run(
          `INSERT INTO reports (
            tutor_name, student_name, class_date, subject, topic, 
            assignment_given, assignment_details, learner_observation, other_feedback
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            tutor_name,
            student_name,
            class_date,
            subject,
            topic,
            assignment_given,
            assignment_details || '',
            learner_observation,
            other_feedback || ''
          ],
          function (err) {
            if (err) reject(err);
            else resolve({ id: this.lastID });
          }
        );
      } else {
        const newId = jsonData.reports.reduce((max, r) => r.id > max ? r.id : max, 0) + 1;
        const newReport = {
          id: newId,
          tutor_name,
          student_name,
          class_date,
          subject,
          topic,
          assignment_given,
          assignment_details: assignment_details || '',
          learner_observation,
          other_feedback: other_feedback || '',
          created_at: new Date().toISOString()
        };
        jsonData.reports.push(newReport);
        saveJsonDB();
        resolve({ id: newId });
      }
    });
  },

  getReports: ({ tutorName, month }) => {
    return new Promise(async (resolve, reject) => {
      if (dbType === 'postgres') {
        try {
          let sql = "SELECT * FROM reports WHERE 1=1";
          const params = [];
          let idx = 1;

          if (tutorName) {
            sql += ` AND tutor_name = $${idx++}`;
            params.push(tutorName);
          }

          if (month) {
            sql += ` AND class_date LIKE $${idx++}`;
            params.push(`${month}%`);
          }

          sql += " ORDER BY class_date DESC, created_at DESC";

          const res = await pgPool.query(sql, params);
          resolve(res.rows);
        } catch (err) {
          reject(err);
        }
      } else if (dbType === 'sqlite') {
        let sql = "SELECT * FROM reports WHERE 1=1";
        const params = [];

        if (tutorName) {
          sql += " AND tutor_name = ?";
          params.push(tutorName);
        }

        if (month) {
          sql += " AND class_date LIKE ?";
          params.push(`${month}%`);
        }

        sql += " ORDER BY class_date DESC, created_at DESC";

        sqliteDB.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      } else {
        let filtered = [...jsonData.reports];

        if (tutorName) {
          filtered = filtered.filter(r => r.tutor_name.toLowerCase() === tutorName.toLowerCase());
        }

        if (month) {
          filtered = filtered.filter(r => r.class_date.startsWith(month));
        }

        filtered.sort((a, b) => {
          const dateDiff = b.class_date.localeCompare(a.class_date);
          if (dateDiff !== 0) return dateDiff;
          return (b.created_at || '').localeCompare(a.created_at || '');
        });

        resolve(filtered);
      }
    });
  },

  getReportsForMonth: (month) => {
    return new Promise(async (resolve, reject) => {
      if (!month) return reject(new Error('Month is required (format YYYY-MM).'));

      if (dbType === 'postgres') {
        try {
          const res = await pgPool.query(
            "SELECT * FROM reports WHERE class_date LIKE $1 ORDER BY tutor_name ASC, class_date DESC",
            [`${month}%`]
          );
          resolve(res.rows);
        } catch (err) {
          reject(err);
        }
      } else if (dbType === 'sqlite') {
        sqliteDB.all(
          "SELECT * FROM reports WHERE class_date LIKE ? ORDER BY tutor_name ASC, class_date DESC",
          [`${month}%`],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      } else {
        const filtered = jsonData.reports
          .filter(r => r.class_date.startsWith(month))
          .sort((a, b) => {
            const tutorDiff = a.tutor_name.localeCompare(b.tutor_name);
            if (tutorDiff !== 0) return tutorDiff;
            return b.class_date.localeCompare(a.class_date);
          });
        resolve(filtered);
      }
    });
  },

  getSubmissionStatus: async (date) => {
    if (!date) throw new Error('Date is required (format YYYY-MM-DD).');

    // Get list of active tutors
    const tutors = await db.getTutors();
    const tutorNames = tutors.map(t => t.name);

    let submittedTutors = [];

    if (dbType === 'postgres') {
      const res = await pgPool.query(
        "SELECT DISTINCT tutor_name FROM reports WHERE class_date = $1",
        [date]
      );
      submittedTutors = res.rows.map(r => r.tutor_name);
    } else if (dbType === 'sqlite') {
      const rows = await new Promise((resolve, reject) => {
        sqliteDB.all(
          "SELECT DISTINCT tutor_name FROM reports WHERE class_date = ?",
          [date],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });
      submittedTutors = rows.map(r => r.tutor_name);
    } else {
      submittedTutors = [
        ...new Set(
          jsonData.reports
            .filter(r => r.class_date === date)
            .map(r => r.tutor_name)
        )
      ];
    }

    // Determine who has submitted and who has not (case-insensitive check)
    const submittedSet = new Set(submittedTutors.map(name => name.toLowerCase()));

    const submittedList = tutors.filter(t => submittedSet.has(t.name.toLowerCase())).map(t => t.name);
    const notSubmittedList = tutors.filter(t => !submittedSet.has(t.name.toLowerCase())).map(t => t.name);

    return {
      date,
      submitted: submittedList,
      notSubmitted: notSubmittedList
    };
  },

  // Admin Auth Repository Methods
  getAdmin: (username) => {
    return new Promise(async (resolve, reject) => {
      if (dbType === 'postgres') {
        try {
          const res = await pgPool.query("SELECT * FROM admins WHERE username = $1", [username]);
          resolve(res.rows[0] || null);
        } catch (err) {
          reject(err);
        }
      } else if (dbType === 'sqlite') {
        sqliteDB.get("SELECT * FROM admins WHERE username = ?", [username], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      } else {
        const row = jsonData.admin.find(u => u.username === username);
        resolve(row || null);
      }
    });
  },

  verifyPassword
};

module.exports = db;
