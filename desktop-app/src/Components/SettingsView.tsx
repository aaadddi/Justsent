interface SettingsViewProps {
  themeSetting: "system" | "light" | "dark";
  onThemeChange: (setting: "system" | "light" | "dark") => void;
}

export default function SettingsView({ themeSetting, onThemeChange }: SettingsViewProps) {
  return (
    <div className="settings-view-container">
      <div className="settings-section">
        <h3 className="settings-section-title">Appearance</h3>
        <p className="settings-section-subtitle">Choose how JustSent looks on your device</p>
        
        <div className="theme-options-grid">
          {/* System Theme Card */}
          <div 
            className={`theme-option-card ${themeSetting === "system" ? "active" : ""}`}
            onClick={() => onThemeChange("system")}
          >
            <div className="theme-card-preview system-preview">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
            <div className="theme-card-info">
              <span className="theme-card-title">System</span>
              <span className="theme-card-desc">Matches your system settings</span>
            </div>
          </div>

          {/* Light Theme Card */}
          <div 
            className={`theme-option-card ${themeSetting === "light" ? "active" : ""}`}
            onClick={() => onThemeChange("light")}
          >
            <div className="theme-card-preview light-preview">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2" />
                <path d="M12 20v2" />
                <path d="m4.93 4.93 1.41 1.41" />
                <path d="m17.66 17.66 1.41 1.41" />
                <path d="M2 12h2" />
                <path d="M20 12h2" />
                <path d="m6.34 17.66-1.41 1.41" />
                <path d="m19.07 4.93-1.41 1.41" />
              </svg>
            </div>
            <div className="theme-card-info">
              <span className="theme-card-title">Light</span>
              <span className="theme-card-desc">Classic clean appearance</span>
            </div>
          </div>

          {/* Dark Theme Card */}
          <div 
            className={`theme-option-card ${themeSetting === "dark" ? "active" : ""}`}
            onClick={() => onThemeChange("dark")}
          >
            <div className="theme-card-preview dark-preview">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
              </svg>
            </div>
            <div className="theme-card-info">
              <span className="theme-card-title">Dark</span>
              <span className="theme-card-desc">Easy on the eyes in the dark</span>
            </div>
          </div>
        </div>
      </div>

      <div className="settings-panel-divider" style={{ margin: "24px 0" }} />

      <div className="settings-section">
        <h3 className="settings-section-title">About</h3>
        <div className="about-info-card">
          <div className="about-row">
            <span className="about-label">Application</span>
            <span className="about-val">JustSent Desktop</span>
          </div>
          <div className="about-row">
            <span className="about-label">Version</span>
            <span className="about-val">0.1.0</span>
          </div>
          <div className="about-row">
            <span className="about-label">Security</span>
            <span className="about-val">Direct peer-to-peer secure encryption</span>
          </div>
        </div>
      </div>
    </div>
  );
}
