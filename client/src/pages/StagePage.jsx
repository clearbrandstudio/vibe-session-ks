import { useEffect, useState, useRef } from 'react'
import socket from '../socket'

export default function StagePage() {
  const [currentSong, setCurrentSong] = useState(null)
  const [currentPrep, setCurrentPrep] = useState(null)
  const [queue, setQueue] = useState([])
  const [progress, setProgress] = useState(0)
  const [hypeMsg, setHypeMsg] = useState('')
  const [settings, setSettings] = useState(null)
  const playerRef = useRef(null)
  const progressTimer = useRef(null)
  const lastSongId = useRef(null)

  const hypeMessages = [
    "CLAP YOUR FEET! 👏",
    "YOU ARE A STAR! ⭐",
    "WHAT A VOICE! 🎤",
    "KEEP IT GOING! 🔥",
    "LEGENDARY PERFORMANCE! 🏆",
    "CROWD GOES WILD! 🙌"
  ]

  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      const firstScriptTag = document.getElementsByTagName('script')[0]
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag)
    }

    const onSync = ({ currentSong: cs, currentPrep: cp, queue: q }) => {
      setCurrentSong(cs); setCurrentPrep(cp); setQueue(q || [])
    }
    const onPlay = ({ currentSong: cs, queue: q }) => {
      setCurrentSong(cs); setCurrentPrep(null); setQueue(q || [])
    }
    const onPrep = ({ currentPrep: cp, queue: q }) => {
      setCurrentPrep(cp); setQueue(q || [])
    }
    const onQueueUpdate = ({ queue: q }) => setQueue(q || [])

    socket.on('state:sync', onSync)
    socket.on('song:play', onPlay)
    socket.on('song:prep', onPrep)
    socket.on('queue:updated', onQueueUpdate)

    fetch('/api/settings')
      .then(r => r.json())
      .then(data => { if (!data.error) setSettings(data) })
      .catch(err => console.error('Failed to load settings', err))

    return () => {
      socket.off('state:sync', onSync)
      socket.off('song:play', onPlay)
      socket.off('song:prep', onPrep)
      socket.off('queue:updated', onQueueUpdate)
      clearInterval(progressTimer.current)
    }
  }, [])

  // Intelligence: Tracking Song Progress & Auto-Skip Fallback
  useEffect(() => {
    if (!currentSong || currentPrep) {
      clearInterval(progressTimer.current)
      if (!currentPrep) {
         setProgress(0)
         setHypeMsg('')
      }
      return
    }

    progressTimer.current = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getDuration === 'function') {
        const state = playerRef.current.getPlayerState()
        // If playing
        if (state === 1) {
          const time = playerRef.current.getCurrentTime()
          const dur = playerRef.current.getDuration()
          if (dur > 0) {
            const prog = time / dur
            setProgress(prog)

            // Hype Messages at the end (last 10%)
            if (prog > 0.9 && !hypeMsg) {
              setHypeMsg(hypeMessages[Math.floor(Math.random() * hypeMessages.length)])
            } else if (prog < 0.9) {
              setHypeMsg('')
            }

            // AUTO-SKIP FALLBACK: If we are at the very end but YT hasn't fired ENDED
            if (prog > 0.99) {
               console.log("Auto-skip triggered via progress fallback")
               socket.emit('queue:next')
               clearInterval(progressTimer.current)
            }
          }
        }
      }
    }, 1000)

    return () => clearInterval(progressTimer.current)
  }, [currentSong, currentPrep, hypeMsg])

  // Manage YouTube Player Initialization
  useEffect(() => {
    if (currentPrep || !currentSong) return

    const initPlayer = () => {
      // If player already exists and it's a new song, just load it
      if (playerRef.current && typeof playerRef.current.loadVideoById === 'function' && lastSongId.current !== currentSong.videoId) {
        playerRef.current.loadVideoById(currentSong.videoId)
        lastSongId.current = currentSong.videoId
        return
      }

      // Create new player if needed
      if (!playerRef.current || !playerRef.current.loadVideoById) {
        playerRef.current = new window.YT.Player('yt-player', {
          videoId: currentSong.videoId,
          playerVars: { autoplay: 1, controls: 0, disablekb: 1, fs: 0, modestbranding: 1, rel: 0, iv_load_policy: 3 },
          events: {
            onReady: (event) => {
               event.target.playVideo()
               lastSongId.current = currentSong.videoId
            },
            onStateChange: (event) => {
              // event.data 0 is ENDED
              if (event.data === 0) {
                console.log("YouTube ENDED event detected")
                socket.emit('queue:next')
              }
            },
            onError: (err) => {
               console.error("YouTube Player Error:", err)
               // Skip if video is unplayable
               setTimeout(() => socket.emit('queue:next'), 3000)
            }
          }
        })
      }
    }

    if (window.YT && window.YT.Player) {
      initPlayer()
    } else {
      window.onYouTubeIframeAPIReady = initPlayer
    }
  }, [currentSong, currentPrep])

  return (
    <div className="stage-root">
      <div className="billion-dollar-bg">
         <div className="mesh-gradient-1"></div>
         <div className="mesh-gradient-2"></div>
         <div className="mesh-gradient-3"></div>
      </div>

      <div className="stage-topbar">
        <div className="stage-brand luxe">
          <img src={settings?.logoPath || "/logo.png"} alt="Vibe" className="brand-logo" />
          <span className="brand-text">{settings?.businessName || "Vibe Session Studio"}</span>
        </div>
        
        {currentSong && !currentPrep && (
          <div className="stage-performer-orb">
             <div className="orb-glass">
                <svg viewBox="0 0 24 24" className="orb-icon">
                  <path fill="currentColor" d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" />
                </svg>
             </div>
             <div className="orb-info LuxeFont">
                <span className="orb-label">NOW SINGING</span>
                <span className="orb-name">{currentSong.singerName}</span>
             </div>
          </div>
        )}
      </div>

      <div className="stage-content">
        {currentPrep ? (
          <div className="obs-stinger-sequence">
             {/* Stage 1: The 5s 3D Wipe (Name Reveal) */}
             {currentPrep.timeLeft > 15 && (
               <div className="obs-stinger">
                 <div className="stinger-bg top-flap" />
                 <div className="stinger-bg bottom-flap" />
                 <div className="stinger-content">
                   <div className="stinger-label">GET READY</div>
                   <div className="stinger-singer">{currentPrep.song.singerName}</div>
                   <div className="stinger-song">{currentPrep.song.title}</div>
                 </div>
               </div>
             )}

             {/* Stage 2: The 15s Countdown (Preparation) */}
             {currentPrep.timeLeft <= 15 && (
               <div className="prep-ui-box glass-panel animate-in">
                  <div className="countdown-ring">
                     <svg viewBox="0 0 100 100">
                        <circle className="ring-bg" cx="50" cy="50" r="45" />
                        <circle className="ring-progress" cx="50" cy="50" r="45" 
                                style={{ strokeDashoffset: 283 - (283 * (currentPrep.timeLeft / 15)) }} />
                     </svg>
                     <div className="countdown-number">{currentPrep.timeLeft}</div>
                  </div>
                  <div className="prep-details">
                     <h2 className="LuxeFont">Pass the Mic!</h2>
                     <p>"{currentPrep.song.title}"</p>
                     <div className="prep-singer-sub">Upcoming: {currentPrep.song.singerName}</div>
                  </div>
               </div>
             )}
          </div>
        ) : (
          <>
            {currentSong && (
              <div className="stage-player-wrapper full">
                 <div id="yt-player" />
                 
                 {/* Intelligence: Dynamic Marquee at 50% */}
                 {progress > 0.4 && progress < 0.6 && queue.length > 0 && (
                    <div className="streamer-marquee slide-up">
                       <span className="marquee-tag">COMING UP NEXT</span>
                       <span className="marquee-text LuxeFont">{queue[0].singerName} — {queue[0].title}</span>
                    </div>
                 )}

                 {/* Intelligence: Hype text at end */}
                 {hypeMsg && (
                    <div className="hype-overlay-text jitter">
                       {hypeMsg}
                    </div>
                 )}
              </div>
            )}

            {!currentSong && (
              <div className="kinetic-idle">
                 <div className="kinetic-text-wrap">
                    <div className="kinetic-row r1">SING WITH YOUR HEART</div>
                    <div className="kinetic-row r2">WHO'S NEXT ON THE MIC?</div>
                    <div className="kinetic-row r3">VIBE SESSION STUDIO</div>
                 </div>
                 <div className="idle-instruction">
                    Scan to start: <strong>{window.location.hostname}:3001/kiosk</strong>
                 </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
