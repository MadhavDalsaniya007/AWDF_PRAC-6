import { useState } from 'react';
import { generateAiDescription } from '../api';

export default function TaskForm({ onCreate, creating }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState(null);
  const [cooldown, setCooldown] = useState(0);

  const handleGenerateAi = async () => {
    if (!title.trim()) {
      setAiMessage({
        type: 'warning',
        text: 'Please enter a task title first so AI can generate a description.',
      });
      return;
    }

    setAiLoading(true);
    setAiMessage(null);

    try {
      const data = await generateAiDescription(title.trim());

      if (data?.description) {
        setDescription(data.description);
        if (data.fallback) {
          setAiMessage({
            type: 'info',
            text: data.message || 'AI fallback active: offline suggestion applied. Edit as needed.',
          });
        } else {
          setAiMessage({
            type: 'success',
            text: `✨ AI suggestion generated (${data.provider || 'AI'}). Editable below:`,
          });
        }
      } else {
        setAiMessage({
          type: 'warning',
          text: data?.message || 'No AI description returned. You can write your description manually.',
        });
      }

      // Start 5-second button cooldown to prevent quota exhaustion
      setCooldown(5);
      const interval = setInterval(() => {
        setCooldown((c) => {
          if (c <= 1) {
            clearInterval(interval);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    } catch {
      setAiMessage({
        type: 'info',
        text: 'AI service unavailable. Graceful degradation active: enter description manually.',
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onCreate({ title: title.trim(), description: description.trim() });
    setTitle('');
    setDescription('');
    setAiMessage(null);
  };

  return (
    <div className="task-form-card">
      <form className="task-form" onSubmit={handleSubmit}>
        <div className="form-row">
          <input
            className="input-title"
            type="text"
            placeholder="Task title (e.g., Update user profile page)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <button
            type="button"
            className="btn btn-ai"
            onClick={handleGenerateAi}
            disabled={aiLoading || !title.trim() || cooldown > 0}
            title="Auto-generate an editable description based on task title"
          >
            {aiLoading ? (
              <>
                <span className="spinner-inline" /> Generating...
              </>
            ) : cooldown > 0 ? (
              `Wait ${cooldown}s`
            ) : (
              '✨ Generate description'
            )}
          </button>
        </div>

        <div className="form-row">
          <textarea
            className="input-description"
            rows="2"
            placeholder="Description (optional - click 'Generate description' to auto-suggest)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <button className="btn btn-primary btn-submit" type="submit" disabled={creating}>
            {creating ? 'Adding...' : 'Add Task'}
          </button>
        </div>
      </form>

      {/* AI Status / Fallback Notice */}
      {aiMessage && (
        <div className={`ai-alert ai-alert-${aiMessage.type}`}>
          <span>{aiMessage.text}</span>
          <button
            type="button"
            className="ai-alert-close"
            onClick={() => setAiMessage(null)}
            aria-label="Dismiss alert"
          >
            ×
          </button>
        </div>
      )}

      {/* Responsible AI Disclaimer (Supplementary Problem Requirement) */}
      <div className="ai-disclaimer">
        <span className="ai-disclaimer-icon">ℹ️</span>
        <span>
          <strong>Responsible AI Notice:</strong> Suggestions are generated via external AI models (or offline fallback).
          Always review and edit descriptions before saving. Never submit sensitive personal data (PII) or secrets.
        </span>
      </div>
    </div>
  );
}
