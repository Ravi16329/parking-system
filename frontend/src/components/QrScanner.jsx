import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";

import {
    adminVerifyEntryQr,
    adminVerifyExitQr,
} from "../api/api";

import "./QrScanner.css";

export default function QrScanner({ mode = "entry" }) {
    const navigate = useNavigate();
    const scannerRef = useRef(null);
    const busyRef = useRef(false);

    const [result, setResult] = useState("");
    const [error, setError] = useState("");
    const [scanning, setScanning] = useState(false);
    const [checking, setChecking] = useState(false);

    const adminToken = sessionStorage.getItem("adminToken");
    const isExit = mode === "exit";
    const title = isExit ? "Exit Check" : "Entry Check";

    useEffect(() => {
        if (!adminToken) {
            navigate("/admin");
        }
    }, [adminToken, navigate]);

    useEffect(() => {
        return () => {
            const scanner = scannerRef.current;

            if (scanner?.isScanning) {
                scanner.stop().catch(() => { });
            }
        };
    }, []);

    async function checkToken(token) {
        if (busyRef.current) return;

        busyRef.current = true;
        setChecking(true);
        setError("");
        setResult("");

        try {
            const verify = isExit
                ? adminVerifyExitQr
                : adminVerifyEntryQr;

            const data = await verify(token, adminToken);

            setResult(
                isExit
                    ? `EXIT SUCCESSFUL — Slot released. QR status: ${data.status}`
                    : `ENTRY APPROVED — QR status: ${data.status}`
            );
        } catch (err) {
            if (err.message === "UNAUTHORIZED") {
                sessionStorage.removeItem("adminToken");
                navigate("/admin");
            } else {
                setError(err.message || "QR verification failed.");
            }
        } finally {
            busyRef.current = false;
            setChecking(false);
            setScanning(false);
        }
    }

    async function startCamera() {
        if (scanning || checking || busyRef.current) return;

        setError("");
        setResult("");

        try {
            const scanner = new Html5Qrcode("qr-reader");
            scannerRef.current = scanner;

            await scanner.start(
                { facingMode: "environment" },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                },
                async (decodedText) => {
                    if (busyRef.current) return;

                    try {
                        if (scanner.isScanning) {
                            await scanner.stop();
                        }
                    } catch (err) {
                        console.warn("Could not stop camera:", err);
                    }

                    setScanning(false);
                    await checkToken(decodedText);
                },
                () => { }
            );

            setScanning(true);
        } catch (err) {
            console.error("Camera error:", err);
            setError(
                "Could not open camera. Allow camera permission or upload a QR image."
            );
            setScanning(false);
        }
    }

    async function uploadImage(event) {
        const file = event.target.files?.[0];
        event.target.value = "";

        if (!file || checking || scanning || busyRef.current) {
            return;
        }

        setError("");
        setResult("");
        setChecking(true);

        const scanner = new Html5Qrcode("qr-reader");

        try {
            const decodedText = await scanner.scanFile(file, false);

            setChecking(false);

            await checkToken(decodedText);
        } catch (err) {
            console.error("QR image decoding failed:", err);

            setError(
                "Could not decode this image. Upload a clear QR code image with a white border."
            );
        } finally {
            setChecking(false);

            try {
                await scanner.clear();
            } catch (err) {
                // The scanner may already have been cleared.
            }
        }
    }

    if (!adminToken) return null;

    return (
        <main className="qr-scanner-page">
            <button
                type="button"
                className="qr-back-button"
                onClick={() => navigate("/admin/dashboard")}
            >
                ← Back to Dashboard
            </button>

            <h1>{title}</h1>

            <p className="qr-scanner-description">
                {isExit
                    ? "Scan the QR code of a vehicle that has already entered. Its occupied slot will be released."
                    : "Scan the QR code of a confirmed booking to approve vehicle entry."}
            </p>

            <section className="qr-scanner-card">
                <h2>Scan Parking QR</h2>

                <p className="qr-instruction">
                    Use your camera or upload the customer's QR image.
                </p>

                <div id="qr-reader" />

                <button
                    type="button"
                    className="qr-action-button"
                    onClick={startCamera}
                    disabled={scanning || checking}
                >
                    {scanning ? "Camera Active" : "📷 Open Camera"}
                </button>

                <div className="qr-upload-box">
                    <p>Or upload the QR photo from your laptop</p>

                    <input
                        className="qr-file-input"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={uploadImage}
                        disabled={checking || scanning}
                    />
                </div>

                {scanning && (
                    <div className="qr-loading">
                        Camera is active. Position the QR code inside the scanning area.
                    </div>
                )}

                {checking && (
                    <div className="qr-loading">
                        {isExit
                            ? "Verifying exit and releasing the slot..."
                            : "Verifying entry..."}
                    </div>
                )}

                {result && (
                    <div className="qr-result" role="status">
                        ✓ {result}
                    </div>
                )}

                {error && (
                    <div className="qr-error" role="alert">
                        ✕ {error}
                    </div>
                )}
            </section>
        </main>
    );
}