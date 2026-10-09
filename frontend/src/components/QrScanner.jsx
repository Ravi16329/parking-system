import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import {
    adminVerifyEntryQr,
    adminVerifyExitQr,
} from "../api/api";

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
        if (!adminToken) navigate("/admin");
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
        if (scanning || checking) return;

        setError("");
        setResult("");

        try {
            const scanner = new Html5Qrcode("qr-reader");
            scannerRef.current = scanner;

            await scanner.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 250 } },
                async (decodedText) => {
                    if (busyRef.current) return;

                    await scanner.stop().catch(() => { });
                    setScanning(false);
                    await checkToken(decodedText);
                },
                () => { }
            );

            setScanning(true);
        } catch {
            setError(
                "Could not open camera. Allow camera permission or upload a QR image."
            );
        }
    }

    async function uploadImage(event) {
        const file = event.target.files?.[0];
        event.target.value = "";

        if (!file || checking) return;

        setError("");
        setResult("");

        const scanner = new Html5Qrcode("qr-reader");

        try {
            const decodedText = await scanner.scanFile(file, true);
            await checkToken(decodedText);
        } catch {
            setError("Could not read a QR code from this image.");
        }
    }

    if (!adminToken) return null;

    return (
        <main style={{ maxWidth: 650, margin: "30px auto", padding: 20 }}>
            <button onClick={() => navigate("/admin/dashboard")}>
                Back to Dashboard
            </button>

            <h1>{title}</h1>

            <p>
                {isExit
                    ? "Scan the QR code of a vehicle that has already entered. Its occupied slot will be released."
                    : "Scan the QR code of a confirmed booking to approve vehicle entry."}
            </p>

            <div
                id="qr-reader"
                style={{ width: "100%", margin: "20px 0" }}
            />

            <button
                onClick={startCamera}
                disabled={scanning || checking}
            >
                {scanning ? "Camera Active" : "Open Camera"}
            </button>

            <p>Or upload the QR photo from your laptop:</p>

            <input
                type="file"
                accept="image/*"
                onChange={uploadImage}
                disabled={checking || scanning}
            />

            {checking && <p>Checking QR code...</p>}

            {result && (
                <p style={{ color: "green", fontWeight: "bold" }}>
                    {result}
                </p>
            )}

            {error && (
                <p style={{ color: "crimson", fontWeight: "bold" }}>
                    {error}
                </p>
            )}
        </main>
    );
}