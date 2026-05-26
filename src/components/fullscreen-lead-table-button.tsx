"use client";

export const OPEN_LEAD_TABLE_FULLSCREEN = "trashd:open-lead-table-fullscreen";

export function FullscreenLeadTableButton() {
  return (
    <button
      className="small-button lead-table-expand-btn"
      onClick={() => window.dispatchEvent(new Event(OPEN_LEAD_TABLE_FULLSCREEN))}
      title="Full page"
      type="button"
    >
      Full Page
    </button>
  );
}
