package config

import (
	"encoding/json"
	"os"
	"path/filepath"
)

type ConfigSchema struct {
	Version    int    `json:"version"`
	ServerPort string `json:"server_port"`
	ServerHost string `json:"server_host"`
	SecretKey  string `json:"secret_key"`
}

func MigrateConfig() error {
	configPath := filepath.Join(UserDataDir(), "config.json")

	// If the file doesn't exist, try to copy it from resources or write default
	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		defaultConfig := ConfigSchema{
			Version:    1,
			ServerPort: "8787",
			ServerHost: "localhost",
			SecretKey:  "HeHeHe",
		}

		// Try to read from resources-dir if provided
		if ResourcesDir != "" {
			resConfigPath := filepath.Join(ResourcesDir, "config", "config.json")
			if data, err := os.ReadFile(resConfigPath); err == nil {
				var resConfig ConfigSchema
				if json.Unmarshal(data, &resConfig) == nil {
					defaultConfig = resConfig
				}
			}
		}

		// Write default config
		data, _ := json.MarshalIndent(defaultConfig, "", "  ")
		_ = os.WriteFile(configPath, data, 0644)
		return nil
	}

	// Read existing config
	data, err := os.ReadFile(configPath)
	if err != nil {
		return err
	}

	var rawConfig map[string]interface{}
	if err := json.Unmarshal(data, &rawConfig); err != nil {
		return err
	}

	versionFloat, ok := rawConfig["version"].(float64)
	version := int(versionFloat)
	if !ok {
		version = 0 // No version found
	}

	if version < 1 {
		rawConfig["version"] = 1
		if _, ok := rawConfig["server_port"]; !ok {
			rawConfig["server_port"] = "8787"
		}
		if _, ok := rawConfig["server_host"]; !ok {
			rawConfig["server_host"] = "localhost"
		}
		if _, ok := rawConfig["secret_key"]; !ok {
			rawConfig["secret_key"] = "HeHeHe"
		}

		migratedData, err := json.MarshalIndent(rawConfig, "", "  ")
		if err != nil {
			return err
		}
		_ = os.WriteFile(configPath, migratedData, 0644)
	}

	return nil
}
