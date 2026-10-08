import { useEffect, useRef, useState } from "react";
import "./HoldCountdown.css";

/**
 * Live "time left before this slot's hold expires" countdown.
 * Self-contained styling (doesn't depend on any page's CSS variables) so it
 * reads fine on both the light cards (BookingForm/PaymentPage) and the dark
 * 3D garage overlay (SlotSelection).
 *
 * expiresAt: a timestamp (ms since epoch) — render nothing if null/undefined.
 * onExpire: called exactly once when the countdown reaches 0.
 */
export default function HoldCountdown({ expiresAt, onExpire, label = "Hold expires in" }) {
    const [remainingMs, setRemainingMs] = useState(() => (expiresAt ? expiresAt - Date.now() : 0));
    const firedRef = useRef(false);

    useEffect(() => {
        firedRef.current = false;
        if (!expiresAt) return;
        const tick = () => setRemainingMs(expiresAt - Date.now());
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [expiresAt]);

    useEffect(() => {
        if (expiresAt && remainingMs <= 0 && !firedRef.current) {
            firedRef.current = true;
            onExpire?.();
        }
    }, [remainingMs, expiresAt, onExpire]);

    if (!expiresAt) return null;

    const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
    const mm = Math.floor(totalSeconds / 60);
    const ss = String(totalSeconds % 60).padStart(2, "0");
    const low = totalSeconds <= 30;

    return (
        <span className={`hold-countdown${low ? " hold-countdown-low" : ""}`}>
            <i className="hold-countdown-dot" />
            {label} {mm}:{ss}
        </span>
    );
}
