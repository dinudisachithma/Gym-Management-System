package com.gymmanagementsystem.aiproject.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    /**
     * Provides the PasswordEncoder bean used by DataInitializer and UserService.
     * BCrypt is the recommended algorithm for securely hashing passwords.
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * Disables Spring Security's default login page and allows all requests through.
     * Authentication is handled manually via HTTP session in AuthController.
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // Disable CSRF for simplicity (session-based manual auth)
            .csrf(csrf -> csrf.disable())
            // Allow ALL requests without Spring Security authentication
            .authorizeHttpRequests(auth -> auth
                .anyRequest().permitAll()
            )
            // Disable the default login form provided by Spring Security
            .formLogin(form -> form.disable())
            // Disable HTTP Basic auth popup
            .httpBasic(basic -> basic.disable());

        return http.build();
    }
}
