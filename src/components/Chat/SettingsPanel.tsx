import { useState } from "react";
import type { AppSettings } from "../../types";
import { testConnection } from "../../lib/sync";

type Props = {
  settings: AppSettings;
  onSave: (s: AppSettings) => void;
  onClose: () => void;
};

const MODELS = [
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
  { id: "claude-opus-4-7", label: "Claude Opus 4.7" },
  { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
];

export function SettingsPanel({ settings, onSave, onClose }: Props) {
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [model, setModel] = useState(settings.model);
  const [gistToken, setGistToken] = useState(settings.gistToken);
  const [gistId, setGistId] = useState(settings.gistId);
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const [testErr, setTestErr] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  function save() {
    onSave({
      apiKey: apiKey.trim(),
      model,
      gistToken: gistToken.trim(),
      gistId: gistId.trim(),
    });
    onClose();
  }

  async function onTest() {
    setTesting(true);
    setTestMsg(null);
    setTestErr(null);
    try {
      const msg = await testConnection({
        token: gistToken.trim(),
        id: gistId.trim(),
      });
      setTestMsg(msg);
    } catch (e) {
      setTestErr(e instanceof Error ? e.message : String(e));
    } finally {
      setTesting(false);
    }
  }

  const canTest = gistToken.trim().length > 0 && gistId.trim().length > 0;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Settings</h2>
        <label>
          Anthropic API key
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-ant-..."
            autoFocus
          />
          <small>Stored only in your browser's localStorage.</small>
        </label>
        <label>
          Model
          <select value={model} onChange={(e) => setModel(e.target.value)}>
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>

        <div className="settings-section-title">Sync (GitHub Gist)</div>

        <label>
          GitHub token
          <input
            type="password"
            value={gistToken}
            onChange={(e) => setGistToken(e.target.value)}
            placeholder="github_pat_..."
          />
          <small>
            Create a fine-grained or classic PAT with the <code>gist</code> scope at
            github.com/settings/tokens. Stored in localStorage on this device.
          </small>
        </label>

        <label>
          Gist ID
          <input
            type="text"
            value={gistId}
            onChange={(e) => setGistId(e.target.value)}
            placeholder="e.g. 1a2b3c4d5e6f..."
          />
          <small>
            Create a private gist containing a file named <code>list.json</code>{" "}
            (initial content can be <code>{"{}"}</code>) and paste its ID here. The ID
            is the long hex in the gist URL.
          </small>
        </label>

        <div className="test-row">
          <button
            className="btn"
            onClick={onTest}
            disabled={!canTest || testing}
            type="button"
          >
            {testing ? "Testing…" : "Test connection"}
          </button>
          {testMsg && <span className="test-ok">{testMsg}</span>}
          {testErr && <span className="test-err">{testErr}</span>}
        </div>

        <div className="modal-actions">
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn approve" onClick={save}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
