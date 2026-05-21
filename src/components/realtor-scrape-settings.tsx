"use client";

import { useEffect, useState } from "react";
import { DEFAULT_REALTOR_SCRAPE_SETTINGS, type RealtorScrapeSettings } from "@/lib/sold-homes/types";

const STORAGE_KEY = "trashd_realtor_scrape_settings";

export function RealtorScrapeSettings() {
  const [settings, setSettings] = useState<RealtorScrapeSettings>(DEFAULT_REALTOR_SCRAPE_SETTINGS);
  const [status, setStatus] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSettings(JSON.parse(raw) as RealtorScrapeSettings);
    } catch {
      // ignore
    }
    setLoaded(true);
  }, []);

  function update<K extends keyof RealtorScrapeSettings>(key: K, value: RealtorScrapeSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setStatus("");
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      setStatus("Settings saved");
    } catch {
      setStatus("Could not save settings");
    }
  }

  if (!loaded) return null;

  return (
    <section className="container realtor-settings-section">
      <div className="realtor-settings-header">
        <div>
          <h2>Scrape Parameters</h2>
          <p className="muted">Configure how the hourly scraper collects realtor sold listings (6am–8pm PT).</p>
        </div>
      </div>

      <div className="realtor-settings-grid">
        <div className="card form-panel realtor-settings-card">
          <h3>Max contacts per session</h3>
          <p className="muted setting-hint">Realtor listings with contact info to collect each hourly run. Listings without contact are skipped when "Require contact" is on.</p>
          <div className="slider-field">
            <div className="slider-row">
              <input
                className="setting-slider"
                max={100}
                min={1}
                type="range"
                value={settings.maxContactsPerSession}
                onChange={(e) => update("maxContactsPerSession", Number(e.target.value))}
              />
              <input
                className="slider-number"
                max={100}
                min={1}
                type="number"
                value={settings.maxContactsPerSession}
                onChange={(e) => update("maxContactsPerSession", Math.min(100, Math.max(1, Number(e.target.value))))}
              />
            </div>
            <div className="slider-labels">
              <span>1</span>
              <span>50</span>
              <span>100</span>
            </div>
          </div>
        </div>

        <div className="card form-panel realtor-settings-card">
          <h3>Max days since sold</h3>
          <p className="muted setting-hint">Only include listings sold within this many days. Older listings have lower conversion probability.</p>
          <div className="slider-field">
            <div className="slider-row">
              <input
                className="setting-slider"
                max={30}
                min={1}
                type="range"
                value={settings.maxDaysSold}
                onChange={(e) => update("maxDaysSold", Number(e.target.value))}
              />
              <input
                className="slider-number"
                max={30}
                min={1}
                type="number"
                value={settings.maxDaysSold}
                onChange={(e) => update("maxDaysSold", Math.min(30, Math.max(1, Number(e.target.value))))}
              />
            </div>
            <div className="slider-labels">
              <span>1 day</span>
              <span>15 days</span>
              <span>30 days</span>
            </div>
          </div>
        </div>

        <div className="card form-panel realtor-settings-card">
          <h3>Require contact info</h3>
          <p className="muted setting-hint">Skip listings that have no agent phone or email. Disabling this collects all sold listings regardless of contact availability.</p>
          <label className="toggle-row">
            <div className={`toggle-switch ${settings.requireContact ? "toggle-on" : ""}`}>
              <input
                checked={settings.requireContact}
                type="checkbox"
                onChange={(e) => update("requireContact", e.target.checked)}
              />
              <span className="toggle-thumb" />
            </div>
            <span className="toggle-label">{settings.requireContact ? "Skip listings without contact" : "Include all listings"}</span>
          </label>
        </div>
      </div>

      <div className="realtor-settings-footer">
        <button className="button secondary" type="button" onClick={save}>
          Save Parameters
        </button>
        {status ? <span className="action-status">{status}</span> : null}
      </div>
    </section>
  );
}
