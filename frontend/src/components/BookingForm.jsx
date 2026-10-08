import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createBooking, sendOtp, verifyOtp, releaseSlot } from "../api/api";
import HoldCountdown from "./HoldCountdown";
import "./BookingForm.css";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

export default function BookingForm({
  selectedSlotId,
  setSelectedSlotId,
  booking,
  setBooking,
  holdExpiresAt,
  setHoldExpiresAt,
}) {
  const navigate = useNavigate();
  const [expired, setExpired] = useState(false);

  const handleHoldExpire = useCallback(() => {
    setExpired(true);
  }, []);

  async function handleBack() {
    if (selectedSlotId) await releaseSlot(selectedSlotId);
    setSelectedSlotId?.(null);
    setHoldExpiresAt?.(null);
    navigate("/slots");
  }

  function handlePickNewSlot() {
    setSelectedSlotId?.(null);
    setHoldExpiresAt?.(null);
    navigate("/slots");
  }

  const [step, setStep] = useState("details"); // details | otp | done
  const [name, setName] = useState(booking?.name || "");
  const [phone, setPhone] = useState(booking?.phone || "");
  const [errors, setErrors] = useState({});

  const [digits, setDigits] = useState(() => Array(OTP_LENGTH).fill(""));
  const [otpError, setOtpError] = useState("");
  const [shake, setShake] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [devCode, setDevCode] = useState("");

  const boxRefs = useRef([]);
  const otpValue = digits.join("");
  const phoneValid = /^[6-9][0-9]{9}$/.test(phone);
  const nameValid = name.trim().length >= 2;

  const maskedPhone = useMemo(
    () => (phone.length === 10 ? `+91 ${phone.slice(0, 2)}••• ••${phone.slice(-3)}` : phone),
    [phone]
  );

  // resend countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  useEffect(() => {
    if (step === "otp") boxRefs.current[0]?.focus();
  }, [step]);

  const finishBooking = useCallback(async () => {
    const result = await createBooking({ slotId: selectedSlotId, name: name.trim(), phone });
    setBooking({ ...result, phoneVerified: true });
    setStep("done");
    setTimeout(() => navigate("/pay"), 900);
  }, [name, phone, selectedSlotId, setBooking, navigate]);

  const submitOtp = useCallback(
    async (code) => {
      if (verifying) return;
      setVerifying(true);
      setOtpError("");
      const result = await verifyOtp(phone, code);
      if (result.success) {
        await finishBooking();
      } else {
        setOtpError(result.message || "Verification failed.");
        setDigits(Array(OTP_LENGTH).fill(""));
        setShake(true);
        setTimeout(() => setShake(false), 450);
        boxRefs.current[0]?.focus();
        setVerifying(false);
      }
    },
    [phone, verifying, finishBooking]
  );

  // auto-submit as soon as all six boxes are filled
  useEffect(() => {
    if (step === "otp" && otpValue.length === OTP_LENGTH && !verifying) submitOtp(otpValue);
  }, [otpValue, step, verifying, submitOtp]);

  if (!selectedSlotId) {
    return (
      <div className="page booking-page">
        <div className="container">
          <div className="card">
            <h1 className="title">No slot selected</h1>
            <p className="subtitle">Pick a bay in the garage first, then come back here.</p>
            <button className="btn btn-primary" onClick={() => navigate("/slots")}>
              Choose a slot
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (expired && step !== "done") {
    return (
      <div className="page booking-page">
        <div className="container">
          <div className="card">
            <h1 className="title">Your hold expired</h1>
            <p className="subtitle">
              {selectedSlotId} wasn't confirmed in time, so it's been released back to the garage.
            </p>
            <button className="btn btn-primary btn-block" onClick={handlePickNewSlot}>
              Choose a slot
            </button>
          </div>
        </div>
      </div>
    );
  }

  function validateDetails() {
    const next = {};
    if (!nameValid) next.name = "Enter your full name";
    if (!phoneValid) next.phone = "Enter a valid 10-digit Indian mobile number";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSendCode(e) {
    e?.preventDefault();
    if (!validateDetails() || sending) return;
    setSending(true);
    const res = await sendOtp(phone);
    setSending(false);
    setDevCode(res?.devCode || "");
    setDigits(Array(OTP_LENGTH).fill(""));
    setOtpError("");
    setCooldown(RESEND_SECONDS);
    setStep("otp");
  }

  async function handleResend() {
    if (cooldown > 0 || sending) return;
    setSending(true);
    const res = await sendOtp(phone);
    setSending(false);
    setDevCode(res?.devCode || "");
    setDigits(Array(OTP_LENGTH).fill(""));
    setOtpError("");
    setCooldown(RESEND_SECONDS);
    boxRefs.current[0]?.focus();
  }

  function writeDigits(startIndex, chars) {
    setDigits((prev) => {
      const next = [...prev];
      for (let i = 0; i < chars.length && startIndex + i < OTP_LENGTH; i++) {
        next[startIndex + i] = chars[i];
      }
      return next;
    });
    const landed = Math.min(startIndex + chars.length, OTP_LENGTH - 1);
    boxRefs.current[landed]?.focus();
  }

  function handleBoxChange(i, raw) {
    const chars = raw.replace(/\D/g, "");
    if (!chars) {
      setDigits((prev) => {
        const next = [...prev];
        next[i] = "";
        return next;
      });
      return;
    }
    setOtpError("");
    writeDigits(i, chars.split(""));
  }

  function handleBoxKeyDown(i, e) {
    if (e.key === "Backspace") {
      e.preventDefault();
      setDigits((prev) => {
        const next = [...prev];
        if (next[i]) next[i] = "";
        else if (i > 0) {
          next[i - 1] = "";
          boxRefs.current[i - 1]?.focus();
        }
        return next;
      });
    } else if (e.key === "ArrowLeft" && i > 0) {
      boxRefs.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < OTP_LENGTH - 1) {
      boxRefs.current[i + 1]?.focus();
    }
  }

  function handlePaste(i, e) {
    const text = (e.clipboardData.getData("text") || "").replace(/\D/g, "");
    if (!text) return;
    e.preventDefault();
    setOtpError("");
    writeDigits(i, text.slice(0, OTP_LENGTH - i).split(""));
  }

  return (
    <div className="page booking-page">
      <div className="container">
        <div className="card booking-card">
          <button type="button" className="booking-back-btn" onClick={handleBack}>
            ← Back
          </button>

          <div className="progress">
            <span className="progress-step active" />
            <span className="progress-step active" />
            <span className="progress-step" />
            <span className="progress-step" />
          </div>

          <div className="slot-banner">
            <div className="slot-banner-tag">{selectedSlotId}</div>
            <div className="slot-banner-text">
              <strong>Bay held for you</strong>
              <span>Finish verification to keep it</span>
            </div>
            {step !== "done" && (
              <HoldCountdown expiresAt={holdExpiresAt} onExpire={handleHoldExpire} label="Expires in" />
            )}
          </div>

          {step === "details" && (
            <>
              <h1 className="title">Your details</h1>
              <p className="subtitle">We'll text a 6-digit code to confirm your number.</p>

              <form onSubmit={handleSendCode} noValidate>
                <div className="form-group">
                  <label htmlFor="name">Full name</label>
                  <input
                    id="name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (errors.name) setErrors((p) => ({ ...p, name: undefined }));
                    }}
                    placeholder="Rahul Sharma"
                  />
                  {errors.name && <div className="error-text">{errors.name}</div>}
                </div>

                <div className="form-group">
                  <label htmlFor="phone">Mobile number</label>
                  <div className={`phone-field ${errors.phone ? "invalid" : ""}`}>
                    <span className="cc">+91</span>
                    <input
                      id="phone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      value={phone}
                      maxLength={10}
                      onChange={(e) => {
                        setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                        if (errors.phone) setErrors((p) => ({ ...p, phone: undefined }));
                      }}
                      placeholder="9876543210"
                    />
                    {phoneValid && <span className="tick" aria-hidden="true">✓</span>}
                  </div>
                  {errors.phone && <div className="error-text">{errors.phone}</div>}
                </div>

                <button
                  className="btn btn-primary btn-block"
                  type="submit"
                  disabled={sending || !nameValid || !phoneValid}
                >
                  {sending ? "Sending code…" : "Send verification code"}
                </button>
              </form>
            </>
          )}

          {step === "otp" && (
            <>
              <h1 className="title">Verify your number</h1>
              <p className="subtitle">
                Code sent to <strong>{maskedPhone}</strong>{" "}
                <button type="button" className="link-btn" onClick={() => setStep("details")}>
                  Change
                </button>
              </p>

              <div
                className={`otp-row ${shake ? "shake" : ""} ${verifying ? "busy" : ""}`}
                onPaste={(e) => handlePaste(0, e)}
              >
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => (boxRefs.current[i] = el)}
                    className={`otp-box ${d ? "filled" : ""} ${otpError ? "error" : ""}`}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={OTP_LENGTH}
                    value={d}
                    disabled={verifying}
                    onChange={(e) => handleBoxChange(i, e.target.value)}
                    onKeyDown={(e) => handleBoxKeyDown(i, e)}
                    onPaste={(e) => handlePaste(i, e)}
                    onFocus={(e) => e.target.select()}
                    aria-label={`Digit ${i + 1}`}
                  />
                ))}
              </div>

              {otpError && <div className="error-text otp-error">{otpError}</div>}
              {verifying && <div className="otp-status">Checking code…</div>}

              <div className="otp-actions">
                {cooldown > 0 ? (
                  <span className="muted">Resend available in {cooldown}s</span>
                ) : (
                  <button type="button" className="link-btn" onClick={handleResend} disabled={sending}>
                    {sending ? "Sending…" : "Resend code"}
                  </button>
                )}
              </div>

              {devCode && (
                <div className="dev-hint">
                  Demo mode — your code is <strong>{devCode}</strong>. Remove this block once the
                  SMS API is live.
                </div>
              )}

              <button
                className="btn btn-primary btn-block"
                type="button"
                disabled={otpValue.length < OTP_LENGTH || verifying}
                onClick={() => submitOtp(otpValue)}
              >
                {verifying ? "Verifying…" : "Verify and continue"}
              </button>
            </>
          )}

          {step === "done" && (
            <div className="verified-state">
              <div className="verified-badge">Verified</div>
              <h1 className="title">Number verified</h1>
              <p className="subtitle">Taking you to payment…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}