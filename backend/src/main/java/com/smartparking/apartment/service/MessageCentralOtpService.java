package com.smartparking.apartment.service;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class MessageCentralOtpService {

    private static final String BASE_URL =
            "https://cpaas.messagecentral.com";


            private static final Logger log =
        LoggerFactory.getLogger(MessageCentralOtpService.class);

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${messagecentral.customer-id}")
    private String customerId;

    @Value("${messagecentral.password-key}")
    private String passwordKey;

    @Value("${messagecentral.email:}")
    private String email;

    private record Verification(String id, Instant expiresAt) {}

    private final Map<String, Verification> verifications =
            new ConcurrentHashMap<>();

    private String generateToken() {
        String url = UriComponentsBuilder
                .fromHttpUrl(BASE_URL + "/auth/v1/authentication/token")
                .queryParam("customerId", customerId)
                .queryParam("key", passwordKey)
                .queryParam("scope", "NEW")
                .queryParam("country", "91")
                .queryParamIfPresent(
                        "email",
                        email == null || email.isBlank()
                                ? java.util.Optional.empty()
                                : java.util.Optional.of(email))
                .build()
                .encode()
                .toUriString();

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    url, HttpMethod.GET, new HttpEntity<>(new HttpHeaders()),
                    String.class);

            JsonNode json = objectMapper.readTree(response.getBody());
            String token = json.path("token").asText("");

            if (token.isBlank()) {
                token = json.path("data").path("authToken").asText("");
            }

            if (token.isBlank()) {
                throw new IllegalStateException(
                        "Message Central did not return an authentication token.");
            }

            return token;
        } catch (RestClientResponseException e) {
            throw new IllegalStateException(
                    "Message Central authentication failed (HTTP "
                            + e.getStatusCode().value() + ").");
        } catch (Exception e) {
            if (e instanceof IllegalStateException) {
                throw (IllegalStateException) e;
            }
            throw new IllegalStateException(
                    "Could not authenticate with Message Central.");
        }
    }

    public void sendOtp(String phone) {
        String token = generateToken();

        String url = UriComponentsBuilder
                .fromHttpUrl(BASE_URL + "/verification/v3/send")
                .queryParam("countryCode", "91")
                .queryParam("customerId", customerId)
                .queryParam("flowType", "SMS")
                .queryParam("otpLength", 6)
                .queryParam("mobileNumber", phone)
                .build()
                .encode()
                .toUriString();

        HttpHeaders headers = new HttpHeaders();
        headers.set("authToken", token);

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    url, HttpMethod.POST, new HttpEntity<>(headers),
                    String.class);

            JsonNode json = objectMapper.readTree(response.getBody());
            JsonNode data = json.path("data");

            String responseCode =
                    json.path("responseCode").asText("");

            String verificationId =
                    data.path("verificationId").asText("");

            if (!"200".equals(responseCode) || verificationId.isBlank()) {
                throw new IllegalStateException(
                        "Message Central could not send the OTP. Check your account and credits.");
            }

            // Keep the provider's verification ID on the backend.
            verifications.put(phone, new Verification(
                    verificationId, Instant.now().plusSeconds(120)));

        } catch (RestClientResponseException e) {
            throw new IllegalStateException(
                    "OTP sending failed (HTTP " + e.getStatusCode().value() + ").");
        } catch (Exception e) {
            if (e instanceof IllegalStateException) {
                throw (IllegalStateException) e;
            }
            throw new IllegalStateException("Could not send OTP.");
        }
    }

    
public boolean verifyOtp(String phone, String code) {
    Verification verification = verifications.get(phone);

    if (verification == null
            || Instant.now().isAfter(verification.expiresAt())) {
        verifications.remove(phone);
        log.warn("OTP verification unavailable: no active verification session.");
        return false;
    }

    String token = generateToken();

    String url = UriComponentsBuilder
            .fromHttpUrl(BASE_URL + "/verification/v3/validateOtp/")
            .queryParam("verificationId", verification.id())
            .queryParam("code", code)
            .queryParam("flowType", "SMS")
            .build()
            .encode()
            .toUriString();

    HttpHeaders headers = new HttpHeaders();
    headers.set("authToken", token);

    try {
        ResponseEntity<String> response = restTemplate.exchange(
                url,
                HttpMethod.GET,
                new HttpEntity<>(headers),
                String.class
        );

        JsonNode json = objectMapper.readTree(response.getBody());

        String responseCode = json.path("responseCode").asText("");
        String message = json.path("message").asText("");
        String status = json.path("data")
                .path("verificationStatus").asText("");

        // Safe diagnostics only: never log the OTP or authentication token.
        log.info(
                "Message Central OTP verification response: HTTP {}, responseCode={}, status={}, message={}",
                response.getStatusCode().value(),
                responseCode,
                status,
                message
        );

        if ("VERIFICATION_COMPLETED".equalsIgnoreCase(status)) {
            verifications.remove(phone);
            return true;
        }

        // Keep the session available for a retry if the provider rejected
        // the code or returned an unexpected status.
        return false;

    } catch (RestClientResponseException e) {
        log.error(
                "Message Central OTP verification HTTP error: {}",
                e.getStatusCode().value()
        );

        // Don't disguise a provider/API failure as an incorrect OTP.
        throw new IllegalStateException(
                "Message Central verification request failed (HTTP "
                        + e.getStatusCode().value() + ")."
        );

    } catch (Exception e) {
        log.error(
                "Unexpected error during Message Central OTP verification: {}",
                e.getClass().getSimpleName()
        );

        throw new IllegalStateException(
                "Could not verify the OTP with Message Central."
        );
    }
}

}