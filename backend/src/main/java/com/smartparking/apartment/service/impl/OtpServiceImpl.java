package com.smartparking.apartment.service.impl;

import com.smartparking.apartment.service.OtpService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory OTP store. Fine for a single instance / demo; move the map to
 * Redis or a DB table if you ever run more than one backend instance.
 */
@Service
public class OtpServiceImpl implements OtpService {

    private static final Logger log = LoggerFactory.getLogger(OtpServiceImpl.class);
    private static final Duration TTL = Duration.ofMinutes(2);
    private static final Duration RESEND_GAP = Duration.ofSeconds(30);
    private static final int MAX_ATTEMPTS = 5;

    private final SecureRandom random = new SecureRandom();
    private final Map<String, Entry> codes = new ConcurrentHashMap<>();

    /**
     * app.otp.expose-code=true echoes the code back to the UI while there is no SMS
     * provider.
     */
    @Value("${app.otp.expose-code:true}")
    private boolean exposeCode;

    private record Entry(String code, Instant issuedAt, Instant expiresAt, int attempts) {
    }

    @Override
    public String sendOtp(String phone) {
        Entry existing = codes.get(phone);
        if (existing != null && Instant.now().isBefore(existing.issuedAt().plus(RESEND_GAP))) {
            throw new IllegalStateException("Wait a moment before requesting another code");
        }

        String code = String.format("%06d", random.nextInt(1_000_000));
        Instant now = Instant.now();
        codes.put(phone, new Entry(code, now, now.plus(TTL), 0));

        // TODO: replace with your SMS gateway call (Twilio, MSG91, Fast2SMS...).
        log.info("OTP for {} is {}", phone, code);

        return exposeCode ? code : null;
    }

    @Override
    public boolean verifyOtp(String phone, String code) {
        Entry entry = codes.get(phone);
        if (entry == null || Instant.now().isAfter(entry.expiresAt()) || entry.attempts() >= MAX_ATTEMPTS) {
            codes.remove(phone);
            return false;
        }
        if (!entry.code().equals(code)) {
            codes.put(phone, new Entry(entry.code(), entry.issuedAt(), entry.expiresAt(), entry.attempts() + 1));
            return false;
        }
        codes.remove(phone);
        return true;
    }
}