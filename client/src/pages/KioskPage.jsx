import { useState, useEffect, useRef, useCallback } from 'react'
import socket from '../socket'

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export default function KioskPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [feed, setFeed] = useState({ categories: [], results: {} })
  const [queue, setQueue] = useState([])
  const [currentSong, setCurrentSong] = useState(null)
  const [currentPrep, setCurrentPrep] = useState(null)
  const [settings, setSettings] = useState(null)

  // Modal state
  const [selectedVideo, setSelectedVideo] = useState(null)
  const [singerName, setSingerName] = useState('')
  const [adding, setAdding] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  const [toast, setToast] = useState(null)
  const toastRef = useRef(null)

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type })
    clearTimeout(toastRef.current)
    toastRef.current = setTimeout(() => setToast(null), 3000)
  }, [])

  const debouncedQuery = useDebounce(query, 450)

  useEffect(() => {
    fetch('/api/feed')
      .then(r => r.json())
      .then(data => { if (!data.error) setFeed(data) })
      .catch(err => console.error('Failed to load feed', err))

    fetch('/api/settings')
      .then(r => r.json())
      .then(data => { if (!data.error) setSettings(data) })
      .catch(err => console.error('Failed to load settings', err))
  }, [])

  useEffect(() => {
    const onSync = ({ queue: q, currentSong: cs, currentPrep: cp }) => {
      setQueue(q); setCurrentSong(cs); setCurrentPrep(cp)
    }
    const onQueueUpdated = ({ queue: q, currentSong: cs, currentPrep: cp }) => {
      setQueue(q); setCurrentSong(cs); setCurrentPrep(cp)
    }
    const onSongPlay = ({ currentSong: cs, queue: q }) => {
      setCurrentSong(cs); setQueue(q); setCurrentPrep(null)
    }
    const onSongPrep = ({ currentPrep: cp, queue: q }) => {
      setCurrentPrep(cp); setQueue(q)
    }

    socket.on('state:sync', onSync)
    socket.on('queue:updated', onQueueUpdated)
    socket.on('song:play', onSongPlay)
    socket.on('song:prep', onSongPrep)

    return () => {
      socket.off('state:sync', onSync)
      socket.off('queue:updated', onQueueUpdated)
      socket.off('song:play', onSongPlay)
      socket.off('song:prep', onSongPrep)
    }
  }, [])

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.trim().length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) showToast(data.error, 'error')
        else setResults(data.items || [])
      })
      .catch(() => showToast('Search failed', 'error'))
      .finally(() => setLoading(false))
  }, [debouncedQuery, showToast])

  const handleAdd = () => {
    if (!selectedVideo || !singerName.trim()) return
    setAdding(true)
    socket.emit('queue:add', {
      videoId: selectedVideo.videoId,
      title: selectedVideo.title,
      thumbnail: selectedVideo.thumbnail,
      channel: selectedVideo.channel,
      singerName: singerName.trim(),
    })
    setTimeout(() => {
      setAdding(false)
      setSelectedVideo(null)
      setSingerName('')
      showToast(`🎤 "${singerName.trim()}" added to queue!`)
    }, 400)
  }

  const allQueueItems = currentSong ? [currentSong, ...queue] : queue

  return (
    <div className="kiosk-root two-column">
      {/* Ambient background particles */}
      <div className="bg-anim bg-anim-1">🎵</div>
      <div className="bg-anim bg-anim-2">🎤</div>
      <div className="bg-anim bg-anim-3">🎶</div>
      <div className="bg-anim bg-anim-4">✨</div>

      {toast && <div className={`toast ${toast.type === 'error' ? 'error' : ''}`}>{toast.msg}</div>}

      <main className="kiosk-main">
        <header className="kiosk-header">
          <div className="kiosk-logo">
             <img src={settings?.logoPath || "/logo.png"} alt="Vibe Sessions" className="brand-logo" />
          </div>
          <p className="kiosk-subtitle">{settings?.businessName || "Vibe Sessions Karaoke"}</p>
        </header>

        <section className="kiosk-search-section">
          <div className="search-wrapper">
            <span className="search-icon">🔍</span>
            <input className="search-input" type="text" placeholder="Search for a song…" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} />
            {query && <button className="search-clear" onClick={() => { setQuery(''); setResults([]) }}>✕</button>}
          </div>
        </section>

        {/* Dynamic Feed */}
        {!query && feed.categories.length > 0 && (
          <section className="feed-section">
            {feed.categories.map((catName) => (
              feed.results[catName] && feed.results[catName].length > 0 && (
                <div key={catName} className="feed-row-wrapper">
                  <h3 className="feed-row-title">{catName}</h3>
                  <div className="feed-row">
                    {feed.results[catName].map((video) => (
                      <div key={video.videoId} className="feed-card" onClick={() => setSelectedVideo(video)}>
                        <div className="card-thumb-container"><img className="feed-card-thumb" src={video.thumbnail} alt={video.title} loading="lazy" /></div>
                        <div className="feed-card-info">
                          <div className="feed-card-title" title={video.title}>{video.title}</div>
                          <div className="feed-card-channel">{video.channel}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            ))}
          </section>
        )}

        {/* Netflix Grid Search Results */}
        {query && (loading || results.length > 0) && (
          <section className="kiosk-results-section">
            {results.length > 0 && <p className="kiosk-results-label">{results.length} results</p>}
            {loading ? (
              <div className="search-loading">
                {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="skeleton-card" />)}
              </div>
            ) : (
              <div className="netflix-grid">
                {results.map((video) => (
                  <div key={video.videoId} className="grid-card" onClick={() => setSelectedVideo(video)}>
                    <div className="card-thumb-container">
                      <img className="grid-card-thumb" src={video.thumbnail} alt={video.title} loading="lazy" />
                      <div className="grid-card-overlay"><span className="add-icon">+</span></div>
                    </div>
                    <div className="grid-card-info">
                      <div className="grid-card-title" title={video.title}>{video.title}</div>
                      <div className="grid-card-channel">{video.channel}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* Floating Glass Queue Sidebar */}
      <aside className="kiosk-sidebar glass-panel">
        <div className="sidebar-header">
          <h3>Queue</h3>
          {allQueueItems.length > 0 && <span className="badge">{allQueueItems.length}</span>}
        </div>
        
        {currentSong && !currentPrep && (
           <div className="kiosk-now-playing-controls">
              <button className="kiosk-cancel-btn oneplus-orange" onClick={() => setShowCancelConfirm(true)}>
                 <span className="skip-icon">✕</span> Cancel Current Song
              </button>
           </div>
        )}
        
        {currentPrep && (
          <div className="prep-alert-box">
             <div className="prep-alert-title">Up Next in {currentPrep.timeLeft}s</div>
             <div className="prep-alert-singer">{currentPrep.song.singerName}</div>
             <div className="prep-alert-song">{currentPrep.song.title}</div>
          </div>
        )}

        <div className="sidebar-queue-list">
          {allQueueItems.length === 0 ? (
            <div className="empty-queue">
              <span className="empty-icon">🎵</span>
              <p>Be the first to sing!</p>
            </div>
          ) : (
            allQueueItems.map((item, i) => (
              <div key={item.id} className={`sidebar-queue-item ${i === 0 && currentSong ? 'playing' : ''}`}>
                <div className="queue-position">{i === 0 ? '▶' : i}</div>
                <img className="queue-thumb" src={item.thumbnail} alt={item.title} loading="lazy" />
                <div className="queue-info">
                  <div className="queue-title">{item.title}</div>
                  <div className="queue-singer">{item.singerName}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Add Modal */}
      {selectedVideo && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setSelectedVideo(null) }}>
          <div className="modal-sheet">
            <div className="sheet-handle" />
            <div className="sheet-preview">
              <img className="sheet-preview-thumb" src={selectedVideo.thumbnail} alt={selectedVideo.title} />
              <div>
                <div className="sheet-preview-title">{selectedVideo.title}</div>
                <div className="sheet-preview-channel">{selectedVideo.channel}</div>
              </div>
            </div>
            <span className="sheet-label">Your Name</span>
            <input className="sheet-name-input" type="text" placeholder="Enter your name…" value={singerName} onChange={(e) => setSingerName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }} autoFocus autoComplete="off" />
            <button className="sheet-add-btn" onClick={handleAdd} disabled={!singerName.trim() || adding}>{adding ? 'Adding…' : '🎤 Add to Queue'}</button>
            <button className="sheet-cancel-btn" onClick={() => setSelectedVideo(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
         <div className="modal-overlay" onClick={() => setShowCancelConfirm(false)}>
            <div className="modal-confirm animate-pop" onClick={e => e.stopPropagation()}>
               <div className="confirm-icon-wrap">
                  <svg viewBox="0 0 24 24" className="confirm-svg">
                     <path fill="currentColor" d="M12,2L1,21H23L12,2M12,6L19.53,19H4.47L12,6M11,10V14H13V10H11M11,16V18H13V16H11Z" />
                  </svg>
                  <span className="confirm-emoji">🛑</span>
               </div>
               <h3 className="LuxeFont">Cancel this song?</h3>
               <p>Are you sure you want to stop the current performance? This cannot be undone.</p>
               <div className="confirm-actions">
                  <button className="confirm-btn-yes" onClick={() => { socket.emit('queue:next'); setShowCancelConfirm(false); }}>Yes, Cancel it</button>
                  <button className="confirm-btn-no" onClick={() => setShowCancelConfirm(false)}>No, Keep Singing</button>
               </div>
            </div>
         </div>
      )}
    </div>
  )
}
