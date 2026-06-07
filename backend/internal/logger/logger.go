package logger

import (
	"io"
	"log/slog"
	"os"
	"path/filepath"
)

var LogFile *os.File

func Init(userDataDir string, isDev bool) error {
	logDir := filepath.Join(userDataDir, "logs")
	if err := os.MkdirAll(logDir, 0755); err != nil {
		return err
	}
	logPath := filepath.Join(logDir, "justsent.log")

	// Rotate log file if > 10MB
	if info, err := os.Stat(logPath); err == nil && info.Size() > 10*1024*1024 {
		rotatedPath := filepath.Join(logDir, "justsent.log.old")
		_ = os.Remove(rotatedPath)
		_ = os.Rename(logPath, rotatedPath)
	}

	file, err := os.OpenFile(logPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err != nil {
		return err
	}
	LogFile = file

	var writer io.Writer = file
	if isDev {
		writer = io.MultiWriter(file, os.Stdout)
	}

	handler := slog.NewJSONHandler(writer, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	})
	slog.SetDefault(slog.New(handler))

	return nil
}

func Close() {
	if LogFile != nil {
		_ = LogFile.Close()
	}
}
