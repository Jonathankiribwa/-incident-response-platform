# ![SteelWorks Logo](public/steelworks_logo.svg)

# SteelWorks Incident Response Platform

## Overview
SteelWorks Incident Response Platform is a centralized, real-time event monitoring and response system tailored for steel manufacturing plants. It ingests data from industrial IoT sensors, MES, and security systems, analyzes and prioritizes incidents using machine learning, and automates first-response actions to reduce downtime and improve safety and compliance.

---

## Key Features
- **Industrial Data Ingestion:** Collects data from sensors (temperature, vibration, voltage), machine logs, security events, and logistics systems via MQTT, REST, or file uploads.
- **Real-Time Dashboard:** Visualizes anomalies (e.g., overheating, downtime, security alerts) and highlights critical incidents.
- **ML-Driven Prioritization:** Uses machine learning to classify and prioritize incidents (e.g., predictive maintenance, security threats).
- **Automated Response:** Sends alerts (Slack/Email), flags logs, and suggests operator checklists.
- **Collaborative Incident Management:** Engineers can tag, assign, comment, and resolve incidents, with team/shift tracking.
- **Audit & Compliance:** Logs every event and response for compliance and audit readiness.
- **Demo/Simulation Mode:** Injects sample incidents and supports multiple user roles (admin, engineer, operator).

---

## Real-World Impact
- Reduce equipment downtime by catching anomalies early
- Centralize event monitoring from all plant subsystems
- Automate alerting and reduce manual triage for operations and IT
- Improve compliance and audit readiness
- Bridge IT and OT teams with a shared platform

---

## Sample Data Types
- Sensor data (temperature, vibration, voltage)
- Machine state logs (start/stop, error codes)
- Cybersecurity logs (unauthorized access, API use)
- Inventory/logistics alerts (delays, shortages)

---

## Demo & Simulation
- Use built-in mock data generators or upload sample CSVs
- Simulate incidents like "Boiler Overheating", "Unauthorized VPN Login", "Conveyor Jam"
- Switch between user roles to see different workflows

---

## Getting Started
1. **Clone the repo and start with Docker Compose:**
   ```sh
   docker-compose up --build
   ```
2. **Access the dashboard:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
3. **Login as admin:**
   - Email: admin@example.com
   - Password: AdminPassword123!
4. **Try the simulation mode or upload your own data.**

---

## Screenshots & GIFs
> _Add screenshots and animated GIFs of the dashboard, incident flow, and alerting here._

---

## License
MIT 