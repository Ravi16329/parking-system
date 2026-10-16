
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

    private static final Logger log =
            LoggerFactory.getLogger(MessageCentralOtpService.class);

    private static final String BASE_URL =
            "https://cpaas.messagecentral.com";

    private static final long OTP_TTL_SECONDS = 120;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${messagecentral.customer-id}")
    private String customerId;

    @Value("${messagecentral.password-key}")
    private String passwordKey;

    @Value("${messagecentral.email:}")
    private String email;

    private record Verification(
            String id,
            Instant expiresAt,
            String authToken
    ) {}

    private final Map<String, Verification> verifications =
            new ConcurrentHashMap<>();

    /**
     * Generate an authentication token from Message Central.
     */
    private String generateToken() {

        UriComponentsBuilder builder = UriComponentsBuilder
                .fromHttpUrl(
                        BASE_URL + "/auth/v1/authentication/token")
                .queryParam("customerId", customerId)
                .queryParam("key", passwordKey)
                .queryParam("scope", "NEW")
                .queryParam("country", "91");

        if (email != null && !email.isBlank()) {
            builder.queryParam("email", email);
        }

        String url = builder.build()
                .encode()
                .toUriString();

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    new HttpEntity<>(new HttpHeaders()),
                    String.class
            );

            JsonNode json =
                    objectMapper.readTree(response.getBody());

            String token = json.path("token").asText("");

            if (token.isBlank()) {
                token = json.path("data")
                        .path("authToken")
                        .asText("");
            }

            if (token.isBlank()) {
                log.error(
                        "Message Central authentication response contained no token."
                );

                throw new IllegalStateException(
                        "Message Central did not return an authentication token."
                );
            }

            return token;

        } catch (RestClientResponseException e) {
            log.error(
                    "Message Central authentication failed with HTTP status {}.",
                    e.getStatusCode().value()
            );

            throw new IllegalStateException(
                    "Message Central authentication failed (HTTP "
                            + e.getStatusCode().value() + ")."
            );

        } catch (Exception e) {
            if (e instanceof IllegalStateException) {
                throw (IllegalStateException) e;
            }

            log.error(
                    "Unexpected Message Central authentication error: {}",
                    e.getClass().getSimpleName()
            );

            throw new IllegalStateException(
                    "Could not authenticate with Message Central."
            );
        }
    }

    /**
     * Send an SMS OTP and save the provider verification session.
     */
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
                    url,
                    HttpMethod.POST,
                    new HttpEntity<>(headers),
                    String.class
            );

            JsonNode json =
                    objectMapper.readTree(response.getBody());

            String responseCode =
                    json.path("responseCode").asText("");

            String verificationId = json.path("data")
                    .path("verificationId")
                    .asText("");

            if (!"200".equals(responseCode)
                    || verificationId.isBlank()) {

                log.error(
                        "Message Central OTP send response was unsuccessful. "
                                + "HTTP status: {}, responseCode: {}",
                        response.getStatusCode().value(),
                        responseCode
                );

                throw new IllegalStateException(
                        "Message Central could not send the OTP. "
                                + "Check the account, credits and API response."
                );
            }

            // Store the verification ID and the SAME token used for sending.
            verifications.put(
                    phone,
                    new Verification(
                            verificationId,
                            Instant.now().plusSeconds(OTP_TTL_SECONDS),
                            token
                    )
            );

            log.info(
                    "Message Central OTP send request succeeded for the supplied phone."
            );

        } catch (RestClientResponseException e) {
            log.error(
                    "Message Central OTP sending failed with HTTP status {}.",
                    e.getStatusCode().value()
            );

            throw new IllegalStateException(
                    "OTP sending failed (HTTP "
                            + e.getStatusCode().value() + ")."
            );

        } catch (Exception e) {
            if (e instanceof IllegalStateException) {
                throw (IllegalStateException) e;
            }

            log.error(
                    "Unexpected OTP sending error: {}",
                    e.getClass().getSimpleName()
            );

            throw new IllegalStateException(
                    "Could not send OTP."
            );
        }
    }

    /**
     * Verify the OTP using the provider verification ID.
     */
    public boolean verifyOtp(String phone, String code) {

        Verification verification = verifications.get(phone);

        if (verification == null) {
            log.warn(
                    "OTP verification failed: no active verification session."
            );

            return false;
        }

        if (Instant.now().isAfter(verification.expiresAt())) {
            verifications.remove(phone, verification);

            log.warn(
                    "OTP verification failed: verification session expired."
            );

            return false;
        }

        // Reuse the token associated with this verification session.
        String token = verification.authToken();

        String url = UriComponentsBuilder
                .fromHttpUrl(
                        BASE_URL + "/verification/v3/validateOtp/")
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

            JsonNode json =
                    objectMapper.readTree(response.getBody());

            String responseCode =
                    json.path("responseCode").asText("");

            String status = json.path("data")
                    .path("verificationStatus")
                    .asText("");

            String message =
                    json.path("message").asText("");

            // Do not log the OTP, authentication token, or full request URL.
            log.info(
                    "Message Central validation response: "
                            + "HTTP {}, responseCode={}, status={}, message={}",
                    response.getStatusCode().value(),
                    responseCode,
                    status,
                    message
            );

            if ("VERIFICATION_COMPLETED".equalsIgnoreCase(status)) {
                verifications.remove(phone, verification);
                return true;
            }

            // Incorrect OTP: leave the session available for a retry.
            return false;

        } catch (RestClientResponseException e) {
            // Provider response helps diagnose HTTP 401 and other errors.
            // Avoid logging the request URL because it contains the OTP.
            log.error(
                    "Message Central verification HTTP error: {}. "
                            + "Provider response: {}",
                    e.getStatusCode().value(),
                    sanitizeProviderMessage(e.getResponseBodyAsString())
            );

            throw new IllegalStateException(
                    "Message Central verification request failed (HTTP "
                            + e.getStatusCode().value() + ")."
            );

        } catch (Exception e) {
            log.error(
                    "Unexpected Message Central verification error: {}",
                    e.getClass().getSimpleName()
            );

            throw new IllegalStateException(
                    "Could not verify the OTP with Message Central."
            );
        }
    }

    /**
     * Avoid accidentally writing credentials or OTP values from provider
     * responses to application logs.
     */
    private String sanitizeProviderMessage(String body) {
        if (body == null || body.isBlank()) {
            return "(empty response)";
        }

        try {
            JsonNode json = objectMapper.readTree(body);

            // Log only common diagnostic fields, not the entire response.
            String responseCode =
                    json.path("responseCode").asText("");

            String message =
                    json.path("message").asText("");

            if (message.isBlank()) {
                message = json.path("error").asText("");
            }

            return "responseCode=" + responseCode
                    + ", message=" + message;

        } catch (Exception e) {
            return "(provider returned a non-JSON error response)";
        }
    }
}
