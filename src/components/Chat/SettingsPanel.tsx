import { useState } from "react";
import type { AppSettings } from "../../types";

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

  function save() {
    onSave({ apiKey: apiKey.trim(), model });
    onClose();
  }

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
