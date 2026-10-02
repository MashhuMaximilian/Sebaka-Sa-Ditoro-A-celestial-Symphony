"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Compass,
  Crosshair,
  Eye,
  HelpCircle,
  Info,
  Loader2,
  Minus,
  Orbit,
  Pause,
  Play,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Telescope,
  X,
} from "lucide-react";
import {
  DAY,
  YEAR,
  MONTH,
  calendar,
  fieldNotes,
  knownBodies,
  mod,
  nextGathering,
  nextRise,
  observe,
  openingObservation,
  witnesses,
} from "@/lib/observatory";
import "./observatory.css";

const SkyScene = dynamic(() => import("@/components/observatory/SkyScene"), {
  ssr: false,
});
type Panel = "events" | "settings" | "about" | null;
const eventNotes = [
  {
    name: "Gathering of Witnesses",
    subtitle: "A recurring observing opportunity",
    text: "Several worlds share the evening. Search the next year for an hour when at least three witnesses rise above 3°, both suns are below −4°, and each planet is more than 10° from the suns. This is one practical interpretation of a Gathering.",
    status: "Calculated opportunity",
  },
  {
    name: "Full Triune Alignment",
    subtitle: "The sky remembered in Year 0",
    text: "Four witnesses in an ordered crescent. Shadows moving in sequence. Beacon as the final light. The lore connects Year 0 with another episode around Year 2454. The current orbital baseline has not established that recurrence or the full sequence.",
    status: "Historical target · unverified",
  },
  {
    name: "Triple Cascade",
    subtitle: "Three worlds. Successive veils.",
    text: "A separate sequence involving Viridis, Spectris, and Aetheris. An ordinary pairwise overlap is not proof of the complete Cascade. Its stage order and recurrence remain under investigation.",
    status: "Sequence · unverified",
  },
];

