export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS system_config (
  key   TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT,
  model        TEXT,
  project_path TEXT,
  trust_level  TEXT DEFAULT 'medium',
  summary      TEXT,
  created_at   INTEGER,
  last_active  INTEGER
);

CREATE TABLE IF NOT EXISTS messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER,
  role       TEXT,
  content    TEXT,
  timestamp  INTEGER
);

CREATE TABLE IF NOT EXISTS task_queue (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER,
  task       TEXT,
  status     TEXT DEFAULT 'pending',
  position   INTEGER,
  result     TEXT
);

CREATE TABLE IF NOT EXISTS rollback_log (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id     INTEGER,
  original_path  TEXT,
  backup_path    TEXT,
  existed_before INTEGER,
  timestamp      INTEGER
);

CREATE TABLE IF NOT EXISTS rag_chunks (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  project_path TEXT,
  file_path    TEXT,
  chunk_type   TEXT,
  chunk_name   TEXT,
  content      TEXT,
  start_line   INTEGER,
  embedding    TEXT,
  indexed_at   INTEGER
);

CREATE TABLE IF NOT EXISTS rag_meta (
  project_path TEXT PRIMARY KEY,
  last_indexed INTEGER,
  chunk_count  INTEGER,
  model_used   TEXT
);

CREATE TABLE IF NOT EXISTS error_patterns (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  fingerprint TEXT UNIQUE,
  error_type  TEXT,
  fix_prompt  TEXT,
  times_seen  INTEGER DEFAULT 1,
  last_seen   INTEGER
);
`

// Default values inserted into system_config on first DB init
export const DEFAULT_CONFIG = {
  detected_ram_gb:          null,
  detected_gpu:             'false',
  recommended_model:        'qwen2.5-coder:7b',
  default_trust_level:      'medium',
  max_steps:                '15',
  rag_top_k:                '5',
  rag_similarity_threshold: '0.5',
  run_cmd_timeout_ms:       '30000',
}
