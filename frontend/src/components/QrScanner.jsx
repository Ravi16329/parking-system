
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { adminVerifyQr } from "../api/api";

export default function QrScanner() {
    const navigate = useNavigate();
    const scannerRef = useRef(null);
    const busyRef = useRef(false);

    const [result, setResult] = useState("");
    const [error, setError] = useState("");
    const [scanning, setScanning] = useState(false);
    const [checking, setChecking] = useState(false);

    const adminToken = sessionStorage.getItem("adminToken");

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
            const data = await adminVerifyQr(token, adminToken);
            setResult(
                `ACCESS GRANTED — QR status: ${data.status}`
            );
            setScanning(false);
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
        }
    }

    async function startCamera() {
        setError("");
        setResult("");

        try {
            const scanner = new Html5Qrcode("qr-reader");
            scannerRef.current = scanner;

            await scanner.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 250 } },
                async (decodedText) => {
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

        if (!file) return;

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

            <h1>Check Parking QR</h1>
            <p>Scan a customer's parking QR or upload its image.</p>

            <div id="qr-reader" style={{ width: "100%", margin: "20px 0" }} />

            <button onClick={startCamera} disabled={scanning || checking}>
                {scanning ? "Camera Active" : "Open Camera"}
            </button>

            <p>Or upload the QR photo from your laptop:</p>

            <input
                type="file"
                accept="image/*"
                onChange={uploadImage}
                disabled={checking}
            />

            {checking && <p>Verifying QR…</p>}

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
