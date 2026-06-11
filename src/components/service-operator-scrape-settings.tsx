"use client";

import { useEffect, useState } from "react";
import { DEFAULT_OPERATOR_SCRAPE_SETTINGS, type OperatorScrapeSettings } from "@/lib/service-operators/types";

const STORAGE_KEY = "trashd_operator_scrape_settings";

export function ServiceOperatorScrapeSettings() {
  const [settings, setSettings] = useState<OperatorScrapeSettings>(DEFAULT_OPERATOR_SCRAPE_SETTINGS);
  const [status, setStatus] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSettings({ ...DEFAULT_OPERATOR_SCRAPE_SETTINGS, ...(JSON.parse(raw) as OperatorScrapeSettings) });
    } catch {
      // ignore
    }
    setLoaded(true);
  }, []);

  function update<K extends keyof OperatorScrapeSettings>(key: K, value: OperatorScrapeSettings[K]) {
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
          <p className="muted">
            Configure how the hourly scraper collects service provider contacts (7am–7pm PT).
          </p>
        </div>
      </div>

      <div className="realtor-settings-grid">
        <div className="card form-panel realtor-settings-card">
          <h3>Max contacts per hour</h3>
          <p className="muted setting-hint">
            Service provider contacts (movers / junk removal) to collect each hourly run.
          </p>
          <div className="slider-field">
            <div className="slider-row">
              <input
                className="setting-slider"
                max={200}
                min={1}
                step={1}
                type="range"
                value={settings.maxLeadsPerHour}
                onChange={(e) => update("maxLeadsPerHour", Number(e.target.value))}
              />
              <input
                className="slider-number"
                max={200}
                min={1}
                type="number"
                value={settings.maxLeadsPerHour}
                onChange={(e) =>
                  update("maxLeadsPerHour", Math.min(200, Math.max(1, Number(e.target.value))))
                }
              />
            </div>
            <div className="slider-labels">
              <span>1</span>
              <span>100</span>
              <span>200</span>
            </div>
          </div>
        </div>

        <div className="card form-panel realtor-settings-card">
          <h3>Emails queued per run</h3>
          <p className="muted setting-hint">
            New operators added to the send queue each hourly run. Emails are dispatched randomly across your send window — not all at once.
          </p>
          <div className="slider-field">
            <div className="slider-row">
              <input
                className="setting-slider"
                max={50}
                min={0}
                step={1}
                type="range"
                value={settings.maxEmailsPerRun}
                onChange={(e) => update("maxEmailsPerRun", Number(e.target.value))}
              />
              <input
                className="slider-number"
                max={50}
                min={0}
                type="number"
                value={settings.maxEmailsPerRun}
                onChange={(e) =>
                  update("maxEmailsPerRun", Math.min(50, Math.max(0, Number(e.target.value))))
                }
              />
            </div>
            <div className="slider-labels">
              <span>0 (off)</span>
              <span>25</span>
              <span>50</span>
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
