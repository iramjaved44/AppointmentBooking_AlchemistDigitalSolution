CareNest – Smart Appointment & Consultation Booking Platform
A modern, responsive frontend for a clinic where patients can browse services, find a specialist, book an appointment, and manage their bookings. Built with React.js (Vite), plain ES6 JavaScript and inline CSS, using structured mock JSON data and `localStorage` (no backend).
Features
Core
Navigation bar, hero section with a primary Book Appointment CTA.
Services grid showing title, category, duration and fee, with category filter.
Specialist directory with name, specialty, experience, rating and available days, plus search and category filtering.
Interactive booking modal: choose service, specialist, date and time slot (Available vs Booked slots are visibly different), then enter name, phone, email and notes. Service and specialist always stay matched.
My Bookings dashboard: table with status badges (Pending, Confirmed, Completed, Cancelled), summary cards, status filters and a Cancel Appointment action with a confirmation pop-up.
Mobile-first responsive layout for mobile, tablet and desktop.
Bonus
Reschedule Appointment modal to change the date and time slot of an existing booking.
Booking Confirmation Slip shown right after booking (and from the Slip button in My Bookings), with a Print Slip button.
Tech Stack
React.js (Vite)
JavaScript (ES6), HTML5, CSS3 (inline styles + one responsive/print `<style>` block)
Mock JSON data + `localStorage` for persistence
Folder Structure
```
project-root/
├── public/
├── src/
│   ├── data/
│   │   ├── services.json       # services (title, category, duration, fee)
│   │   ├── specialists.json    # specialists (specialty, experience, rating, days)
│   │   └── bookings.json       # seed bookings
│   ├── App.jsx                 # whole UI (all sections and modals)
│   ├── App.css
│   ├── index.css
│   └── main.jsx
├── index.html
├── package.json
└── README.md
```
Mock Data Schemas
Booking (`src/data/bookings.json`)
Field	Example	Notes
`id`	`"BK-1004"`	unique booking id
`serviceId`	`1`	refers to `services.json`
`specialistId`	`1`	refers to `specialists.json`
`date`	`"2026-11-19"`	`YYYY-MM-DD`
`timeSlot`	`"10:00 AM"`	one of the 8 daily slots
`status`	`"Confirmed"`	Pending, Confirmed, Completed or Cancelled
Each booking also stores display fields (`service`, `price`, `duration`, `specialist`, `specialistRole`) and, for new bookings, the client's `name`, `phone`, `email` and `notes`.
Service: `id, name, category, icon, desc, duration, price`
Specialist: `id, name, initials, specialty, category, desc, exp, rating, reviews, days`
Component Architecture
The UI is built in a single `App` component (`src/App.jsx`) made of these sections:
Section	Purpose
Navbar	Links to sections, live count of upcoming bookings, Book Appointment button
Hero	Primary CTA and highlights
Services	Services grid with category filter
Specialists	Search box, category filter, specialist cards
My Bookings	Summary cards, status filters, bookings table with actions
Booking Modal	Service, specialist, date, slot picker, client details
Reschedule Modal	Pick a new date and time slot for an existing booking
Cancel Modal	Confirmation before cancelling
Confirmation Slip	Printable booking summary
Footer	Contact info, newsletter, WhatsApp chat link
State is handled with React `useState`. Bookings are saved to `localStorage` (key `carenest_bookings_v3`) so they survive a page refresh.
Slot availability is calculated per specialist and per date: slots already taken by an active (non-cancelled) booking, plus the clinic's fixed booked slots, are shown as Booked and cannot be selected.
Setup
```bash
# 1. install dependencies
npm install

# 2. start the dev server
npm run dev

# 3. build for production
npm run build
```
Open the local URL shown in the terminal (usually `http://localhost:5173`).
To reset the demo data, clear the site's `localStorage` in the browser.
Notes
No backend is used; all data is mock data kept in the browser.
Printing the slip uses the browser print dialog (you can also choose "Save as PDF").