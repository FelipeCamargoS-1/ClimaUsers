CREATE TABLE users (
    id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255),
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL,
    CONSTRAINT users_pkey PRIMARY KEY (id)
);

CREATE TABLE auth_sessions (
    id UUID NOT NULL,
    token_hash VARCHAR(128) NOT NULL,
    user_id UUID NOT NULL,
    expires_at TIMESTAMP(3) NOT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT auth_sessions_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX users_email_key ON users(email);
CREATE UNIQUE INDEX auth_sessions_token_hash_key ON auth_sessions(token_hash);
CREATE INDEX auth_sessions_user_id_idx ON auth_sessions(user_id);
ALTER TABLE auth_sessions ADD CONSTRAINT auth_sessions_user_id_fkey
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;
