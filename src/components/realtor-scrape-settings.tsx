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
      if (raw) setSettings({ ...DEFAULT_REALTOR_SCRAPE_SETTINGS, ...(JSON.parse(raw) as RealtorScrapeSettings) });
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
          <p className="muted setting-hint">Realtor listings with contact info to collect each hourly run.</p>
          <div className="slider-field">
            <div className="slider-row">
              <input
                className="setting-slider"
                max={100}
                min={1}
                step={1}
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
                step={1}
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
          <h3>Emails queued per run</h3>
          <p className="muted setting-hint">
            New realtors added to the send queue each hourly run. Emails are dispatched randomly across your send window — not all at once.
          </p>
          <div className="slider-field">
            <div className="slider-row">
              <input
                className="setting-slider"
                max={20}
                min={0}
                step={1}
                type="range"
                value={settings.maxEmailsPerRun}
                onChange={(e) => update("maxEmailsPerRun", Number(e.target.value))}
              />
              <input
                className="slider-number"
                max={20}
                min={0}
                type="number"
                value={settings.maxEmailsPerRun}
                onChange={(e) => update("maxEmailsPerRun", Math.min(20, Math.max(0, Number(e.target.value))))}
              />
            </div>
            <div className="slider-labels">
              <span>0 (off)</span>
              <span>10</span>
              <span>20</span>
            </div>
          </div>
        </div>

        <div className="card form-panel realtor-settings-card">
          <h3>Send window (PT)</h3>
          <p className="muted setting-hint">
            Emails are dispatched only between these hours (Pacific Time). Currently: {settings.emailWindowStart}am – {settings.emailWindowEnd > 12 ? `${settings.emailWindowEnd - 12}pm` : `${settings.emailWindowEnd}am`}.
          </p>
          <div className="slider-field">
            <label className="slider-sub-label">Start hour</label>
            <div className="slider-row">
              <input
                className="setting-slider"
                max={12}
                min={6}
                step={1}
                type="range"
                value={settings.emailWindowStart}
                onChange={(e) => update("emailWindowStart", Math.min(Number(e.target.value), settings.emailWindowEnd - 1))}
              />
              <span className="slider-number-display">{settings.emailWindowStart}:00</span>
            </div>
            <label className="slider-sub-label">End hour</label>
            <div className="slider-row">
              <input
                className="setting-slider"
                max={20}
                min={13}
                step={1}
                type="range"
                value={settings.emailWindowEnd}
                onChange={(e) => update("emailWindowEnd", Math.max(Number(e.target.value), settings.emailWindowStart + 1))}
              />
              <span className="slider-number-display">{settings.emailWindowEnd > 12 ? `${settings.emailWindowEnd - 12}:00 PM` : `${settings.emailWindowEnd}:00`}</span>
            </div>
          </div>
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
