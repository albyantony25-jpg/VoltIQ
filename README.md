# ⚡ VoltIQ — AI-Powered Home Energy Intelligence Platform

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Visit%20Now-amber?style=for-the-badge)](https://volt-iq-peach.vercel.app)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Groq](https://img.shields.io/badge/Groq-Llama3-orange?style=for-the-badge)](https://groq.com)

> A full-stack, hardware-free web application for monitoring, analyzing, and optimizing household energy consumption in India.

## 🌐 Live Demo

| Service | URL |
|---|---|
| Frontend | https://volt-iq-peach.vercel.app |
| Backend API | https://voltiq-production.up.railway.app |
| API Docs | https://voltiq-production.up.railway.app/docs |

## 🚀 Quick Demo
| | |
|---|---|
| **Live URL** | https://volt-iq-peach.vercel.app |
| **Demo Login** | demo@energyiq.app |
| **Demo Password** | Demo@1234 |

> No signup needed — click login, use demo credentials, explore instantly.

## 📸 Screenshots
<!-- Dashboard -->
![Dashboard Overview](dashboard.png)
*Real-time energy dashboard with live power draw, efficiency score, and bill estimate*

---

## 📌 What is VoltIQ?

VoltIQ lets Indian households monitor their electricity consumption and bills **without any hardware**. Users add their home appliances from a library of 100+ devices, and VoltIQ instantly calculates energy usage and projects the monthly electricity bill using real state-specific tariff data from 31 Indian states.

The platform is powered by **Groq API (Llama 3 70B)** for AI insights and a conversational **Volt Assistant** chatbot, allowing users to ask natural language questions about their energy usage.

---

## ✨ Features

- 🏠 **Home Setup** — Configure home type, city, occupants, floor area, and select your state electricity tariff
- 🔌 **Appliance Library** — Browse 100+ Indian household appliances across 7 categories with real wattage data
- 📊 **Real-Time Dashboard** — View total kWh, projected bill, live power meter gauge, and hourly usage chart
- 🧾 **India Billing Engine** — Slab-based tariff calculation for 31 Indian states including fixed charges, fuel surcharge, and electricity duty
- 🤖 **AI Insights** — Groq API (Llama 3 70B) powered personalized energy optimization recommendations
- 💬 **Volt Assistant** — Conversational chatbot for natural language energy queries
- 📄 **PDF Reports** — Download comprehensive monthly energy reports with appliance-level cost breakdown
- ⚡ **Efficiency Score** — Home energy efficiency rating with improvement suggestions
- 🔔 **Alerts** — Notifications for unusual energy consumption patterns
- 🖥️ **Digital Twin** — Simulated energy dashboard with live widgets

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| Next.js 14 (App Router) | Framework |
| Tailwind CSS | Styling |
| ShadCN UI | Component library |
| Recharts | Charts and graphs |
| TypeScript | Type safety |

### Backend
| Technology | Purpose |
|---|---|
| FastAPI | REST API framework |
| Python 3.13 | Language |
| asyncpg | Async PostgreSQL driver |
| uvicorn | ASGI server |
| httpx | HTTP client |
| slowapi | Rate limiting |

### Infrastructure
| Technology | Purpose |
|---|---|
| PostgreSQL (Render) | Primary database |
| Supabase Auth | JWT authentication |
| Groq API, Llama 3 70B (free tier) | AI insights + chatbot |
| Vercel | Frontend deployment |
| Render | Backend + DB deployment |

---

## 🐛 Notable Bugs Debugged

These two bugs are documented as proof of genuine engineering understanding:

**Bug 1 — Rate Limiter Singleton Violation**
The SlowAPI rate limiter instance was being recreated on every request 
instead of being shared as a singleton across the app. This caused silent 
HTTP 500 errors on the PDF report endpoint that were extremely difficult 
to trace since no explicit error was thrown. Fixed by moving the limiter 
instantiation to module level.

**Bug 2 — Schema/Query Column Name Mismatch**
A `KeyError` was thrown at runtime because the column was named 
`fixed_charge_inr` in the database schema but referenced as `fixed_charge` 
in both the raw SQL query and the billing calculation engine. Fixed by 
standardising the column name across all three layers.

---

## 🗄️ Database Schema
```sql
users          -- User profiles
homes          -- Home configurations with tariff selection
appliances     -- User-added appliances with usage data
tariffs        -- 31 Indian state tariff configs (JSONB slabs)
alerts         -- Energy consumption alerts
chat_sessions  -- Volt Assistant conversation history
```

---

## ⚡ Energy Calculation Formula
```python
load_factors = {
    "hvac": 0.65, "kitchen": 0.90, "entertainment": 0.70,
    "lighting": 1.0, "laundry": 0.85, "ev": 0.90, "other": 0.85
}

age_penalty    = 1 + (age_years * 0.02)
daily_kwh      = (rated_watts * load_factor * usage_hours * age_penalty) / 1000
monthly_kwh    = daily_kwh * 30
```

---

## 🚀 Local Development

### Prerequisites
- Node.js 18+
- Python 3.13
- PostgreSQL
- Supabase account
- Groq API key

### Backend Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Fill in your credentials

python -m uvicorn main:app --reload --port 8000
```

### Frontend Setup
```bash
cd frontend
npm install

# Create .env.local file
cp .env.example .env.local
# Fill in your credentials

npm run dev
```

---

## 🔐 Environment Variables

### Backend (`backend/.env`)
```env
DATABASE_URL=postgresql://user:password@host:port/dbname
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
GROQ_API_KEY=gsk_...
OPENAI_MODEL=llama-3.3-70b-versatile
JWT_SECRET=your-jwt-secret
ALLOWED_ORIGINS=http://localhost:3000
```

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## 📁 Project Structure
```
VoltIQ/
├── frontend/                  # Next.js 14 app
│   ├── app/
│   │   ├── (auth)/            # Login, signup pages
│   │   ├── (dashboard)/       # Protected dashboard pages
│   │   │   ├── overview/      # Main dashboard
│   │   │   ├── appliances/    # Appliance management
│   │   │   ├── billing/       # Bill breakdown
│   │   │   ├── insights/      # AI insights
│   │   │   ├── chat/          # Volt Assistant
│   │   │   └── reports/       # PDF reports
│   │   └── setup/             # Home setup wizard
│   └── components/            # Shared UI components
│
└── backend/                   # FastAPI app
    ├── routers/               # API route handlers
    │   ├── homes.py
    │   ├── appliances.py
    │   ├── billing.py
    │   ├── insights.py
    │   ├── chat.py
    │   ├── reports.py
    │   └── alerts.py
    ├── services/              # Business logic
    │   ├── modeling_engine.py # Energy calculation
    │   └── billing_engine.py  # Tariff calculation
    ├── data/
    │   ├── appliance_library.json   # 100+ appliances
    │   └── tariffs_seed.json        # 31 state tariffs
    └── core/
        ├── config.py
        ├── database.py
        └── dependencies.py
```

---

## 🇮🇳 Supported Indian State Tariffs

VoltIQ includes slab tariff configurations for all 31 Indian states including Kerala (KSEB), Maharashtra (MSEDCL), Karnataka (BESCOM), Tamil Nadu (TANGEDCO), Delhi (BSES/TPDDL), and 26 more.

---

## 👤 Author

Built by **Alby A Jose** ([@albyantony25-jpg](https://github.com/albyantony25-jpg))

---


## 📄 License

This project was developed as a mini project for the APJ Abdul Kalam Technological University, B.Tech Computer Science and Engineering, 2026.

---
