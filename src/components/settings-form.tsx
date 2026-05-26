"use client";

import { useEffect, useState } from "react";
import { SCRAPE_COVERAGE_PRESETS } from "@/lib/config/scrape-coverage";
import { SOURCES } from "@/lib/config/sources";

export function SettingsForm() {
  const [status, setStatus] = useState("");
  const [scanningEnabled, setScanningEnabled] = useState(true);
  const [scanningBusy, setScanningBusy] = useState(false);
  const [scanningStatus, setScanningStatus] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadSettings() {
      const response = await fetch("/api/settings");

      if (!response.ok) return;

      const data = (await response.json()) as { settings?: { scanning_enabled?: boolean } | null };

      if (!ignore && data.settings?.scanning_enabled !== undefined) {
        setScanningEnabled(data.settings.scanning_enabled);
      }
    }

    void loadSettings();

    return () => {
      ignore = true;
    };
  }, []);

  async function saveSettings(formData: FormData) {
    const enabledSources = formData.getAll("enabledSources").map(String);
    const payload = {
      cities: String(formData.get("cities") ?? "")
        .split(",")
        .map((city) => city.trim())
        .filter(Boolean),
      radius: Number(formData.get("radius") ?? 25),
      minScore: Number(formData.get("minScore") ?? 80),
      minJobSize: String(formData.get("minJobSize") ?? "medium"),
      enabledSources,
      urgencyPreference: String(formData.get("urgencyPreference") ?? "this_week"),
      leadTypes: formData.getAll("leadTypes").map(String),
      includedKeywords: String(formData.get("includedKeywords") ?? "")
        .split(",")
        .map((keyword) => keyword.trim())
        .filter(Boolean),
      excludedKeywords: String(formData.get("excludedKeywords") ?? "")
        .split(",")
        .map((keyword) => keyword.trim())
        .filter(Boolean),
      maxLeadsPerDay: Number(formData.get("maxLeadsPerDay") ?? 50),
      scrapeCoverage: String(formData.get("scrapeCoverage") ?? "standard"),
      maxListingsPerSource: parseOptionalNumber(formData.get("maxListingsPerSource")),
      maxPagesPerSource: parseOptionalNumber(formData.get("maxPagesPerSource")),
      lookbackHours: parseOptionalNumber(formData.get("lookbackHours")),
      scanningEnabled,
      instantAlertThreshold: Number(formData.get("instantAlertThreshold") ?? 90),
      hideDuplicates: formData.get("hideDuplicates") === "on"
    };

    const response = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    setStatus(response.ok ? "Settings saved" : "Sign in and connect Supabase before saving settings");
  }

  async function toggleScanning() {
    const nextValue = !scanningEnabled;

    setScanningBusy(true);
    setScanningStatus("");

    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scanningEnabled: nextValue })
      });

      if (!response.ok) {
        setScanningStatus("Sign in and connect Supabase before changing scanning.");
        return;
      }

      setScanningEnabled(nextValue);
      setScanningStatus(nextValue ? "Lead scanning started" : "Lead scanning stopped");
    } finally {
      setScanningBusy(false);
    }
  }

  return (
    <form
      className="settings-grid"
      onSubmit={(event) => {
        event.preventDefault();
        void saveSettings(new FormData(event.currentTarget));
      }}
    >
      <section className="card form-panel">
        <h2>Territory</h2>
        <label>
          Cities
          <input defaultValue="Anaheim, Irvine, Santa Ana" name="cities" />
        </label>
        <label>
          Radius
          <input defaultValue="25" min="1" name="radius" type="number" />
        </label>
      </section>

      <section className="card form-panel">
        <h2>Quality</h2>
        <label>
          Minimum score
          <select defaultValue="80" name="minScore">
            <option value="70">70 - Good Lead</option>
            <option value="80">80 - Strong Lead</option>
            <option value="90">90 - HOT NOW</option>
          </select>
        </label>
        <label>
          Minimum job size
          <select defaultValue="medium" name="minJobSize">
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </label>
      </section>

      <section className="card form-panel">
        <h2>Sources</h2>
        <div className="checkbox-list">
          {SOURCES.map((source) => (
            <label className="checkbox-row" key={source.id}>
              <input defaultChecked name="enabledSources" type="checkbox" value={source.id} />
              <span>{source.label}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="card form-panel scrape-panel">
        <div className="section-title-with-info">
          <h2>Scrape Coverage</h2>
          <InfoTip text="Controls how broadly Trashd checks each website. More coverage can find more jobs, but it may also pull in more low-quality listings to review." />
        </div>
        <div className={`scan-control ${scanningEnabled ? "scan-control-active" : "scan-control-paused"}`}>
          <div>
            <strong>Lead scanning</strong>
            <span>{scanningEnabled ? "Scanning is running on the scheduled lead scrape." : "Scanning is stopped until you start it again."}</span>
          </div>
          <button className="button secondary" disabled={scanningBusy} onClick={toggleScanning} type="button">
            {scanningBusy ? "Updating..." : scanningEnabled ? "Stop Scanning" : "Start Scanning"}
          </button>
        </div>
        {scanningStatus ? <span className="action-status">{scanningStatus}</span> : null}
        <label>
          <span className="label-with-info">
            Searches per day
            <InfoTip text="Controls how many listings Trashd collects across all runs each day. Use Standard for normal daily lead flow, or Deep/Maximum for high-volume markets." />
          </span>
          <select defaultValue="standard" name="scrapeCoverage">
            {SCRAPE_COVERAGE_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label} - {preset.maxListingsPerSource} listings
              </option>
            ))}
          </select>
        </label>
        <details className="advanced-settings">
          <summary className="advanced-settings-toggle">Advanced Settings</summary>
          <div className="coverage-summary" aria-label="Coverage presets">
            {SCRAPE_COVERAGE_PRESETS.map((preset) => (
              <div key={preset.id}>
                <strong>{preset.label}</strong>
                <span>{preset.description}</span>
                <small>
                  {preset.maxPagesPerSource} pages, {preset.lookbackHours}h max age
                </small>
              </div>
            ))}
          </div>
          <div className="advanced-grid advanced-grid-border-top">
            <label>
              <span className="label-with-info">
                Max listings
                <InfoTip text="The most listings Trashd will inspect from each website per day. Higher numbers can uncover more jobs from busy sites like Craigslist." />
              </span>
              <input max="1000" min="1" name="maxListingsPerSource" placeholder="Preset" type="number" />
            </label>
            <label>
              <span className="label-with-info">
                Max pages
                <InfoTip text="How many result pages Trashd can open per website. More pages helps in crowded markets, but the first pages usually contain the freshest leads." />
              </span>
              <input max="25" min="1" name="maxPagesPerSource" placeholder="Preset" type="number" />
            </label>
            <label>
              <span className="label-with-info">
                Maximum listing age
                <InfoTip text="How old a listing can be, in hours. Lower values focus on fresh leads before competitors contact them; higher values can catch older estate or auction jobs." />
              </span>
              <input max="720" min="1" name="lookbackHours" placeholder="Preset hours" type="number" />
            </label>
          </div>
        </details>
      </section>

      <section className="card form-panel">
        <h2>Alerts</h2>
        <label>
          Urgency
          <select defaultValue="this_week" name="urgencyPreference">
            <option value="immediate_only">Immediate only</option>
            <option value="this_week">This week</option>
            <option value="all">All</option>
          </select>
        </label>
        <label>
          Instant alert threshold
          <input defaultValue="90" max="100" min="0" name="instantAlertThreshold" type="number" />
        </label>
        <label>
          Max leads per day
          <input defaultValue="50" min="1" name="maxLeadsPerDay" type="number" />
        </label>
      </section>

      <section className="card form-panel">
        <h2>Keywords</h2>
        <label>
          Include keywords
          <input defaultValue="moving, must go, cleanout" name="includedKeywords" />
        </label>
        <label>
          Exclude keywords
          <input defaultValue="wanted, repair, dealer" name="excludedKeywords" />
        </label>
        <label className="checkbox-row">
          <input defaultChecked name="hideDuplicates" type="checkbox" />
          <span>Hide duplicates</span>
        </label>
      </section>

      <div className="settings-footer">
        <button className="button settings-submit" type="submit">
          Save Settings
        </button>
        {status ? <span className="action-status">{status}</span> : null}
      </div>
    </form>
  );
}

function parseOptionalNumber(value: FormDataEntryValue | null) {
  const parsed = Number(value);
  return value === null || value === "" || Number.isNaN(parsed) ? null : parsed;
}

function InfoTip({ text }: { text: string }) {
  return (
    <details className="info-tip">
      <summary aria-label="More information">i</summary>
      <span>{text}</span>
    </details>
  );
}
