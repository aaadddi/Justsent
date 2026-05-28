package db

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"
)

var DB *sql.DB

func InitDB() error {
	dbPath := GetDatabasePath()
	var err error
	DB, err = sql.Open("sqlite", dbPath)
	if err != nil {
		return fmt.Errorf("failed to open database: %w", err)
	}

	if err = DB.Ping(); err != nil {
		return fmt.Errorf("failed to ping database: %w", err)
	}

	if err = migrate(); err != nil {
		return fmt.Errorf("migration failed: %w", err)
	}

	return nil
}

func GetDatabasePath() string {
	dir, err := os.UserConfigDir()
	if err != nil {
		return "justsent.db"
	}
	appDir := filepath.Join(dir, "JustSent")
	if err = os.MkdirAll(appDir, 0755); err != nil {
		return "justsent.db"
	}
	return filepath.Join(appDir, "justsent.db")
}

func migrate() error {
	createSharesTable := `
	CREATE TABLE IF NOT EXISTS shares (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		token TEXT UNIQUE NOT NULL,
		file_paths TEXT NOT NULL,
		label TEXT NOT NULL,
		primary_name TEXT NOT NULL,
		public_download_url TEXT NOT NULL,
		local_download_url TEXT NOT NULL,
		is_internet INTEGER NOT NULL DEFAULT 0,
		is_lan INTEGER NOT NULL DEFAULT 0,
		file_count INTEGER NOT NULL DEFAULT 0,
		total_size INTEGER NOT NULL DEFAULT 0,
		password_hash TEXT NOT NULL DEFAULT '',
		note TEXT NOT NULL DEFAULT '',
		downloads INTEGER NOT NULL DEFAULT 0,
		created_at DATETIME NOT NULL,
		expires_at DATETIME
	);`

	createSettingsTable := `
	CREATE TABLE IF NOT EXISTS settings (
		key TEXT PRIMARY KEY,
		value TEXT NOT NULL
	);`

	_, err := DB.Exec(createSharesTable)
	if err != nil {
		return err
	}

	_, err = DB.Exec(createSettingsTable)
	return err
}
