function LoadingSpinner({ message = 'Loading repositories...' }) {
  return (
    <div className="spinner-card" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      <p>{message}</p>
    </div>
  )
}

export default LoadingSpinner
