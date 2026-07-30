import { useEffect, useState } from "react";

import {
  listSpikeCaptures,
  saveSpikeCapture,
  type SpikeCapture,
} from "~lib/capture";

function IndexPopup() {
  const [status, setStatus] = useState("Ready");
  const [captures, setCaptures] = useState<SpikeCapture[]>([]);
  const [contextMenusOn, setContextMenusOn] = useState(false);

  useEffect(() => {
    setCaptures(listSpikeCaptures());
    void chrome.permissions
      .contains({ permissions: ["contextMenus"] })
      .then(setContextMenusOn)
      .catch(() => setContextMenusOn(false));
  }, []);

  async function captureActive() {
    setStatus("Capturing…");
    const response = (await chrome.runtime.sendMessage({
      type: "tabby.captureActive",
    })) as { ok: true } | { ok: false; error: string };
    if (!response?.ok) {
      setStatus(response?.error ?? "Capture failed");
      return;
    }
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    // Best-effort local list for UI demo (SW may have closed the tab).
    if (tab?.url) {
      saveSpikeCapture({ title: tab.title ?? "Untitled", url: tab.url });
      setCaptures(listSpikeCaptures());
    }
    setStatus("Captured (spike)");
  }

  async function enableContextMenus() {
    const response = (await chrome.runtime.sendMessage({
      type: "tabby.enableContextMenus",
    })) as { ok: boolean };
    setContextMenusOn(Boolean(response?.ok));
    setStatus(response?.ok ? "Context menu enabled" : "Permission denied");
  }

  return (
    <main
      style={{
        minWidth: 280,
        padding: 16,
        fontFamily: "system-ui, sans-serif",
        color: "#1a1a1a",
      }}
    >
      <h1 style={{ fontSize: 16, margin: "0 0 8px" }}>Tabby (Plasmo spike)</h1>
      <p style={{ fontSize: 12, margin: "0 0 12px", color: "#555" }}>
        Parallel packaging shell — production baseline is still{" "}
        <code>apps/extension</code>.
      </p>
      <p style={{ fontSize: 12, margin: "0 0 12px" }} role="status">
        {status}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button type="button" onClick={() => void captureActive()}>
          Capture active tab
        </button>
        {!contextMenusOn ? (
          <button type="button" onClick={() => void enableContextMenus()}>
            Enable context-menu capture
          </button>
        ) : (
          <p style={{ fontSize: 12, margin: 0 }}>Context menu: on</p>
        )}
      </div>
      {captures.length > 0 ? (
        <ul style={{ fontSize: 12, marginTop: 12, paddingLeft: 16 }}>
          {captures.slice(0, 5).map((c) => (
            <li key={c.id}>
              <a href={c.url} target="_blank" rel="noreferrer">
                {c.title}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  );
}

export default IndexPopup;
