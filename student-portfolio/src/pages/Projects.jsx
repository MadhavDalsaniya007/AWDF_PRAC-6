import { useEffect, useMemo, useState } from 'react'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'

const GITHUB_USERNAME = 'MadhavDalsaniya007'

function Projects() {
  const [repos, setRepos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  const fetchRepos = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}/repos`)

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }

      const data = await response.json()
      setRepos(data)
    } catch (err) {
      setError(err.message || 'Something went wrong while fetching repositories.')
      setRepos([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRepos()
  }, [])

  const filteredRepos = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()

    if (!term) {
      return repos
    }

    return repos.filter((repo) => repo.name.toLowerCase().includes(term))
  }, [repos, searchTerm])

  return (
    <section className="section">
      <div className="section-heading">
        <p className="section-label">Projects</p>
        <h2>GitHub Repositories</h2>
        <p>Live data from the GitHub API with loading, error, retry, and search support.</p>
      </div>

      <div className="repo-toolbar">
        <label className="repo-search" htmlFor="repo-search">
          <span>Search repositories</span>
          <input
            id="repo-search"
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Filter by repository name"
          />
        </label>
      </div>

      {loading && <LoadingSpinner />}
      {error && !loading && <ErrorMessage message={error} onRetry={fetchRepos} />}

      {!loading && !error && (
        <div className="repo-list">
          {filteredRepos.length > 0 ? (
            filteredRepos.map((repo) => (
              <article key={repo.id} className="project-card">
                <div className="repo-meta">
                  <h3>{repo.name}</h3>
                  <span>{repo.stargazers_count}★</span>
                </div>
                <p>{repo.description || 'No description provided.'}</p>
                <a href={repo.html_url} target="_blank" rel="noreferrer">
                  View on GitHub
                </a>
              </article>
            ))
          ) : (
            <div className="empty-state">
              <h3>No repositories match your search.</h3>
              <p>Try a different keyword.</p>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export default Projects
