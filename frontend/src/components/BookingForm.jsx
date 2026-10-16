
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  createBooking,
  sendOtp,
  verifyOtp,
  releaseSlot,
} from "../api/api";
import HoldCountdown from "./HoldCountdown";
import "./BookingForm.css";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;
const HOURLY_RATE = 50;

function getTodayDateString() {
  const date = new Date();

  return (
    `${date.getFullYear()}-` +
    `${String(date.getMonth() + 1).padStart(2, "0")}-` +
    `${String(date.getDate()).padStart(2, "0")}`
  );
}

function getCurrentMinutes() {
  const date = new Date();
  return date.getHours() * 60 + date.getMinutes();
}

function getMinutes(time) {
  if (!time) return -1;

  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export default function BookingForm({
  selectedSlotId,
  setSelectedSlotId,
  booking,
  setBooking,
  holdExpiresAt,
  setHoldExpiresAt,
}) {
  const navigate = useNavigate();

  const [step, setStep] = useState("details");
  const [name, setName] = useState(booking?.name || "");
  const [phone, setPhone] = useState(booking?.phone || "");

  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const [errors, setErrors] = useState({});
  const [bookingError, setBookingError] = useState("");
  const [expired, setExpired] = useState(false);

  const [digits, setDigits] = useState(
    Array(OTP_LENGTH).fill("")
  );
  const [otpError, setOtpError] = useState("");
  const [devCode, setDevCode] = useState("");

  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [shake, setShake] = useState(false);

  const boxRefs = useRef([]);
  const verificationLock = useRef(false);
  const bookingLock = useRef(false);
  const redirectTimer = useRef(null);
  const shakeTimer = useRef(null);

  const otpValue = digits.join("");

  const phoneValid = /^[6-9][0-9]{9}$/.test(phone);
  const nameValid = name.trim().length >= 2;

  const todayString = getTodayDateString();
  const currentMinutes = getCurrentMinutes();

  const startMinutes = getMinutes(startTime);
  const endMinutes = getMinutes(endTime);

  // Both times must be selected in whole-hour increments.
  // The booking must end later on the same day.
  const validDuration =
    startMinutes >= currentMinutes &&
    startMinutes >= 0 &&
    endMinutes > startMinutes &&
    endMinutes <= 23 * 60 &&
    startMinutes % 60 === 0 &&
    endMinutes % 60 === 0;

  const durationHours = validDuration
    ? (endMinutes - startMinutes) / 60
    : 0;

  const estimatedPrice = durationHours * HOURLY_RATE;

  const maskedPhone = useMemo(() => {
    if (phone.length === 10) {
      return `+91 ${phone.slice(0, 2)}••• ••${phone.slice(-3)}`;
    }

    return phone;
  }, [phone]);

  // Clean up timers when the component unmounts.
  useEffect(() => {
    return () => {
      if (redirectTimer.current) {
        clearTimeout(redirectTimer.current);
      }

      if (shakeTimer.current) {
        clearTimeout(shakeTimer.current);
      }
    };
  }, []);

  // OTP resend countdown.
  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = setInterval(() => {
      setCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown > 0]);

  // Focus the first OTP box when verification opens.
  useEffect(() => {
    if (step === "otp") {
      boxRefs.current[0]?.focus();
    }
  }, [step]);

  const handleHoldExpire = useCallback(() => {
    setExpired(true);
  }, []);

  // Release the held slot when the user goes back.
  async function handleBack() {
    if (verifying || step === "done") return;

    try {
      if (selectedSlotId) {
        await releaseSlot(selectedSlotId);
      }
    } catch (error) {
      console.error("Could not release slot:", error);
    }

    setSelectedSlotId?.(null);
    setHoldExpiresAt?.(null);
    navigate("/slots");
  }

  function handlePickNewSlot() {
    setSelectedSlotId?.(null);
    setHoldExpiresAt?.(null);
    navigate("/slots");
  }

  // Validate the user's details and selected parking time.
  function validateDetails() {
    const next = {};

    if (!nameValid) {
      next.name = "Enter your full name.";
    }

    if (!phoneValid) {
      next.phone =
        "Enter a valid 10-digit Indian mobile number.";
    }

    if (!startTime || !endTime) {
      next.duration = "Select both start and end times.";
    } else if (startMinutes < currentMinutes) {
      next.duration = "The start time cannot be in the past.";
    } else if (endMinutes <= startMinutes) {
      next.duration = "The end time must be after the start time.";
    } else if (
      startMinutes % 60 !== 0 ||
      endMinutes % 60 !== 0
    ) {
      next.duration =
        "Select times on whole-hour boundaries.";
    } else if (endMinutes > 23 * 60) {
      next.duration =
        "The parking end time must be before midnight.";
    } else if (!validDuration) {
      next.duration = "Select a valid parking time.";
    }

    setErrors(next);

    return Object.keys(next).length === 0;
  }

  // Send the demo OTP.
  async function handleSendCode(event) {
    event?.preventDefault();

    if (!validateDetails() || sending || expired) return;

    setSending(true);
    setOtpError("");
    setBookingError("");

    try {
      const result = await sendOtp(phone);

      if (result?.success === false) {
        setOtpError(
          result.message || "Could not send verification code."
        );
        return;
      }

      setDevCode(result?.devCode || "");
      setDigits(Array(OTP_LENGTH).fill(""));
      setCooldown(RESEND_SECONDS);
      setStep("otp");
    } catch (error) {
      setOtpError(
        error.message || "Could not send verification code."
      );
    } finally {
      setSending(false);
    }
  }

  // Resend OTP.
  async function handleResend() {
    if (cooldown > 0 || sending || verifying || expired) {
      return;
    }

    setSending(true);
    setOtpError("");
    setBookingError("");

    try {
      const result = await sendOtp(phone);

      if (result?.success === false) {
        setOtpError(
          result.message || "Could not resend code."
        );
        return;
      }

      setDevCode(result?.devCode || "");
      setDigits(Array(OTP_LENGTH).fill(""));
      setCooldown(RESEND_SECONDS);

      boxRefs.current[0]?.focus();
    } catch (error) {
      setOtpError(error.message || "Could not resend code.");
    } finally {
      setSending(false);
    }
  }

  // Create the booking exactly once after OTP verification.
  const finishBooking = useCallback(async () => {
    if (bookingLock.current) return false;

    bookingLock.current = true;
    setBookingError("");

    try {
      // Build a local date-time string. Do not use toISOString(),
      // because UTC conversion can shift the selected parking time.
      const dateString = getTodayDateString();

      const scheduledStartAt =
        `${dateString}T${startTime}:00`;

      const scheduledEndAt =
        `${dateString}T${endTime}:00`;

      const result = await createBooking({
        slotId: selectedSlotId,
        name: name.trim(),
        phone,
        scheduledStartAt,
        scheduledEndAt,
      });

      if (!result) {
        throw new Error("The server returned no booking details.");
      }

      setBooking({
        ...result,
        scheduledStartAt:
          result.scheduledStartAt || scheduledStartAt,
        scheduledEndAt:
          result.scheduledEndAt || scheduledEndAt,
        durationHours:
          result.durationHours ?? durationHours,
        amount:
          result.amount ?? estimatedPrice,
        phoneVerified: true,
      });

      setStep("done");

      redirectTimer.current = setTimeout(() => {
        navigate("/pay");
      }, 900);

      return true;
    } catch (error) {
      console.error("Booking creation error:", error);

      setBookingError(
        error.message ||
        "Could not create the booking. Please try again."
      );

      return false;
    } finally {
      bookingLock.current = false;
    }
  }, [
    selectedSlotId,
    name,
    phone,
    startTime,
    endTime,
    durationHours,
    estimatedPrice,
    setBooking,
    navigate,
  ]);

  // Verify OTP and create the booking only after verification succeeds.
  const submitOtp = useCallback(
    async (code) => {
      if (
        verificationLock.current ||
        code.length !== OTP_LENGTH ||
        expired
      ) {
        return;
      }

      verificationLock.current = true;
      setVerifying(true);
      setOtpError("");
      setBookingError("");

      try {
        const result = await verifyOtp(phone, code);

        if (result?.success) {
          const created = await finishBooking();

          if (!created) {
            setOtpError(
              "Your number was verified, but the booking could not be created. Please check the error and try again."
            );
          }
        } else {
          setOtpError(
            result?.message || "Incorrect verification code."
          );

          setDigits(Array(OTP_LENGTH).fill(""));
          setShake(true);

          if (shakeTimer.current) {
            clearTimeout(shakeTimer.current);
          }

          shakeTimer.current = setTimeout(() => {
            setShake(false);
          }, 450);

          boxRefs.current[0]?.focus();
        }
      } catch (error) {
        setOtpError(
          error.message || "Verification failed. Please try again."
        );
      } finally {
        verificationLock.current = false;
        setVerifying(false);
      }
    },
    [phone, expired, finishBooking]
  );

  // Write one or multiple digits into OTP boxes.
  function writeDigits(startIndex, chars) {
    if (verifying) return;

    setDigits((previous) => {
      const next = [...previous];

      for (
        let i = 0;
        i < chars.length && startIndex + i < OTP_LENGTH;
        i++
      ) {
        next[startIndex + i] = chars[i];
      }

      return next;
    });

    const nextIndex = Math.min(
      startIndex + chars.length,
      OTP_LENGTH - 1
    );

    boxRefs.current[nextIndex]?.focus();
  }

  function handleBoxChange(index, rawValue) {
    if (verifying) return;

    const chars = rawValue.replace(/\D/g, "");

    if (!chars) {
      setDigits((previous) => {
        const next = [...previous];
        next[index] = "";
        return next;
      });
      return;
    }

    setOtpError("");
    writeDigits(index, chars.split(""));
  }

  function handleBoxKeyDown(index, event) {
    if (verifying) return;

    if (event.key === "Backspace") {
      event.preventDefault();

      setDigits((previous) => {
        const next = [...previous];

        if (next[index]) {
          next[index] = "";
        } else if (index > 0) {
          next[index - 1] = "";
          boxRefs.current[index - 1]?.focus();
        }

        return next;
      });
    } else if (event.key === "ArrowLeft" && index > 0) {
      boxRefs.current[index - 1]?.focus();
    } else if (
      event.key === "ArrowRight" &&
      index < OTP_LENGTH - 1
    ) {
      boxRefs.current[index + 1]?.focus();
    }
  }

  function handlePaste(index, event) {
    if (verifying) return;

    const pastedText = (
      event.clipboardData.getData("text") || ""
    ).replace(/\D/g, "");

    if (!pastedText) return;

    event.preventDefault();
    setOtpError("");

    writeDigits(
      index,
      pastedText.slice(0, OTP_LENGTH - index).split("")
    );
  }

  // No slot selected.
  if (!selectedSlotId) {
    return (
      <div className="page booking-page">
        <div className="container">
          <div className="card booking-card">
            <h1 className="title">No slot selected</h1>

            <p className="subtitle">
              Pick a bay in the garage first.
            </p>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate("/slots")}
            >
              Choose a slot
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Slot hold expired.
  if (expired && step !== "done") {
    return (
      <div className="page booking-page">
        <div className="container">
          <div className="card booking-card">
            <h1 className="title">Your hold expired</h1>

            <p className="subtitle">
              {selectedSlotId} wasn't confirmed in time,
              so it has been released back to the garage.
            </p>

            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={handlePickNewSlot}
            >
              Choose a slot
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page booking-page">
      <div className="container">
        <div className="card booking-card">
          <button
            type="button"
            className="booking-back-btn"
            onClick={handleBack}
            disabled={verifying || step === "done"}
          >
            ← Back
          </button>

          <div className="progress">
            <span className="progress-step active" />
            <span className="progress-step active" />
            <span className="progress-step" />
            <span className="progress-step" />
          </div>

          {/* Selected slot and hold countdown */}
          <div className="slot-banner">
            <div className="slot-banner-tag">
              {selectedSlotId}
            </div>

            <div className="slot-banner-text">
              <strong>Bay held for you</strong>
              <span>Finish verification to keep it</span>
            </div>

            {step !== "done" && (
              <HoldCountdown
                expiresAt={holdExpiresAt}
                onExpire={handleHoldExpire}
                label="Expires in"
              />
            )}
          </div>

          {/* STEP 1: USER DETAILS AND PARKING TIME */}
          {step === "details" && (
            <>
              <h1 className="title">Your details</h1>

              <p className="subtitle">
                Select your parking start and end times,
                then verify your mobile number.
              </p>

              <form onSubmit={handleSendCode} noValidate>
                {/* Today's date */}
                <div className="form-group">
                  <label htmlFor="parkingDate">
                    Parking date
                  </label>

                  <input
                    id="parkingDate"
                    type="date"
                    value={todayString}
                    readOnly
                  />

                  <small>
                    Bookings are available for today only.
                  </small>
                </div>

                {/* Start time */}
                <div className="form-group">
                  <label htmlFor="startTime">
                    Parking start time
                  </label>

                  <input
                    id="startTime"
                    type="time"
                    step="3600"
                    required
                    value={startTime}
                    onChange={(event) => {
                      const value = event.target.value;

                      setStartTime(value);
                      setErrors((previous) => ({
                        ...previous,
                        duration: undefined,
                      }));
                      setBookingError("");
                    }}
                  />
                </div>

                {/* End time */}
                <div className="form-group">
                  <label htmlFor="endTime">
                    Parking end time
                  </label>

                  <input
                    id="endTime"
                    type="time"
                    step="3600"
                    required
                    min={startTime || undefined}
                    value={endTime}
                    onChange={(event) => {
                      setEndTime(event.target.value);
                      setErrors((previous) => ({
                        ...previous,
                        duration: undefined,
                      }));
                      setBookingError("");
                    }}
                  />

                  {errors.duration && (
                    <div className="error-text" role="alert">
                      {errors.duration}
                    </div>
                  )}

                  {startTime && endTime && !validDuration && (
                    <div className="error-text" role="alert">
                      Select a start time that is not in the past
                      and an end time later on the same day.
                      Duration must be in whole hours.
                    </div>
                  )}

                  <small>
                    Duration: {durationHours} hour(s). Rate: ₹
                    {HOURLY_RATE} per hour. Estimated price: ₹
                    {estimatedPrice}. No daily cap.
                  </small>
                </div>

                {/* Full name */}
                <div className="form-group">
                  <label htmlFor="name">Full name</label>

                  <input
                    id="name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value);

                      if (errors.name) {
                        setErrors((previous) => ({
                          ...previous,
                          name: undefined,
                        }));
                      }
                    }}
                    placeholder="Rahul Sharma"
                  />

                  {errors.name && (
                    <div className="error-text">
                      {errors.name}
                    </div>
                  )}
                </div>

                {/* Mobile number */}
                <div className="form-group">
                  <label htmlFor="phone">Mobile number</label>

                  <div
                    className={`phone-field ${errors.phone ? "invalid" : ""
                      }`}
                  >
                    <span className="cc">+91</span>

                    <input
                      id="phone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      maxLength={10}
                      value={phone}
                      onChange={(event) => {
                        setPhone(
                          event.target.value
                            .replace(/\D/g, "")
                            .slice(0, 10)
                        );

                        if (errors.phone) {
                          setErrors((previous) => ({
                            ...previous,
                            phone: undefined,
                          }));
                        }
                      }}
                      placeholder="9876543210"
                    />

                    {phoneValid && (
                      <span className="tick" aria-hidden="true">
                        ✓
                      </span>
                    )}
                  </div>

                  {errors.phone && (
                    <div className="error-text">
                      {errors.phone}
                    </div>
                  )}
                </div>

                {otpError && (
                  <div className="error-text" role="alert">
                    {otpError}
                  </div>
                )}

                {bookingError && (
                  <div className="error-text" role="alert">
                    {bookingError}
                  </div>
                )}

                <button
                  className="btn btn-primary btn-block"
                  type="submit"
                  disabled={
                    sending ||
                    !nameValid ||
                    !phoneValid ||
                    !validDuration ||
                    expired
                  }
                >
                  {sending
                    ? "Sending code…"
                    : "Send verification code"}
                </button>
              </form>
            </>
          )}

          {/* STEP 2: OTP VERIFICATION */}
          {step === "otp" && (
            <>
              <h1 className="title">Verify your number</h1>

              <p className="subtitle">
                Code sent to <strong>{maskedPhone}</strong>{" "}

                <button
                  type="button"
                  className="link-btn"
                  onClick={() => {
                    setStep("details");
                    setOtpError("");
                    setBookingError("");
                    setDigits(Array(OTP_LENGTH).fill(""));
                  }}
                  disabled={verifying}
                >
                  Change
                </button>
              </p>

              <div
                className={`otp-row ${shake ? "shake" : ""} ${verifying ? "busy" : ""
                  }`}
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(6, minmax(0, 1fr))",
                  gap: "8px",
                  width: "100%",
                  maxWidth: "420px",
                  margin: "24px auto 12px",
                }}
              >
                {digits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(element) => {
                      boxRefs.current[index] = element;
                    }}
                    className={`otp-box ${digit ? "filled" : ""
                      } ${otpError ? "error" : ""}`}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete={
                      index === 0 ? "one-time-code" : "off"
                    }
                    maxLength={OTP_LENGTH}
                    value={digit}
                    disabled={verifying}
                    onChange={(event) =>
                      handleBoxChange(index, event.target.value)
                    }
                    onKeyDown={(event) =>
                      handleBoxKeyDown(index, event)
                    }
                    onPaste={(event) => handlePaste(index, event)}
                    onFocus={(event) => event.target.select()}
                    aria-label={`Digit ${index + 1}`}
                    style={{
                      boxSizing: "border-box",
                      width: "100%",
                      minWidth: 0,
                      height: "52px",
                      textAlign: "center",
                      fontSize: "22px",
                      fontWeight: 700,
                      borderRadius: "10px",
                    }}
                  />
                ))}
              </div>

              {otpError && (
                <div
                  className="error-text otp-error"
                  role="alert"
                >
                  {otpError}
                </div>
              )}

              {bookingError && (
                <div className="error-text" role="alert">
                  {bookingError}
                </div>
              )}

              {verifying && (
                <div className="otp-status">
                  Checking code…
                </div>
              )}

              <div className="otp-actions">
                {cooldown > 0 ? (
                  <span className="muted">
                    Resend available in {cooldown}s
                  </span>
                ) : (
                  <button
                    type="button"
                    className="link-btn"
                    onClick={handleResend}
                    disabled={sending || verifying}
                  >
                    {sending ? "Sending…" : "Resend code"}
                  </button>
                )}
              </div>

              {devCode && (
                <div className="dev-hint">
                  Demo mode — your code is{" "}
                  <strong>{devCode}</strong>. Remove this block
                  once the SMS API is live.
                </div>
              )}

              <button
                className="btn btn-primary btn-block"
                type="button"
                disabled={
                  otpValue.length !== OTP_LENGTH ||
                  verifying ||
                  sending ||
                  expired
                }
                onClick={() => submitOtp(otpValue)}
              >
                {verifying
                  ? "Verifying…"
                  : "Verify and continue"}
              </button>
            </>
          )}

          {/* STEP 3: VERIFIED */}
          {step === "done" && (
            <div className="verified-state">
              <div className="verified-badge">Verified</div>

              <h1 className="title">Number verified</h1>

              <p className="subtitle">
                Taking you to payment…
              </p>

              <p className="subtitle">
                Start time: {startTime}
              </p>

              <p className="subtitle">
                End time: {endTime}
              </p>

              <p className="subtitle">
                Parking duration: {durationHours}{" "}
                {durationHours === 1 ? "hour" : "hours"}
              </p>

              <p className="subtitle">
                Estimated total: ₹{estimatedPrice}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
