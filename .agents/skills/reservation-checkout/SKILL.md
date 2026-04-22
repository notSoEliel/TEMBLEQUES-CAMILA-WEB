---
name: reservation-checkout
description: Implement the complete reservation and checkout flow for the Tembleques Camila platform. Use this skill when asked to build or update the booking process, availability calendar, terms acceptance, or Stripe integration.
license: Complete terms in LICENSE.txt
---

# Reservation & Checkout Implementation

This skill guides the implementation of the core business flow: the reservation and checkout process.

## 1. Flow Sequence (Strict Enforcement)

The user must progress through these stages in order:
1. **Product Selection**: View product details, size, and category.
2. **Date Selection**: Pick `start_date` and `end_date` using a calendar component.
3. **Availability Validation**: Backend MUST confirm dates are available before proceeding.
4. **Terms & Conditions**: The user MUST check the required terms acceptance box.
5. **Stripe Checkout**: Redirect to Stripe or use embedded Stripe elements for payment.
6. **Confirmation**: Return to success page and update database status.

## 2. Terms & Conditions (Critical)

- Implement a mandatory checkbox for the terms.
- The UI MUST block the progression to Stripe if the box is not checked.
- Capture metadata: When the user accepts, prepare to send `ip_address` and `user_agent` to the backend along with the timestamp to save in the `TermsAcceptance` collection.

## 3. Avoid Double Bookings

- Frontend validation is not enough. The backend endpoint that generates the Stripe session MUST perform a real-time MongoDB query to ensure the product has not been booked for those dates by another concurrent user.
- Use MongoDB transactions if necessary to lock the product availability while the session is generated.

## 4. UI/UX Expectations

- Keep the flow under 3 minutes.
- Use a clear, minimal calendar.
- Show the total price breakdown clearly (Rental price x days + fees if any) before the terms checkbox.
