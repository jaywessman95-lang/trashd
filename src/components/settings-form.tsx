"use client";

import { useState } from "react";
import { SOURCES } from "@/lib/config/sources";

export function SettingsForm() {
  const [status, setStatus] = useState("");

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
