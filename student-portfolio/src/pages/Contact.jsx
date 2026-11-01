import { useState } from 'react'

function Contact() {
  const [message, setMessage] = useState('')
  const [showTips, setShowTips] = useState(true)

  return (
    <section className="section">
      <div className="section-heading">
        <p className="section-label">Contact</p>
        <h2>Let’s Connect</h2>
      </div>
      <p>Tell me about your idea, project, or internship opportunity. I would love to hear from you.</p>

      <button type="button" className="cta-button secondary" onClick={() => setShowTips((value) => !value)}>
        {showTips ? 'Hide Tips' : 'Show Tips'}
      </button>

      {showTips && (
        <div className="help-card">
          <h3>Quick Tips</h3>
          <ul>
            <li>Share your goal or project context.</li>
            <li>Include your preferred contact method.</li>
            <li>Keep your message concise and clear.</li>
          </ul>
        </div>
      )}

      <label className="field-label" htmlFor="message">
        Your message
      </label>
      <input
        id="message"
        type="text"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="Type your message here"
        className="contact-input"
      />

      <p className="char-count">{message.length} / 180 characters</p>
      <p className="message-preview">Preview: {message || 'Your message will appear here.'}</p>
    </section>
  )
}

export default Contact
