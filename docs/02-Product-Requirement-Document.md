Document Name : Product Requirement Document
Version       : 1.0
Author        : Souradeep Misra
Reviewer      : ChatGPT (Technical Architect)
Status        : Draft
Created Date  : 30 June 2026
Last Updated  : 30 June 2026

# AI-Powered Enterprise Doctor Appointment Platform

## Module

- Patient
- Doctor
- Admin

## Patient

The patient should be able to:

- Register
  - To register, need name, email address, phone number, password, re-enter password
- Login
  - Using mobile number or email address and OTP or password
- Search doctors
  - Can search doctor by entering doctor name
- Filter by specialization
  - Search doctor by filter
- View doctor profile
  - Doctor name, degree, specialization, experience, visit
- View available slots
  - Only for a month
- Book appointment
  - For booking a minimum amount is required. Booking information should display on the user profile section
- Cancel appointment
  - Cancel appointment only before 48 hours. After 48 hours no refund will get.
- Reschedule appointment
  - Reschedule based on slot availability
- View booking history
  - In user profile section
- Chat with AI
  - Based on patient symptom guide

## Doctor

Doctor should be able to:

- Login
  - Only provided userID and password by admin
- Create Dashboard
  - Add information, registration number, degree, specialization, experience
- View dashboard
  - Can view his details
- View appointments
  - Can view his appointment details in next one month like each day how many patient bookings
- Block holidays
  - Can block any calendar day for next month that is not open for patient and if any day already open to patient needs to ask admin to block that day
- Set available slots
  - Set available slots can be multiple in a day and maximum number of patients can book
- Add clinic notifications
- For the first time doctor can set slot, add holiday, block day for the current month after all profile setup and click on activate. After that doctor can edit next month information and for current month changes he needs to ask Admin.

## Admin

Admin should be able to:

- Add doctor
  - Add doctor and add his profile information like name, registration number, specialization, experience, visit
- Generate unique Id and password for doctor
- Remove doctor
- View users
  - View all patient and doctor information
- Manage appointments
  - Manage any appointment on emergency request from doctor; can delete any existing appointment slot or complete day and send user message notification
- Generate reports
