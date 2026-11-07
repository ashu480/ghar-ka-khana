# Ghar Ka Khana — starter full-stack project

A starter marketplace for homemade food. It includes:
- Customer, home-chef and delivery-partner registration/login
- Public food listing
- Chef food listing creation
- Customer order placement
- Delivery partner order view and status updates
- MongoDB + Express API and React/Vite frontend

## Requirements
Install Node.js (LTS) and have a MongoDB database (local MongoDB or MongoDB Atlas).

## 1. Start the backend
```bash
cd server
cp .env.example .env
# Edit .env and add your MongoDB connection string and a long JWT secret
npm install
npm run dev
```
Backend runs at http://localhost:5000

## 2. Start the frontend (new terminal)
```bash
cd client
npm install
npm run dev
```
Open the local URL printed by Vite (usually http://localhost:5173).

## Demo flow
1. Register a user with role `chef`.
2. Log in as that chef and add food from the Chef Dashboard.
3. Register another user as `customer`, log in, and place an order.
4. Register a third user as `delivery`, log in, and update the order status.

## Important before real launch
This is an educational MVP, not production-ready. Before accepting real orders/payments:
- Add proper input validation, rate limiting, email/phone verification, password reset and secure deployment settings.
- Add seller identity checks, applicable FSSAI registration/licensing and food-safety processes.
- Add delivery assignment, real maps/location tracking, payment gateway integration, refunds and customer support.
- Review privacy, consumer-protection, tax and local legal requirements.
- Never commit your real `.env` file or share database/JWT credentials.
