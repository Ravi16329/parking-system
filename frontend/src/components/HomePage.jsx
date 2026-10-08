import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getApartment, getSlots, getAnnouncements } from "../api/api";
import "./HomePage.css";

/* =====================================================================
   VIDEO_SOURCES — replace these with your own apartment building clips.
   - src: path to an .mp4 under /public/videos/ (so "/videos/lobby.mp4"
     works once you drop your files into frontend/public/videos/)
   - label: short caption shown bottom-left while that clip plays
   If a src fails to load, that slide automatically falls back to a
   placeholder card instead of a broken video.
===================================================================== */
// const VIDEO_SOURCES = [
//   { src: "/videos/video1parking.mp4", label: "Exterior view" },
//   { src: "/videos/video2parking.mp4", label: "Main entrance" },
//   { src: "/videos/video3parking.mp4", label: "Parking area" },
// ];

const VIDEO_SOURCES = [
  { src: `${process.env.PUBLIC_URL}/videos/video1parking.mp4`, label: "Exterior view" },
  { src: `${process.env.PUBLIC_URL}/videos/video2parking.mp4`, label: "Main entrance" },
  { src: `${process.env.PUBLIC_URL}/videos/video3parking.mp4`, label: "Parking area" },
];

const ROTATE_MS = 7000;

export default function HomePage() {
  const navigate = useNavigate();
  const [apartment, setApartment] = useState(null);
  const [freeSlots, setFreeSlots] = useState(null);
  const [announcement, setAnnouncement] = useState(null);
  const [current, setCurrent] = useState(0);
  const [failed, setFailed] = useState(() => VIDEO_SOURCES.map(() => false));
  const videoRefs = useRef([]);

  // Load apartment details + a live "free slots" count for the stat row.
  // Load apartment + announcements once.
  // Poll slot count every 3 seconds so "Free now" stays live.
  useEffect(() => {
    getApartment().then(setApartment);

    getAnnouncements()
      .then((list) => setAnnouncement(list[0] || null))
      .catch(() => { });

    const refreshFreeSlots = () => {
      getSlots()
        .then((slots) => {
          setFreeSlots(
            slots.filter((s) => s.status === "available").length
          );
        })
        .catch(() => { });
    };

    // Fetch immediately when HomePage opens
    refreshFreeSlots();

    // Then refresh every 3 seconds
    const interval = setInterval(refreshFreeSlots, 3000);

    // Stop polling when leaving HomePage
    return () => clearInterval(interval);
  }, []);

  // This hero is a full-viewport, no-scroll layout — lock body scroll
  // only while it's mounted, so other pages (slots, forms, etc.) keep
  // their normal scrolling behavior.
  useEffect(() => {
    document.body.classList.add("homepage-no-scroll");
    return () => document.body.classList.remove("homepage-no-scroll");
  }, []);

  // Auto-rotate slides; resets whenever `current` changes (auto or manual).
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % VIDEO_SOURCES.length);
    }, ROTATE_MS);
    return () => clearInterval(timer);
  }, [current]);

  // Play the active video, pause the rest.
  useEffect(() => {
    videoRefs.current.forEach((video, i) => {
      if (!video) return;
      if (i === current) {
        const p = video.play();
        if (p && p.catch) p.catch(() => { });
      } else {
        video.pause();
      }
    });
  }, [current]);

  function handleVideoError(i) {
    const video = videoRefs.current[i];
    // First failure might just be StrictMode's dev-only double-mount
    // aborting the initial fetch — try reloading once before giving up.
    if (video && !video.dataset.retried) {
      video.dataset.retried = "true";
      video.load();
      if (i === current) {
        const p = video.play();
        if (p && p.catch) p.catch(() => { });
      }
      return;
    }

    setFailed((prev) => {
      const next = [...prev];
      next[i] = true;
      return next;
    });
  }

  const activeLabel = VIDEO_SOURCES[current].label;

  return (
    <div className="home-hero">
      <div className="stage">
        {/* ================= VIDEO SIDE ================= */}
        <div className="video-stage">
          {VIDEO_SOURCES.map((item, i) => (
            <div
              key={item.src}
              className={`video-slide ${i === current ? "active" : ""} ${failed[i] ? "video-failed" : ""
                }`}
            >
              <video
                ref={(el) => (videoRefs.current[i] = el)}
                muted
                loop
                playsInline
                preload={i === 0 ? "auto" : "none"}
                src={item.src}
                onError={() => handleVideoError(i)}
              />
              {failed[i] && (
                <div className="video-fallback">
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <rect x="3" y="5" width="14" height="14" rx="2" />
                    <path d="M17 9l4-2v10l-4-2" />
                  </svg>
                  <span>
                    {item.src}
                    <br />
                    add this clip to enable playback
                  </span>
                </div>
              )}
            </div>
          ))}

          <div className="video-overlay" />

          <div className="brand-mark">
            <span className="dot" />
            <span>{apartment ? `${apartment.name} · Live` : "Loading..."}</span>
          </div>

          <div className="video-caption">
            <span className="idx">{String(current + 1).padStart(2, "0")}</span>{" "}
            / <span>{String(VIDEO_SOURCES.length).padStart(2, "0")}</span> —{" "}
            <span>{activeLabel}</span>
          </div>

          <div className="dots">
            {VIDEO_SOURCES.map((item, i) => (
              <button
                key={item.src}
                type="button"
                aria-label={`Show ${item.label}`}
                className={i === current ? "active" : ""}
                onClick={() => setCurrent(i)}
              />
            ))}
          </div>
        </div>

        {/* ================= SIDEBAR ================= */}
        <div className="sidebar">
          <p className="eyebrow">{apartment?.name || "Loading apartment..."}</p>

          {announcement && (
            <div className="announcement-banner">
              <span className="announcement-dot" />
              <span>{announcement.message}</span>
            </div>
          )}

          <h1>
            Park in seconds,
            <br />
            <em>not circles.</em>
          </h1>
          <p className="desc">
            Live slot detection for every bay in the residents' lot. Reserve a
            free space before you're even through the gate.
          </p>

          <div className="stat-row">
            <div className="stat">
              <div className="n free">{freeSlots ?? "—"}</div>
              <div className="l">Free now</div>
            </div>
            <div className="stat">
              <div className="n">{apartment?.totalSlots ?? "—"}</div>
              <div className="l">Total bays</div>
            </div>
          </div>

          <button className="cta" onClick={() => navigate("/slots")}>
            Book parking slot <span className="arrow">→</span>
          </button>

          <div className="legend">
            <div className="legend-item">
              <span className="ldot green" /> Available
            </div>
            <div className="legend-item">
              <span className="ldot amber" /> Held
            </div>
            <div className="legend-item">
              <span className="ldot red" /> Occupied
            </div>
          </div>

          {/* <p className="sidebar-foot">
            Demo build · dummy slot data. Video panel cycles through the
            building clips above.
          </p> */}
        </div>
      </div>
    </div>
  );
}