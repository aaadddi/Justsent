import React, { type PointerEvent } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { SettingsIcon } from "../assets/icons";
import { AppTab } from "../types/app";

interface SidebarItemProps {
  icon?: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  role?: string;
  ariaSelected?: boolean;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon, label, active, onClick, role = "tab", ariaSelected }) => (
  <button
    className={`sidebar-item ${active ? "active" : ""}`}
    onClick={onClick}
    role={role}
    aria-selected={ariaSelected ?? active}
  >
    <div className="sidebar-item-content">
      <span className="sidebar-icon">{icon}</span>
      <span className="sidebar-label">{label}</span>
    </div>
  </button>
);

const SidebarSection: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="sidebar-section">
    <div className="sidebar-section-items">{children}</div>
  </div>
);

interface SidebarProps {
  currentTab: AppTab;
  setCurrentTab: (tab: AppTab) => void;
}

export default function Sidebar({ currentTab, setCurrentTab }: SidebarProps) {
  const startWindowDrag = (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0 || (event.target instanceof HTMLElement && event.target.closest("button"))) {
      return;
    }

    if ("__TAURI_INTERNALS__" in window) {
      void getCurrentWindow().startDragging();
    }
  };

  return (
    <aside className="sidebar" onPointerDown={startWindowDrag}>
      <div className="sidebar-traffic-lights" data-tauri-drag-region></div>

      <div className="sidebar-menu-items" role="tablist" aria-label="Main Navigation">
        <SidebarSection>
          <SidebarItem
            label="Transfers"
            active={currentTab === AppTab.Transfers}
            onClick={() => setCurrentTab(AppTab.Transfers)}
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="14" width="18" height="6" rx="1" />
                <path d="m16 9-4-4-4 4" />
                <path d="M12 5v9" />
              </svg>
            }
          />
          <SidebarItem
            label="History"
            active={currentTab === AppTab.History}
            onClick={() => setCurrentTab(AppTab.History)}
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            }
          />
        </SidebarSection>
      </div>

      <div className="sidebar-footer">
        <SidebarItem
          label="Settings"
          active={currentTab === AppTab.Settings}
          onClick={() => setCurrentTab(AppTab.Settings)}
          icon={<SettingsIcon />}
          role="link"
        />
      </div>
    </aside>
  );
}
