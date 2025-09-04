import express from 'express';
import { engine } from 'express-handlebars';
import session from 'express-session';
import bodyParser from 'body-parser';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';
import connectPgSimple from 'connect-pg-simple';

dotenv.config();

const app = express();
const port = parseInt(process.env.PORT || '5000', 10);

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize database tables
async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        is_admin_reply BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Database tables initialized successfully');
  } catch (err) {
    console.error('Error initializing database:', err);
  }
}

// Configure Handlebars
app.engine('hbs', engine({
  extname: '.hbs',
  defaultLayout: 'main',
  helpers: {
    formatDate: function(date: Date) {
      return new Date(date).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    },
    query: function() {
      return {};
    },
    eq: function(a: any, b: any) {
      return a === b;
    },
    lookup: function(obj: any, prop: string) {
      return obj?.[prop];
    }
  }
}));

app.set('view engine', 'hbs');
// Set views path based on environment
if (process.env.NODE_ENV === 'production') {
  app.set('views', './dist/views');
} else {
  app.set('views', './views');
}

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
// Serve static files based on environment
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('dist/public'));
} else {
  app.use(express.static('client'));
}
// Configure session store
const PgSession = connectPgSimple(session);
const sessionStore = process.env.NODE_ENV === 'production' 
  ? new PgSession({
      pool: pool, // Connection pool
      tableName: 'user_sessions', // Use another table-name than the default "session" one
      createTableIfMissing: true
    })
  : undefined;

app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    httpOnly: true
  }
}));

// Authentication middleware
function requireAuth(req: any, res: any, next: any) {
  if (req.session.isAdmin) {
    return next();
  }
  res.redirect('/admin/login');
}

// Routes

// Admin login page
app.get('/admin/login', (req: any, res: any) => {
  if (req.session.isAdmin) {
    return res.redirect('/admin');
  }
  res.render('admin-login', { query: req.query });
});

// Admin login handler
app.post('/admin/login', (req: any, res: any) => {
  const { username, password } = req.body;
  
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    res.redirect('/admin');
  } else {
    res.redirect('/admin/login?error=invalid');
  }
});

// Admin logout
app.post('/admin/logout', (req: any, res: any) => {
  req.session.destroy(() => {
    res.redirect('/admin/login');
  });
});

// Home page - Anonymous messaging
app.get('/', async (req: any, res: any) => {
  try {
    let conversationId = null;
    let messages: any[] = [];

    if (req.session.sessionId) {
      // Get existing conversation
      const convResult = await pool.query(
        'SELECT id FROM conversations WHERE session_id = $1',
        [req.session.sessionId]
      );

      if (convResult.rows.length > 0) {
        conversationId = convResult.rows[0].id;
        
        // Get messages for this conversation
        const msgResult = await pool.query(
          'SELECT message, is_admin_reply, created_at FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
          [conversationId]
        );

        messages = msgResult.rows;
      }
    }

    res.render('index', { messages, query: req.query });
  } catch (err) {
    console.error('Error loading home page:', err);
    res.render('index', { messages: [], query: req.query });
  }
});

// Send message
app.post('/send-message', async (req: any, res: any) => {
  try {
    const { message } = req.body;
    
    if (!message || message.trim() === '') {
      return res.redirect('/?error=empty');
    }

    // Create or get session
    if (!req.session.sessionId) {
      req.session.sessionId = uuidv4();
    }

    // Create or get conversation
    let conversationId;
    const convResult = await pool.query(
      'SELECT id FROM conversations WHERE session_id = $1',
      [req.session.sessionId]
    );

    if (convResult.rows.length > 0) {
      conversationId = convResult.rows[0].id;
      // Update last activity
      await pool.query(
        'UPDATE conversations SET last_activity = CURRENT_TIMESTAMP WHERE id = $1',
        [conversationId]
      );
    } else {
      // Create new conversation
      const newConvResult = await pool.query(
        'INSERT INTO conversations (session_id) VALUES ($1) RETURNING id',
        [req.session.sessionId]
      );
      conversationId = newConvResult.rows[0].id;
    }

    // Insert message
    await pool.query(
      'INSERT INTO messages (conversation_id, message, is_admin_reply) VALUES ($1, $2, $3)',
      [conversationId, message.trim(), false]
    );

    res.redirect('/?success=sent');
  } catch (err) {
    console.error('Error sending message:', err);
    res.redirect('/?error=failed');
  }
});

// Admin page
app.get('/admin', requireAuth, async (req: any, res: any) => {
  try {
    const conversationsResult = await pool.query(`
      SELECT 
        c.id,
        c.session_id,
        c.created_at,
        c.last_activity,
        COUNT(m.id) as message_count,
        MAX(m.created_at) as last_message_time
      FROM conversations c
      LEFT JOIN messages m ON c.id = m.conversation_id
      GROUP BY c.id, c.session_id, c.created_at, c.last_activity
      ORDER BY c.last_activity DESC
    `);

    res.render('admin', { conversations: conversationsResult.rows });
  } catch (err) {
    console.error('Error loading admin page:', err);
    res.render('admin', { conversations: [] });
  }
});

// View specific conversation
app.get('/admin/conversation/:id', requireAuth, async (req: any, res: any) => {
  try {
    const conversationId = req.params.id;

    // Get conversation details
    const convResult = await pool.query(
      'SELECT * FROM conversations WHERE id = $1',
      [conversationId]
    );

    if (convResult.rows.length === 0) {
      return res.redirect('/admin');
    }

    // Get messages
    const messagesResult = await pool.query(
      'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
      [conversationId]
    );

    res.render('conversation', {
      conversation: convResult.rows[0],
      messages: messagesResult.rows,
      query: req.query
    });
  } catch (err) {
    console.error('Error loading conversation:', err);
    res.redirect('/admin');
  }
});

// Reply to conversation
app.post('/admin/reply/:id', requireAuth, async (req: any, res: any) => {
  try {
    const conversationId = req.params.id;
    const { reply } = req.body;

    if (!reply || reply.trim() === '') {
      return res.redirect(`/admin/conversation/${conversationId}?error=empty`);
    }

    // Insert admin reply
    await pool.query(
      'INSERT INTO messages (conversation_id, message, is_admin_reply) VALUES ($1, $2, $3)',
      [conversationId, reply.trim(), true]
    );

    // Update conversation last activity
    await pool.query(
      'UPDATE conversations SET last_activity = CURRENT_TIMESTAMP WHERE id = $1',
      [conversationId]
    );

    res.redirect(`/admin/conversation/${conversationId}?success=replied`);
  } catch (err) {
    console.error('Error sending reply:', err);
    res.redirect(`/admin/conversation/${req.params.id}?error=failed`);
  }
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await pool.end();
  process.exit(0);
});

// Start server
const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
app.listen(port, host, async () => {
  console.log(`Server running on ${host}:${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  if (process.env.DATABASE_URL) {
    console.log('Database connected successfully');
  } else {
    console.log('Warning: No DATABASE_URL found');
  }
  await initDatabase();
});

export default app;