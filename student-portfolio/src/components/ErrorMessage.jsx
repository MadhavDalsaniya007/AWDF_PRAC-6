function ErrorMessage({ message, onRetry }) {
  return (
    <div className="error-card" role="alert">
      <h3>Unable to load repositories</h3>
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="cta-button secondary" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  )
}

export default ErrorMessage
