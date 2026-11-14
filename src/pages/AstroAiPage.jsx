import { useState, useRef, useEffect } from 'react'
import { fetchAstroAiChat } from '../lib/spherexApi'

export default function AstroAiPage({
  selectedObject,
  archiveData,
  onNavigate,
  onSelectTarget,
}) {
  const messageCounterRef = useRef(100)
  const [messages, setMessages] = useState([
    {
      id: 'msg-1',
      sender: 'user',
      text: 'Why does Betelgeuse look so bright in infrared?',
      time: '2 mins ago',
    },
    {
      id: 'msg-2',
      sender: 'ai',
      band: 'SPHEREx Band 3.5 µm',
      source: 'Astro AI • SPHEREx Synchronized',
      text: 'Great question! Betelgeuse is a cool red supergiant star surrounded by giant clouds of warm cosmic dust. While our eyes only see some of its visible light, NASA’s infrared telescopes like SPHEREx see the warm dust glowing brightly like heat from a cozy campfire in the dark!',
      miniCard: {
        title: 'Alpha Orionis',
        subtitle: 'Distance: ~642.5 Light-Years',
        imageUrl: 'https://images-assets.nasa.gov/image/PIA23646/PIA23646~thumb.jpg',
        metricLabel: 'THERMAL HEAT PEAK',
        metricValue: '3,600 K',
      },
      suggestions: [
        { label: 'Show in Sky Explorer', action: 'explore' },
        { label: 'Compare observations over time', action: 'timemachine' },
        { label: 'Explain the 2019 Great Dimming', action: 'dimming' },
      ],
      followUpQuestions: [
        'Explain the 2019 Great Dimming',
        'When will Betelgeuse go supernova?',
        'How does SPHEREx observe cosmic dust?',
      ],
    },
  ])

  const [inputText, setInputText] = useState('')
  const [speakAloud, setSpeakAloud] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [speakingMsgId, setSpeakingMsgId] = useState(null)
  const [errorNotice, setErrorNotice] = useState(null)
  const chatBottomRef = useRef(null)

  const activeTargetName = selectedObject?.name || 'Betelgeuse'

  const starterQuestions = [
    { label: 'What is this star?', query: `Tell me about ${activeTargetName} and what kind of celestial object it is.` },
    { label: 'How far away is it?', query: `How far away is ${activeTargetName} from Earth, and how do astronomers measure cosmic distances?` },
    { label: 'Why does space change?', query: 'Why does space change over time, and how do multi-epoch infrared surveys spot movement?' },
    { label: 'What am I seeing in this NASA image?', query: 'What am I seeing in this NASA SPHEREx spectral image, and why is it pixelated at 6.155 arcseconds?' },
    { label: 'Explain infrared light in simple words!', query: 'Can you explain infrared light in simple words like I am 12 years old?' },
  ]

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Cleanup speech synthesis on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  async function handleSend(queryText) {
    const q = queryText || inputText
    if (!q.trim() || isLoading) return

    setErrorNotice(null)
    messageCounterRef.current += 1
    const userMsg = {
      id: `user-${messageCounterRef.current}`,
      sender: 'user',
      text: q,
      time: 'Just now',
    }

    setMessages((prev) => [...prev, userMsg])
    setInputText('')
    setIsLoading(true)

    // Build rich context from target catalog & live SPHEREx observation telemetry
    const context = {
      name: selectedObject?.name,
      designation: selectedObject?.designation,
      distance: selectedObject?.distance,
      category: selectedObject?.category,
      ra: selectedObject?.ra,
      dec: selectedObject?.dec,
      summary: selectedObject?.summary,
      whatToLookFor: selectedObject?.whatToLookFor,
      ...(archiveData ? {
        observation_count: archiveData.count,
        bands: archiveData.comparable?.bands?.map(b => b.bandpass).join(', '),
        earliest_date: archiveData.comparable?.bands?.[0]?.earliest,
        latest_date: archiveData.comparable?.bands?.[0]?.latest,
        repeat_coverage_found: archiveData.comparable?.repeat_coverage_found,
        span_days: archiveData.comparable?.bands?.[0]?.span_days,
      } : {}),
    }

    // Prepare multi-turn conversational history
    const history = messages
      .filter((m) => m.text)
      .map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      }))
      .slice(-8)

    try {
      const response = await fetchAstroAiChat({
        message: q,
        targetId: selectedObject?.id || null,
        context,
        history,
      })

      messageCounterRef.current += 1
      const aiMsg = {
        id: `ai-${messageCounterRef.current}`,
        sender: 'ai',
        band: response.band || 'SPHEREx Calibration Level 2',
        source: response.source || 'Astro AI',
        text: response.text,
        miniCard: response.target_card
          ? {
              title: response.target_card.title,
              subtitle: response.target_card.subtitle,
              imageUrl: response.target_card.image_url,
              metricLabel: response.target_card.metric_label,
              metricValue: response.target_card.metric_value,
            }
          : null,
        suggestions: response.suggestions || [],
        followUpQuestions: response.follow_up_questions || [],
      }

      setMessages((prev) => [...prev, aiMsg])

      if (speakAloud) {
        speakText(response.text, aiMsg.id)
      }
    } catch (err) {
      if (err.message && err.message.toLowerCase().includes('rate limit')) {
        setErrorNotice('Rate limit reached: Please wait a moment before sending another message to Astro AI.')
      }

      // Graceful offline/client fallback
      messageCounterRef.current += 1
      const fallback = generateEducationalResponse(q, selectedObject)
      const aiMsg = {
        id: `ai-${messageCounterRef.current}`,
        sender: 'ai',
        band: 'SPHEREx Calibration Level 2',
        source: 'Astro AI • Offline Mode',
        text: fallback.text,
        miniCard: fallback.miniCard,
        suggestions: fallback.suggestions,
        followUpQuestions: fallback.followUpQuestions || [],
      }
      setMessages((prev) => [...prev, aiMsg])

      if (speakAloud) {
        speakText(fallback.text, aiMsg.id)
      }
    } finally {
      setIsLoading(false)
    }
  }

  function speakText(text, msgId) {
    if (!('speechSynthesis' in window)) return

    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel()
      setSpeakingMsgId(null)
      return
    }

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1.0
    utterance.pitch = 1.05

    utterance.onstart = () => {
      setSpeakingMsgId(msgId)
    }
    utterance.onend = () => {
      setSpeakingMsgId(null)
    }
    utterance.onerror = () => {
      setSpeakingMsgId(null)
    }

    window.speechSynthesis.speak(utterance)
  }

  function handleVoiceToggle() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Speech recognition is not natively supported in this browser. Please type your question in the text bar!')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.interimResults = false

    if (!isListening) {
      setIsListening(true)
      recognition.start()
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        setIsListening(false)
        setInputText(transcript)
        handleSend(transcript)
      }
      recognition.onerror = () => {
        setIsListening(false)
      }
      recognition.onend = () => {
        setIsListening(false)
      }
    } else {
      setIsListening(false)
      recognition.stop()
    }
  }

  function handleSuggestionClick(sug) {
    if (sug.action === 'explore') {
      onSelectTarget?.(selectedObject?.id || 'betelgeuse')
      onNavigate?.('explore')
    } else if (sug.action === 'timemachine') {
      onSelectTarget?.(selectedObject?.id || 'betelgeuse')
      onNavigate?.('explore')
      setTimeout(() => {
        window.scrollTo({ top: 900, behavior: 'smooth' })
      }, 150)
    } else if (sug.action === 'learn') {
      onNavigate?.('learn')
    } else if (sug.action === 'dimming') {
      handleSend('Explain the 2019 Great Dimming of Betelgeuse in detail.')
    } else if (sug.label) {
      handleSend(sug.label)
    }
  }

  return (
    <div className="space-y-10 py-4 sm:py-8 max-w-5xl mx-auto px-4">
      {/* 1. Header Badges */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-950/30 px-3.5 py-1 text-xs text-purple-300">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-mono text-[0.68rem] tracking-wider uppercase">
            ASTRO CORE V2.4 • SPHEREx SYNCHRONIZED
          </span>
        </div>

        {/* Voice Enabled Pill */}
        <div className="flex items-center gap-2 rounded-full border border-line bg-panel/60 px-3 py-1 text-xs text-slate-300">
          <span>{speakingMsgId ? '🔊' : '🔈'}</span>
          <span className="text-[0.72rem]">
            {speakingMsgId ? 'Speaking Aloud...' : isListening ? 'Listening for speech...' : 'Voice Enabled • Listen Aloud'}
          </span>
          <div className="flex items-center gap-0.5">
            <span className={`h-2 w-0.5 bg-cyan-400 ${speakingMsgId || isListening ? 'animate-pulse' : 'opacity-40'}`} />
            <span className={`h-3 w-0.5 bg-cyan-400 ${speakingMsgId || isListening ? 'animate-pulse delay-75' : 'opacity-40'}`} />
            <span className={`h-1.5 w-0.5 bg-cyan-400 ${speakingMsgId || isListening ? 'animate-pulse delay-150' : 'opacity-40'}`} />
          </div>
        </div>
      </div>

      {/* 2. Central AI Avatar Orb */}
      <section className="text-center space-y-4">
        {/* Animated Glowing Orb with Digital Eyes */}
        <div className="relative inline-flex items-center justify-center">
          {/* Ambient Glow Halo */}
          <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-purple-600/30 via-pink-600/20 to-cyan-500/30 blur-xl" />

          {/* The Orb Body */}
          <div className={`relative flex h-28 w-28 items-center justify-center rounded-full border-2 border-purple-400/50 bg-gradient-to-br from-[#1d1238] via-[#0d1429] to-[#040817] shadow-[0_0_50px_rgba(168,85,247,0.5)] ${isLoading ? 'animate-pulse scale-105' : 'animate-orb-glow'} transition duration-300`}>
            {/* Expressive Digital Cyan Eyes */}
            <div className="flex items-center gap-3">
              <span className={`h-6 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_12px_#22d3ee] ${isLoading ? 'animate-ping' : 'animate-eye-blink'}`} />
              <span className={`h-6 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_12px_#22d3ee] ${isLoading ? 'animate-ping' : 'animate-eye-blink'}`} />
            </div>

            {/* Orbiting Sparkle */}
            <span className="absolute top-2 right-2 text-xs text-purple-300 animate-spin">✦</span>
          </div>
        </div>

        <div className="space-y-1.5 max-w-lg mx-auto">
          <div className="inline-flex items-center gap-1.5 text-[0.68rem] font-mono text-cyan-300">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
            <span>{isLoading ? 'Astro is analyzing SPHEREx telemetry...' : 'Astro is ready to explore with you'}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Say Hello to Astro
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Your celestial guide to NASA’s infrared universe. Ask simple questions, decode distant galaxies, and hear real cosmic science explained in plain English.
          </p>
        </div>
      </section>

      {/* 3. Starter Prompt Pills */}
      <section className="space-y-2 text-center">
        <p className="text-[0.65rem] font-mono uppercase tracking-widest text-muted">
          TAP A COSMIC QUESTION TO BEGIN
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {starterQuestions.map((q, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isLoading}
              onClick={() => handleSend(q.query)}
              className="cursor-pointer rounded-full border border-line bg-panel/60 px-3.5 py-1.5 text-xs text-slate-200 shadow-sm transition hover:border-purple-400/60 hover:bg-purple-950/30 hover:text-white active:scale-95 disabled:opacity-50"
            >
              <span className="text-purple-400 mr-1.5">✦</span>
              <span>{q.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* 4. Chat Message History Thread */}
      <section className="rounded-2xl border border-line/80 bg-panel/70 p-4 sm:p-6 space-y-6 shadow-2xl backdrop-blur-sm min-h-[360px] max-h-[540px] overflow-y-auto">
        {messages.map((msg) => {
          if (msg.sender === 'user') {
            return (
              <div key={msg.id} className="flex justify-end">
                <div className="max-w-xl space-y-1 text-right">
                  <span className="text-[0.65rem] font-mono text-muted mr-1">You • {msg.time}</span>
                  <div className="rounded-2xl rounded-tr-sm bg-gradient-to-r from-purple-900/60 to-purple-800/80 border border-purple-400/40 p-3.5 text-xs sm:text-sm text-white shadow-md text-left">
                    {msg.text}
                  </div>
                </div>
              </div>
            )
          }

          const isSpeakingThis = speakingMsgId === msg.id

          return (
            <div key={msg.id} className="flex items-start gap-3 max-w-2xl">
              {/* Mini AI Orb Avatar */}
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-purple-400 bg-purple-950/80 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.4)]">
                <span className="text-xs">✨</span>
              </div>

              {/* AI Bubble */}
              <div className="space-y-3 flex-1">
                {/* Header with Band & Listen Button */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">Astro AI</span>
                    <span className="rounded bg-white/10 px-1.5 py-0.5 text-[0.62rem] font-mono text-cyan-300">
                      • {msg.band}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => speakText(msg.text, msg.id)}
                    className={`cursor-pointer flex items-center gap-1.5 rounded border px-2.5 py-0.5 text-[0.68rem] transition ${
                      isSpeakingThis
                        ? 'border-cyan-400 bg-cyan-950/60 text-cyan-300 font-bold'
                        : 'border-line bg-panel/80 text-slate-300 hover:text-white hover:border-cyan-400'
                    }`}
                  >
                    <span>{isSpeakingThis ? '⏹' : '🔊'}</span>
                    <span>{isSpeakingThis ? 'Stop' : 'Listen'}</span>
                  </button>
                </div>

                {/* Message Body */}
                <div className="rounded-2xl rounded-tl-sm border border-line/80 bg-black/40 p-4 text-xs sm:text-sm text-slate-200 leading-relaxed space-y-3">
                  <p className="whitespace-pre-line">{msg.text}</p>

                  {/* Embedded Mini-Target Card (if provided) */}
                  {msg.miniCard && (
                    <div className="rounded-xl border border-white/10 bg-panel/90 p-3 flex items-center justify-between gap-3 shadow-inner">
                      <div className="flex items-center gap-3">
                        <img
                          src={msg.miniCard.imageUrl}
                          alt={msg.miniCard.title}
                          className="h-10 w-10 rounded-lg object-cover border border-white/10"
                        />
                        <div>
                          <p className="text-xs font-bold text-white">{msg.miniCard.title}</p>
                          <p className="text-[0.65rem] text-muted">{msg.miniCard.subtitle}</p>
                        </div>
                      </div>
                      <div className="text-right border-l border-white/10 pl-3">
                        <p className="text-[0.6rem] font-mono text-amber-300 uppercase">{msg.miniCard.metricLabel || 'OBSERVATION PARAMETER'}</p>
                        <p className="text-xs font-bold text-white font-mono flex items-center justify-end gap-1">
                          <span>{msg.miniCard.metricValue}</span>
                          <span className="text-amber-400">🌡</span>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Suggested Next Action Pills */}
                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="pt-2 border-t border-white/10 flex flex-wrap items-center gap-2">
                      <span className="text-[0.65rem] font-mono text-muted self-center">Suggested Next:</span>
                      {msg.suggestions.map((sug, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSuggestionClick(sug)}
                          className="cursor-pointer rounded-lg border border-line bg-white/5 px-2.5 py-1 text-[0.68rem] text-purple-300 hover:border-purple-400 hover:bg-purple-950/40 hover:text-white transition"
                        >
                          {sug.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Follow-up Questions Chips */}
                  {msg.followUpQuestions && msg.followUpQuestions.length > 0 && (
                    <div className="pt-1 flex flex-wrap items-center gap-1.5">
                      <span className="text-[0.62rem] font-mono text-cyan-300 mr-1">✦ Ask Follow-up:</span>
                      {msg.followUpQuestions.map((fq, idx) => (
                        <button
                          key={idx}
                          type="button"
                          disabled={isLoading}
                          onClick={() => handleSend(fq)}
                          className="cursor-pointer text-[0.65rem] text-slate-300 hover:text-white bg-purple-950/30 hover:bg-purple-900/40 border border-purple-500/20 px-2 py-0.5 rounded-full transition"
                        >
                          {fq} →
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {/* Loading Indicator when awaiting AI response */}
        {isLoading && (
          <div className="flex items-start gap-3 max-w-md">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-purple-400 bg-purple-950/80 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.4)] animate-pulse">
              <span className="text-xs">✨</span>
            </div>
            <div className="rounded-2xl rounded-tl-sm border border-line/80 bg-black/40 px-4 py-3 text-xs text-slate-300 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-bounce" />
              <span className="h-2 w-2 rounded-full bg-purple-400 animate-bounce delay-100" />
              <span className="h-2 w-2 rounded-full bg-pink-400 animate-bounce delay-200" />
              <span className="ml-1 text-[0.7rem] font-mono text-cyan-300">Astro is consulting NASA SPHEREx data...</span>
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </section>

      {/* 5. Fixed/Bottom Input Bar */}
      <section className="space-y-3">
        {errorNotice && (
          <div className="flex items-center justify-between rounded-xl border border-amber-500/40 bg-amber-950/40 px-3.5 py-2 text-xs text-amber-200">
            <span>⚠ {errorNotice}</span>
            <button
              type="button"
              onClick={() => setErrorNotice(null)}
              className="text-amber-400 hover:text-white text-xs cursor-pointer ml-2"
            >
              ✕
            </button>
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
          className="flex items-center gap-2 rounded-2xl border border-line/80 bg-panel/90 p-2 shadow-2xl backdrop-blur-md"
        >
          {/* Ask Input */}
          <div className="relative flex-1">
            <span className="absolute left-3 top-2.5 text-xs text-muted">💬</span>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isListening ? 'Listening to your microphone... speak now!' : 'Ask Astro anything about the universe...'}
              disabled={isLoading}
              className="w-full rounded-xl bg-transparent py-2 pl-9 pr-4 text-xs sm:text-sm text-ink placeholder:text-muted focus:outline-none disabled:opacity-60"
            />
          </div>

          {/* Speak Answers Aloud Toggle */}
          <label className="hidden sm:flex items-center gap-1.5 text-[0.68rem] text-slate-300 cursor-pointer select-none px-2">
            <input
              type="checkbox"
              checked={speakAloud}
              onChange={(e) => setSpeakAloud(e.target.checked)}
              className="rounded border-line bg-black accent-purple-500"
            />
            <span>Speak answers aloud</span>
          </label>

          {/* Microphone Button */}
          <button
            type="button"
            onClick={handleVoiceToggle}
            className={`cursor-pointer flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition duration-200 ${
              isListening
                ? 'border-red-500 bg-red-600 text-white animate-pulse'
                : 'border-cyan-400/40 bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30'
            }`}
            title="Click to speak (Voice Recognition)"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 02-3-3V5a3 3 0 116 0v6a3 3 0 02-3 3z" />
            </svg>
          </button>

          {/* Send Button */}
          <button
            type="submit"
            disabled={isLoading || !inputText.trim()}
            className="cursor-pointer flex items-center gap-1.5 rounded-xl border border-pink-500/40 bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md transition hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
          >
            <span>Send</span>
            <span>▷</span>
          </button>
        </form>

        {/* 3 Trust Badges at Bottom */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-[0.68rem] text-muted">
          <span className="flex items-center gap-1">
            <span className="text-cyan-400">🛡</span> Verified against NASA SPHEREx Mission Archive
          </span>
          <span className="flex items-center gap-1">
            <span className="text-purple-400">🎓</span> Appropriate for Grade 5 to Astrophysics Undergrad
          </span>
          <span className="flex items-center gap-1">
            <span className="text-pink-400">🗣</span> Natural Voice Synthesis Ready
          </span>
        </div>
      </section>
    </div>
  )
}

function generateEducationalResponse(query, target) {
  const q = query.toLowerCase()
  const name = target?.name || 'Betelgeuse'

  if (q.includes('how far') || q.includes('distance')) {
    return {
      text: `${name} is located at an estimated distance of ${target?.distance || '642.5 light-years'}. Light traveling from this object began its journey hundreds of years ago before reaching NASA’s detectors! Astronomers calculate this using trigonometric parallax from Gaia and space astrometry.`,
      miniCard: {
        title: target?.designation || name,
        subtitle: `Distance: ${target?.distance || 'Cosmic Distance'}`,
        imageUrl: target?.imageUrl || 'https://images-assets.nasa.gov/image/PIA23646/PIA23646~thumb.jpg',
        metricLabel: 'PARALLAX DISTANCE',
        metricValue: target?.distance || 'Verified',
      },
      suggestions: [
        { label: 'Show in Sky Explorer', action: 'explore' },
        { label: 'Compare observations over time', action: 'timemachine' },
      ],
      followUpQuestions: [
        'How does parallax measurement work?',
        'Why does space change over time?',
      ],
    }
  }

  if (q.includes('why does space change') || q.includes('motion') || q.includes('move')) {
    return {
      text: 'Space looks calm to our eyes, but it is continuously in motion! Nearby stars have high proper motion and race across our field of view, while variable stars pulsate and newborn stars flash as they swallow planetary debris. By comparing two NASA observations taken months or years apart, astronomers spot these changes in an instant!',
      suggestions: [
        { label: 'Open Sky Time Machine', action: 'timemachine' },
        { label: 'Inspect Barnard’s Star', action: 'explore' },
      ],
      followUpQuestions: [
        'How fast is Barnard’s Star moving?',
        'How does the blink comparator work?',
      ],
    }
  }

  if (q.includes('infrared') || q.includes('12')) {
    return {
      text: 'Think of visible light as what your eyes see (like a rainbow), and infrared light as warm heat you feel from a hot mug! Cosmic dust blocks visible starlight, but heat waves slip right through. Telescopes like NASA’s SPHEREx wear infrared glasses to reveal baby stars hidden inside thick clouds!',
      suggestions: [
        { label: 'Explore the Sky', action: 'explore' },
        { label: 'Learn Space Discoveries', action: 'learn' },
      ],
      followUpQuestions: [
        'What are the 102 spectral channels of SPHEREx?',
        'Why does Betelgeuse glow in infrared?',
      ],
    }
  }

  if (q.includes('pixel') || q.includes('blurry') || q.includes('resolution')) {
    return {
      text: 'SPHEREx has a 20-centimeter aperture designed for wide all-sky spectroscopy, not narrow high-magnification portraits. Its detector scale is 6.155 arcseconds per pixel with an optical point-spread function of ~7.5″. Each pixel represents authentic calibrated scientific flux in mega-Janskys per steradian!',
      suggestions: [
        { label: 'Inspect FITS in Time Machine', action: 'timemachine' },
      ],
      followUpQuestions: [
        'What does MJy/sr mean?',
        'What is WCS astrometric reprojection?',
      ],
    }
  }

  return {
    text: `Fascinating observation! In observational astrophysics, ${name} offers crucial data on stellar evolution and interstellar chemistry. NASA's SPHEREx all-sky survey maps this coordinate in 102 individual infrared wavelength channels to measure spectral signatures of water ice, carbon monoxide, and cosmic dust.`,
    miniCard: {
      title: target?.designation || name,
      subtitle: `Target: ${name}`,
      imageUrl: target?.imageUrl || 'https://images-assets.nasa.gov/image/PIA23646/PIA23646~thumb.jpg',
      metricLabel: 'SURVEY STATUS',
      metricValue: 'Calibrated',
    },
    suggestions: [
      { label: 'Show in Sky Explorer', action: 'explore' },
      { label: 'Compare observations over time', action: 'timemachine' },
    ],
    followUpQuestions: [
      'What are the 102 spectral bands of SPHEREx?',
      'Why does space change over time?',
    ],
  }
}
