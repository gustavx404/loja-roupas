CREATE TABLE IF NOT EXISTS administrator (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  username VARCHAR(32) NOT NULL UNIQUE,
  salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  must_change_password BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS administrator_session (
  token_hash CHAR(64) PRIMARY KEY,
  username VARCHAR(32) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

INSERT INTO administrator (id, username, salt, password_hash, must_change_password)
VALUES (1, 'admin', '5260477d6bf68b06e51c0e1d276126bf', '48af4dc5fa5d59425f297c1312ee4dec92ad62b9bb0d4f9028429fba1047544d41257f7df96f6a52f0bf0d11cf178749fc7ed46d523a56a886e48672382ac868', TRUE)
ON CONFLICT (id) DO NOTHING;
