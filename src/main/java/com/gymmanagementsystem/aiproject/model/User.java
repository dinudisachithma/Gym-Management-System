package com.gymmanagementsystem.aiproject.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;
import java.time.LocalDateTime;

@Document(collection = "Users")
public class User {
    @Id
    private String id;

    private String name;
    @Indexed(unique = true)
    private String email;
    private String password;
    private String gender;
    private int age;
    private String city;
    private String phone;
    private String address;
    private String role; // "MEMBER" or "ADMIN" or "TRAINER"
    private String deleteRequestStatus; // "NONE" or "PENDING"
    private boolean passwordChanged; // tracks if user has changed their initial password

    // Membership fields
    @Indexed(unique = true, sparse = true)
    private String memberNo; // e.g. M-001
    private String membershipPackage;
    private String packageStatus; // "PENDING", "PAID", or "ACTIVE"
    private LocalDateTime membershipActivationDate;
    private LocalDateTime membershipExpiryDate; // calculated when membership is activated
    @Indexed(unique = true, sparse = true)
    private String membershipId; // e.g. GYM-001

    // Complaint field
    private String complaint;
    private String complaintStatus; // "PENDING" or "RESOLVED"
    private LocalDateTime complaintDate;

    // Profile photo (Base64 data URL, stored directly in MongoDB)
    private String profilePhoto;

    // Landing page photo — set ONLY by admin, never by trainer (controls public presence)
    private String landingPagePhoto;

    // Trainer-specific fields
    private String specialization;
    private String certifications;
    private Double hourlyRate;
    private String contactNumber;

    public User() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getMemberNo() { return memberNo; }
    public void setMemberNo(String memberNo) { this.memberNo = memberNo; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    @JsonIgnore
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }
    public int getAge() { return age; }
    public void setAge(int age) { this.age = age; }
    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getDeleteRequestStatus() { return deleteRequestStatus; }
    public void setDeleteRequestStatus(String status) { this.deleteRequestStatus = status; }
    public boolean isPasswordChanged() { return passwordChanged; }
    public void setPasswordChanged(boolean passwordChanged) { this.passwordChanged = passwordChanged; }
    public String getMembershipPackage() { return membershipPackage; }
    public void setMembershipPackage(String membershipPackage) { this.membershipPackage = membershipPackage; }
    public String getPackageStatus() { return packageStatus; }
    public void setPackageStatus(String packageStatus) { this.packageStatus = packageStatus; }
    public LocalDateTime getMembershipActivationDate() { return membershipActivationDate; }
    public void setMembershipActivationDate(LocalDateTime membershipActivationDate) { this.membershipActivationDate = membershipActivationDate; }
    public LocalDateTime getMembershipExpiryDate() { return membershipExpiryDate; }
    public void setMembershipExpiryDate(LocalDateTime membershipExpiryDate) { this.membershipExpiryDate = membershipExpiryDate; }
    public String getMembershipId() { return membershipId; }
    public void setMembershipId(String membershipId) { this.membershipId = membershipId; }
    public String getComplaint() { return complaint; }
    public void setComplaint(String complaint) { this.complaint = complaint; }
    public String getComplaintStatus() { return complaintStatus; }
    public void setComplaintStatus(String complaintStatus) { this.complaintStatus = complaintStatus; }
    public LocalDateTime getComplaintDate() { return complaintDate; }
    public void setComplaintDate(LocalDateTime complaintDate) { this.complaintDate = complaintDate; }
    public String getProfilePhoto() { return profilePhoto; }
    public void setProfilePhoto(String profilePhoto) { this.profilePhoto = profilePhoto; }
    public String getLandingPagePhoto() { return landingPagePhoto; }
    public void setLandingPagePhoto(String landingPagePhoto) { this.landingPagePhoto = landingPagePhoto; }
    public String getSpecialization() { return specialization; }
    public void setSpecialization(String specialization) { this.specialization = specialization; }
    public String getCertifications() { return certifications; }
    public void setCertifications(String certifications) { this.certifications = certifications; }
    public Double getHourlyRate() { return hourlyRate; }
    public void setHourlyRate(Double hourlyRate) { this.hourlyRate = hourlyRate; }
    public String getContactNumber() { return contactNumber; }
    public void setContactNumber(String contactNumber) { this.contactNumber = contactNumber; }
}
