package com.gymmanagementsystem.aiproject.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class HomeController {

    @GetMapping({"/", "/landing"})
    public String landing() {
        return "landing";
    }

    @GetMapping("/login")
    public String login() {
        return "login";
    }

    @GetMapping("/register")
    public String register() {
        return "member-register";
    }

    @GetMapping("/admin-dashboard")
    public String adminDashboard() {
        return "admin-dashboard";
    }

    @GetMapping("/admin-trainers")
    public String adminTrainers() {
        return "admin-trainers";
    }

    @GetMapping("/trainer-dashboard")
    public String trainerDashboard() {
        return "trainer-dashboard";
    }

    @GetMapping("/admin-attendance-record")
    public String adminAttendanceRecord() {
        return "admin-attendance-record";
    }

    @GetMapping("/admin-notifications")
    public String adminNotifications() {
        return "admin-notifications";
    }

    @GetMapping("/admin-churn")
    public String adminChurn() {
        return "admin-churn";
    }

    @GetMapping({"/member-dashboard", "/membership-dashboard"})
    public String memberDashboard() {
        return "member-dashboard";
    }

    /**
     * Placeholder payment page. User is sent here when they click "Activate" on a package.
     * The actual payment portal is built by another team; they can replace this or configure
     * the frontend to redirect to their URL. After payment, they should call POST /api/auth/payment-callback
     * to set the user's status from PENDING to ACTIVE.
     */
    @GetMapping("/payment")
    public String payment() {
        return "member-payment";
    }

    @GetMapping("/admin-feedback")
    public String adminFeedback() {
        return "admin-feedback";
    }

    @GetMapping("/edit-details")
    public String editDetails() {
        return "member-edit-details";
    }

    @GetMapping("/change-password")
    public String changePassword() {
        return "member-change-password";
    }

    @GetMapping("/system-test")
    public String systemTest() {
        return "test";
    }

    @GetMapping("/payment-success")
    public String paymentSuccess() {
        return "member-payment-success";
    }

    @GetMapping("/payment-cancel")
    public String paymentCancel() {
        return "member-payment-cancel";
    }
}