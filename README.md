# Nivaro

Nivaro is an on-demand, mobile-first platform that directly connects users with a network of verified, professional service providers. It operates on the same principle as Uber: instant, reliable matching of demand (a user needing a repair) with supply (a qualified professional).

Instead of booking a ride, a user opens the Nivaro app to find and book local carpenters, plumbers, electricians, and other home service professionals.

The "Uber-like" experience works like this:

- Select a Service: The user chooses a specific, pre-defined job from a clear catalog (e.g., "Fix Leaky Faucet," "Install Ceiling Fan," "Replace Light Switch").
- Book On-Demand or Schedule: The user can select "Book Now" to get the next available provider dispatched to their location for urgent needs, or "Schedule for Later" to set a specific time that fits their calendar.
- Upfront Pricing: Following Uber's model of transparency, Nivaro provides a standardized, fixed price for the service before the user confirms the booking. This eliminates the guesswork and back-and-forth haggling.
- Instant Matching: The platform's algorithm finds the best-matched (nearby, highly-rated, and available) provider and assigns them the job.
- Track Your Pro: The user can track the provider's arrival in real-time on a map, just like tracking an approaching Uber.
- Seamless Payment & Rating: After the job is completed, payment is handled securely and automatically through the app. Both the customer and the provider can then rate each other, building a foundation of trust and quality for the entire community.
Services
- Frontend (React + Vite)
- API Gateway (Express proxy + JWT verification)
- User Service (Express, JWT auth, PostgreSQL users_db)
- Booking Service (Express, bookings logic, PostgreSQL bookings_db)
- Notification Service (Express, email dispatch stub)

Development
- Docker Compose spins up all services and databases on a shared network.
- Each service is isolated with its own Dockerfile and environment variables.

Next steps
- docker-compose up --build (after filling in any required env variables)
- Extend database schemas and real email provider as needed.
