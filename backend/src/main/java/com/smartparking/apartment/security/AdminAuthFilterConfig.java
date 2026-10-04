package com.smartparking.apartment.security;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Registers AdminAuthFilter for /api/admin/* only, so every other route
 * (slots, bookings, payments, public announcements) is unaffected.
 * AdminAuthFilter is deliberately NOT a @Component — this registration is
 * the only place it's created, so it isn't auto-applied to every request.
 */
@Configuration
public class AdminAuthFilterConfig {

    @Autowired
    private AdminAuthService adminAuthService;

    @Bean
    public FilterRegistrationBean<AdminAuthFilter> adminAuthFilterRegistration() {
        FilterRegistrationBean<AdminAuthFilter> registration = new FilterRegistrationBean<>();
        registration.setFilter(new AdminAuthFilter(adminAuthService));
        registration.addUrlPatterns("/api/admin/*");
        registration.setOrder(1);
        return registration;
    }
}