export default function Observatory() {
  const clock = useRef(0);
  const [hours, setHours] = useState(0);
  const [initialized, setInitialized] = useState(false);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<"sky" | "orbit">("sky");
  const [selected, setSelected] = useState("Aetheris");
  const [weave, setWeave] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [latitude, setLatitude] = useState(24);
  const [longitude, setLongitude] = useState(0);
  const [labels, setLabels] = useState(true);
  const [fov, setFov] = useState(42);
  const [focusKey, setFocusKey] = useState(0);
  const [fps, setFps] = useState(0);
  const [panel, setPanel] = useState<Panel>(null);
  const [eventIndex, setEventIndex] = useState(0);
  const [searching, setSearching] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [riseMessage, setRiseMessage] = useState("");
  const [yearInput, setYearInput] = useState("0");
  const [dayInput, setDayInput] = useState("1");
  const [reducedMotion, setReducedMotion] = useState(false);
  const search = useRef<AbortController | null>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const panelOpener = useRef<HTMLElement | null>(null);

  const jump = useCallback((time: number) => {
    const next = Math.max(0, Math.min(time, YEAR * DAY * 10000));
    clock.current = next;
    setHours(next);
    setPlaying(false);
    setFocusKey((k) => k + 1);
    const c = calendar(next);
    setYearInput(String(c.year));
    setDayInput(String(c.day));
  }, []);

  useEffect(() => {
    setReducedMotion(matchMedia("(prefers-reduced-motion: reduce)").matches);
    jump(openingObservation());
    setInitialized(true);
  }, [jump]);

  useEffect(() => {
    if (!playing) return;
    let frame = 0,
      previous = performance.now(),
      lastUpdate = previous;
    const tick = (now: number) => {
      if (!document.hidden)
        clock.current = Math.min(
          YEAR * DAY * 10000,
          clock.current + Math.min((now - previous) / 1000, 0.1) * speed,
        );
      previous = now;
      if (now - lastUpdate > 160) {
        setHours(clock.current);
        lastUpdate = now;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, speed]);
  useEffect(() => () => search.current?.abort(), []);
  useEffect(() => {
    if (!panel) return;
    panelOpener.current = document.activeElement as HTMLElement;
    dialogRef.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPanel(null);
      if (e.key !== "Tab") return;
      const nodes = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input, select, a[href], [tabindex="0"]',
      );
      if (!nodes?.length) return;
      const first = nodes[0],
        last = nodes[nodes.length - 1];
      if (
        e.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === dialogRef.current)
      ) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      panelOpener.current?.focus();
    };
  }, [panel]);

  const s = observe(hours, latitude, longitude, weave);
  const c = calendar(hours);
  const current = s.sky.find((b) => b.name === selected);
  const note = fieldNotes[selected];
  const phase =
    s.solarAltitude > 0
      ? "Daylight"
      : s.solarAltitude > -6
        ? "Twilight"
        : s.solarAltitude > -18
          ? "Blue hour"
          : "Night sky";
  const viridisCycle = mod(hours / DAY, MONTH) / MONTH;
  const selectBody = (name: string) => {
    setRiseMessage("");
    setSelected(name);
    if (name === "Sebaka") setMode("orbit");
    setFocusKey((k) => k + 1);
  };
  const startSearch = async () => {
    search.current?.abort();
    const controller = new AbortController();
    search.current = controller;
    setSearching(true);
    setProgress(0);
    setMessage("");
    setPlaying(false);
    const found = await nextGathering(
      clock.current,
      latitude,
      longitude,
      controller.signal,
      setProgress,
    );
    if (controller.signal.aborted) return;
    setSearching(false);
    if (found !== null) {
      jump(found);
      setMode("sky");
      const opportunity = observe(found, latitude, longitude);
      selectBody(
        opportunity.visibleWitnesses.find((b) => b.name === "Aetheris")?.name ??
          opportunity.visibleWitnesses[0].name,
      );
      const date = calendar(found);
      setMessage(
        `Found: Year ${date.year}, day ${date.day}, ${String(date.hour).padStart(2, "0")}:${String(date.minute).padStart(2, "0")}. ${opportunity.visibleWitnesses.map((b) => b.name).join(", ")} share the sky. The scene now shows this time.`,
      );
    } else
      setMessage(
        "No qualifying opportunity in the next 351 days at this location, sampled hourly. This is not proof that shorter opportunities cannot occur.",
      );
  };

  return (
    <main className={`observatory ${reducedMotion ? "reduced-motion" : ""}`}>
      {initialized && (
        <SkyScene
          clock={clock}
          mode={mode}
          selected={selected}
          focusKey={focusKey}
          weave={weave}
          latitude={latitude}
          longitude={longitude}
          labels={labels}
          fov={fov}
          onSelect={selectBody}
          onReady={() => setReady(true)}
          onPerformance={setFps}
        />
      )}
      <div className="vignette" />
      {!ready && (
        <div className="loading-sky" role="status">
          <span className="loading-orbit" />
          <p>Opening the observatory</p>
          <small>Finding our place beneath the twin suns</small>
        </div>
      )}
      <header className="observatory-header">
        <a className="wordmark" href="/" aria-label="Sebaka sa Ditoro home">
          <span className="brand-sigil">✳</span>
          <span>
            SEBAKA <i>sa</i> DITORO<small>A CELESTIAL SYMPHONY</small>
          </span>
        </a>
        <nav className="view-switch" aria-label="Observation mode">
          <button
            className={mode === "sky" ? "active" : ""}
            aria-pressed={mode === "sky"}
            onClick={() => setMode("sky")}
          >
            <Eye size={15} /> The sky
          </button>
          <button
            className={mode === "orbit" ? "active" : ""}
            aria-pressed={mode === "orbit"}
            onClick={() => setMode("orbit")}
          >
            <Orbit size={16} /> The system
          </button>
        </nav>
        <div className="header-actions">
          <button
            className="journal-button"
            aria-label="Field journal"
            onClick={() => setPanel("events")}
          >
            <Telescope size={16} />
            <span>Field journal</span>
            <span className="tiny-dot" />
          </button>
          <button
            className="icon-button"
            aria-label="Observatory settings"
            onClick={() => setPanel("settings")}
          >
            <SlidersHorizontal size={17} />
          </button>
        </div>
      </header>
      <section className="scene-intro" aria-label="View description">
        <div className="eyebrow">
          <span className="live-dot" />{" "}
          {mode === "sky"
            ? `SURFACE OBSERVATION / ${phase.toUpperCase()}`
            : "ORBITAL ATLAS / INNER SYSTEM"}
        </div>
        <h1>
          {mode === "sky" ? (
            <>
              The sky
              <br />
              <em>remembers.</em>
            </>
          ) : (
            <>
              A dance
              <br />
              <em>of worlds.</em>
            </>
          )}
        </h1>
        <p>
          {mode === "sky"
            ? "Beneath two suns, every world tells a story."
            : "One moment. A different point of view."}
        </p>
        <button className="text-action" onClick={() => setPanel("events")}>
          Explore the celestial events <ArrowRight size={15} />
        </button>
      </section>
      <aside className="body-instrument" aria-label="Selected world">
        <div className="instrument-heading">
          <span className="eyebrow">IN THE LENS</span>
          <span className="instrument-number">
            {String(
              knownBodies.findIndex((b) => b.name === selected) + 1,
            ).padStart(2, "0")}{" "}
            / 08
          </span>
        </div>
        <label className="body-picker">
          <span className="sr-only">Choose a celestial body</span>
          <select
            aria-label="Choose a celestial body"
            value={selected}
            onChange={(e) => selectBody(e.target.value)}
          >
            {knownBodies.map((b) => (
              <option key={b.name}>{b.name}</option>
            ))}
          </select>
          <ChevronDown size={17} />
        </label>
        <p className="body-epithet">{note.title}</p>
        <div className="body-rule" />
        <p className="body-story">{note.text}</p>
        <div className="readouts">
          <div>
            <span>ALTITUDE</span>
            <strong>
              {current ? `${current.altitude.toFixed(1)}°` : "Home"}
            </strong>
          </div>
          <div>
            <span>{mode === "sky" ? "APPARENT DISC" : "FROM SEBAKA"}</span>
            <strong>
              {current
                ? mode === "sky"
                  ? `${current.apparentDiameter.toFixed(2)}°`
                  : `${current.distanceAU.toFixed(2)} AU`
                : "—"}
            </strong>
          </div>
        </div>
        <div
          className={`visibility-note ${current?.aboveHorizon ? "" : "dim"}`}
        >
          <span className="tiny-dot" />
          {!current
            ? "Your observing world"
            : current.aboveHorizon
              ? s.solarAltitude > 0 && current.type !== "Star"
                ? "Above horizon · daylight glare"
                : "Above the horizon"
              : "Below the horizon"}
        </div>
        {mode === "sky" && (
          <button
            className={`outline-button ${current && !current.aboveHorizon ? "rise-action" : ""}`}
            onClick={() => {
              if (current && !current.aboveHorizon) {
                const rise = nextRise(
                  clock.current,
                  selected,
                  latitude,
                  longitude,
                );
                if (rise !== null) jump(rise);
                else
                  setRiseMessage(
                    "This world stays below 5° for the next two days at your location.",
                  );
              } else setFocusKey((k) => k + 1);
            }}
          >
            <Crosshair size={14} />{" "}
            {current && !current.aboveHorizon
              ? "Find next rise"
              : "Center in the sky"}
          </button>
        )}
        {riseMessage && (
          <p className="instrument-footnote" role="status">
            {riseMessage}
          </p>
        )}
        {mode === "orbit" && (
          <p className="instrument-footnote">
            Distances to scale. Body sizes enlarged. Beacon lies beyond this
            inner-system chart at ~100 AU.
          </p>
        )}
      </aside>
      <div className="sky-tools" aria-label="View controls">
        <button
          className={`icon-button ${labels ? "on" : ""}`}
          aria-label="Toggle body labels"
          aria-pressed={labels}
          onClick={() => setLabels((v) => !v)}
        >
          <Compass size={18} />
        </button>
        <button
          className="icon-button"
          aria-label="Zoom in"
          disabled={fov <= 18}
          onClick={() => setFov((v) => Math.max(18, v - 6))}
        >
          <Plus size={18} />
        </button>
        <button
          className="icon-button"
          aria-label="Zoom out"
          disabled={fov >= 80}
          onClick={() => setFov((v) => Math.min(80, v + 6))}
        >
          <Minus size={18} />
        </button>
        <button
          className="icon-button"
          aria-label="About this observatory"
          onClick={() => setPanel("about")}
        >
          <HelpCircle size={17} />
        </button>
      </div>
      <div className="horizon-caption">
        <span className="compass-mark" aria-hidden="true">
          ⌖
        </span>
        <span>
          {mode === "sky"
            ? `${Math.abs(latitude).toFixed(0)}° ${latitude < 0 ? "S" : "N"} / ${Math.abs(longitude).toFixed(0)}° ${longitude < 0 ? "W" : "E"}`
            : "ALPHA–TWILIGHT BARYCENTER"}
          <small>
            {mode === "sky"
              ? "Drag to look around · select a world to follow its story"
              : "Drag to orbit · scroll or pinch to explore"}
          </small>
        </span>
      </div>
      <button
        className={`weave-switch ${weave ? "enabled" : ""}`}
        aria-pressed={weave}
        onClick={() => setWeave((v) => !v)}
      >
        <Sparkles size={16} />
        <span>
          {weave ? "Through the Weave" : "Physical angular sizes"}
          <small>
            {weave ? "Apparent size amplified" : "Observer amplification off"}
          </small>
        </span>
        <span className="toggle-track">
          <i />
        </span>
      </button>
      <footer className="time-console" aria-label="Time controls">
        <div className="time-topline">
          <div className="date-display">
            <span className="eyebrow">SEBAKAN CALENDAR</span>
            <strong>
              Year {c.year.toLocaleString()} <span>/</span> Month{" "}
              {String(c.month).padStart(2, "0")} <span>/</span> Day{" "}
              {String(c.date).padStart(2, "0")}
            </strong>
            <small>
              Week {c.week} · {String(c.hour).padStart(2, "0")}:
              {String(c.minute).padStart(2, "0")} · day {c.day} of {YEAR}
            </small>
          </div>
          <div className="transport">
            <button
              className="icon-button"
              aria-label="Previous day"
              onClick={() => jump(clock.current - DAY)}
            >
              <ArrowLeft size={17} />
            </button>
            <button
              className="play-button"
              aria-label={playing ? "Pause time" : "Play time"}
              onClick={() => {
                setHours(clock.current);
                setPlaying((v) => !v);
              }}
            >
              {playing ? (
                <Pause size={18} fill="currentColor" />
              ) : (
                <Play size={18} fill="currentColor" />
              )}
            </button>
            <button
              className="icon-button"
              aria-label="Next day"
              onClick={() => jump(clock.current + DAY)}
            >
              <ArrowRight size={17} />
            </button>
            <select
              aria-label="Time speed"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
            >
              <option value={0.05}>Slow · 3 min/s</option>
              <option value={1}>1 hour / sec</option>
              <option value={6}>6 hours / sec</option>
              <option value={24}>1 day / sec</option>
            </select>
          </div>
          <div className="cycle-display">
            <svg viewBox="0 0 40 40" aria-hidden="true">
              <circle cx="20" cy="20" r="16" />
              <circle
                cx="20"
                cy="20"
                r="16"
                strokeDasharray={`${viridisCycle * 100.5} 100.5`}
              />
            </svg>
            <span>
              VIRIDIS CYCLE
              <strong>
                {Math.floor(viridisCycle * 27) + 1} <i>/ 27 days</i>
              </strong>
            </span>
          </div>
        </div>
        <div className="year-track">
          <input
            type="range"
            min="0"
            max={YEAR * DAY - 1}
            step="1"
            value={Math.floor(mod(hours, YEAR * DAY))}
            aria-label="Scrub through the current year"
            onChange={(e) => jump(c.year * YEAR * DAY + Number(e.target.value))}
          />
          <div className="month-ticks">
            {Array.from({ length: 13 }, (_, i) => (
              <span key={i}>{String(i + 1).padStart(2, "0")}</span>
            ))}
          </div>
        </div>
        <div className="console-bottom">
          <span>
            <i className="tiny-dot" />{" "}
            {playing ? "Time flowing" : "Moment held"} <b>·</b>{" "}
            {playing ? (fps ? `${fps} fps` : "Live") : "On-demand rendering"}{" "}
            <b>·</b> Provisional orbital model
          </span>
          <button onClick={() => setPanel("settings")}>
            Go to a date <ArrowRight size={12} />
          </button>
        </div>
      </footer>
      {panel && (
        <div className="panel-backdrop" onClick={() => setPanel(null)}>
          <section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="panel-title"
            tabIndex={-1}
            className="observatory-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="panel-header">
              <span className="eyebrow">SEBAKA OBSERVATORY</span>
              <button
                className="icon-button"
                aria-label="Close panel"
                onClick={() => setPanel(null)}
              >
                <X size={20} />
              </button>
            </div>
            <h2 id="panel-title">
              {panel === "events"
                ? "The field journal"
                : panel === "settings"
                  ? "Your observation"
                  : "A sky with a history"}
            </h2>
            {panel === "events" && (
              <>
                <p className="panel-lead">
                  Some nights are written into history. Others are simply worth
                  looking up for.
                </p>
                <div
                  className="event-tabs"
                  role="tablist"
                  aria-label="Celestial events"
                >
                  {eventNotes.map((e, i) => (
                    <button
                      key={e.name}
                      role="tab"
                      aria-selected={i === eventIndex}
                      onClick={() => {
                        setEventIndex(i);
                        setMessage("");
                      }}
                    >
                      {String(i + 1).padStart(2, "0")} <span>{e.name}</span>
                      <ArrowRight size={16} />
                    </button>
                  ))}
                </div>
                <article className="event-detail">
                  <span className="status-label">
                    {eventNotes[eventIndex].status}
                  </span>
                  <h3>{eventNotes[eventIndex].subtitle}</h3>
                  <p>{eventNotes[eventIndex].text}</p>
                  {eventIndex === 0 ? (
                    <>
                      <div className="witness-pips">
                        {witnesses.map((name) => (
                          <span
                            key={name}
                            className={
                              s.visibleWitnesses.some((b) => b.name === name)
                                ? "visible"
                                : ""
                            }
                          >
                            <i />
                            {name}
                          </span>
                        ))}
                      </div>
                      <button
                        className="primary-button"
                        disabled={searching}
                        onClick={startSearch}
                      >
                        {searching ? (
                          <Loader2 className="spin" size={16} />
                        ) : (
                          <Telescope size={16} />
                        )}
                        {searching
                          ? `Searching · ${Math.round(progress * 100)}%`
                          : "Find the next Gathering"}
                        <ArrowRight size={16} />
                      </button>
                      {searching && (
                        <button
                          className="text-action"
                          onClick={() => {
                            search.current?.abort();
                            setSearching(false);
                            setMessage("Search cancelled.");
                          }}
                        >
                          Cancel search
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="historical-actions">
                      <p>
                        <Info size={14} />{" "}
                        {eventIndex === 1
                          ? "Dates below open the model at historical reference points. They do not certify an alignment."
                          : "No verified Cascade date is available in this baseline."}
                      </p>
                      {eventIndex === 1 && (
                        <div>
                          <button
                            className="outline-button"
                            onClick={() => {
                              jump(0);
                              setMessage(
                                "Viewing Year 0, day 1. Historical reference, not a verified event.",
                              );
                            }}
                          >
                            Visit Year 0
                          </button>
                          <button
                            className="outline-button"
                            onClick={() => {
                              jump(2454 * YEAR * DAY);
                              setMessage(
                                "Viewing Year 2454, day 1. Historical reference, not a verified event.",
                              );
                            }}
                          >
                            Visit Year 2454
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {message && (
                    <p className="search-result" role="status">
                      {message}
                    </p>
                  )}
                </article>
                <div className="journal-footer">
                  <span>FIELD NOTE 001</span>
                  <p>
                    A shared sky is not necessarily a rare alignment. Visibility
                    is measured from your selected location.
                  </p>
                </div>
              </>
            )}
            {panel === "settings" && (
              <>
                <p className="panel-lead">
                  Choose where you stand, and when you look.
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const y = Number(yearInput),
                      d = Number(dayInput);
                    if (Number.isFinite(y) && Number.isFinite(d)) {
                      jump((y * YEAR + d - 1) * DAY);
                      setPanel(null);
                    }
                  }}
                >
                  <div className="setting-label">TRAVEL THROUGH TIME</div>
                  <div className="date-inputs">
                    <label>
                      Year
                      <input
                        type="number"
                        min="0"
                        max="9999"
                        required
                        value={yearInput}
                        onChange={(e) => setYearInput(e.target.value)}
                      />
                    </label>
                    <label>
                      Day of year
                      <input
                        type="number"
                        min="1"
                        max={YEAR}
                        required
                        value={dayInput}
                        onChange={(e) => setDayInput(e.target.value)}
                      />
                    </label>
                  </div>
                  <button className="primary-button" type="submit">
                    Open this moment <ArrowRight size={16} />
                  </button>
                </form>
                <div className="setting-group">
                  <div className="setting-label">YOUR PLACE ON SEBAKA</div>
                  <label className="range-setting">
                    Latitude <strong>{latitude}°</strong>
                    <input
                      aria-label="Observer latitude"
                      type="range"
                      min="-75"
                      max="75"
                      step="1"
                      value={latitude}
                      onChange={(e) => {
                        setLatitude(Number(e.target.value));
                        setFocusKey((k) => k + 1);
                      }}
                    />
                  </label>
                  <label className="range-setting">
                    Longitude <strong>{longitude}°</strong>
                    <input
                      aria-label="Observer longitude"
                      type="range"
                      min="-180"
                      max="180"
                      value={longitude}
                      onChange={(e) => {
                        setLongitude(Number(e.target.value));
                        setFocusKey((k) => k + 1);
                      }}
                    />
                  </label>
                </div>
                <div className="setting-group">
                  <div className="setting-label">THE OBSERVER’S LENS</div>
                  <button
                    className="setting-toggle"
                    aria-pressed={weave}
                    onClick={() => setWeave((v) => !v)}
                  >
                    <span>
                      The Weave
                      <small>
                        Amplify apparent discs, preserve orbital positions
                      </small>
                    </span>
                    {weave ? <Check size={18} /> : <Minus size={18} />}
                  </button>
                  <button
                    className="setting-toggle"
                    aria-pressed={labels}
                    onClick={() => setLabels((v) => !v)}
                  >
                    <span>Celestial labels</span>
                    {labels ? <Check size={18} /> : <Minus size={18} />}
                  </button>
                </div>
                <button
                  className="text-action"
                  onClick={() => {
                    jump(openingObservation());
                    setLatitude(24);
                    setLongitude(0);
                    setSelected("Aetheris");
                    setFov(42);
                    setMode("sky");
                    setWeave(true);
                    setPanel(null);
                  }}
                >
                  <RotateCcw size={14} /> Return to the opening observation
                </button>
              </>
            )}
            {panel === "about" && (
              <>
                <p className="panel-lead">
                  An observatory for a world of twin suns, enormous apparent
                  planets, and stories written across the heavens.
                </p>
                <div className="about-step">
                  <span>01</span>
                  <div>
                    <h3>The physical system</h3>
                    <p>
                      All views use the existing Keplerian ephemeris. Sebaka
                      orbits the close binary. Beacon is a distant companion
                      with two undiscovered worlds, Gelidis and Liminis, omitted
                      from the inhabitants’ sky atlas.
                    </p>
                  </div>
                </div>
                <div className="about-step">
                  <span>02</span>
                  <div>
                    <h3>The observer’s sky</h3>
                    <p>
                      Your position and the planet’s rotation determine the
                      horizon. The Weave enlarges apparent discs using the
                      baseline’s multipliers and caps. Switch it off to compare
                      physical angular sizes.
                    </p>
                  </div>
                </div>
                <div className="about-step">
                  <span>03</span>
                  <div>
                    <h3>The cultural meaning</h3>
                    <p>
                      Viridis gives the month its 27 days. Thirteen months
                      currently make a 351-day year. Rare historical sequences
                      remain research targets; the journal distinguishes them
                      from calculated observing opportunities.
                    </p>
                  </div>
                </div>
                <div className="model-note">
                  <Info size={18} />
                  <p>
                    This is a provisional fictional astronomy model. The
                    landscape and background starfield are illustrative. Orbital
                    stability, Beacon’s nature, and the complete Year 0 / +2454
                    event sequence are not yet validated.
                  </p>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
