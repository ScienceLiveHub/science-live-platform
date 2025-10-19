# Science Live Platform

Transform research into connected knowledge through stackable knowledge bricks.

## 🎯 Vision

Science Live enables researchers to create FAIR (Findable, Accessible, Interoperable, Reusable) knowledge bricks from every stage of their research—from systematic reviews to data analysis—making scientific work discoverable, reusable, and properly credited while advancing Open Science practices.

## 📊 Project Status

🚧 **In Active Development** (October 2025 - June 2026)

| Phase | Status | Description |
|-------|--------|-------------|
| ✅ Step 1 | Complete | Foundation setup (monorepo, Vercel, React) |
| ✅ Step 2 | Complete | Database integration (Supabase, PostgreSQL) |
| 🔄 Step 3 | In Progress | Nanopub viewer component |
| ⏳ Step 4 | Planned | Credit system implementation |
| ⏳ Step 5 | Planned | ORCID authentication |
| ⏳ Step 6 | Planned | Template processing engine |

**Timeline:** Beta launch planned for January 2026, Public launch June 2026.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│           Science Live Platform (Vercel)                │
├─────────────────────────────────────────────────────────┤
│  Frontend (React + TypeScript + Vite)                   │
│  - Landing pages & marketing                            │
│  - User dashboard & credit system                       │
│  - Nanopub creation & display                           │
│  - Template-based forms                                 │
├─────────────────────────────────────────────────────────┤
│  Backend API (Python FastAPI - Serverless)              │
│  - /api/v1/auth/*       - ORCID OAuth2                  │
│  - /api/v1/users/*      - User profiles & credits       │
│  - /api/v1/nanopubs/*   - Create, validate, fetch       │
│  - /api/v1/templates/*  - Template management           │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
         ┌─────────────────────────────────────────┐
         │  Data & Infrastructure                  │
         ├─────────────────────────────────────────┤
         │  PostgreSQL (Supabase)                  │
         │  - Users, credits, transactions         │
         │  - Organizations, travel grants         │
         ├─────────────────────────────────────────┤
         │  Knowledge Pixels Nanopub Network       │
         │  - Decentralized RDF storage            │
         │  - SPARQL query endpoints               │
         └─────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js v18 or higher
- npm (comes with Node.js)
- Git
- A [Supabase](https://supabase.com) account (free tier)
- A [Vercel](https://vercel.com) account (free tier)

### Installation

```bash
# Clone repository
git clone https://github.com/YOUR-USERNAME/science-live-platform.git
cd science-live-platform

# Install root dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..

# Install API dependencies
cd api
npm install
cd ..

# Install Vercel CLI globally (if not already installed)
npm install -g vercel
```

### Configuration

1. **Copy environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Create Supabase project:**
   - Go to https://supabase.com
   - Create new project: `science-live-platform`
   - Region: Europe (Frankfurt) for GDPR compliance
   - Copy your credentials from Settings → API

3. **Update `.env` with your credentials:**
   ```bash
   # Edit .env and add your Supabase URL and keys
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_KEY=your_service_key
   ```

4. **Set up database:**
   - Go to Supabase SQL Editor
   - Run the schema from `database/migrations/001_initial_schema.sql`
   - Or see [SETUP.md](SETUP.md) for complete SQL

### Development

```bash
# Start development server
vercel dev

# Answer setup questions:
# - Set up and develop? YES
# - Which scope? (your account)
# - Link to existing project? NO
# - Project name: science-live-platform

# Server will start on http://localhost:3000
```

Visit http://localhost:3000 to see the application.

## 📁 Project Structure

```
science-live-platform/
├── README.md               # This file
├── SETUP.md               # Detailed setup instructions
├── .env.example           # Environment variables template
├── .env                   # Your local environment (DO NOT COMMIT)
├── .gitignore            # Git ignore rules
├── vercel.json           # Vercel deployment configuration
├── package.json          # Root dependencies
│
├── frontend/             # React frontend application
│   ├── src/
│   │   ├── components/   # Reusable React components
│   │   │   └── DatabaseTest.tsx
│   │   ├── pages/        # Page components
│   │   │   └── HomePage.tsx
│   │   ├── lib/          # Utilities and libraries
│   │   │   └── supabase.ts
│   │   ├── styles/       # CSS styles
│   │   │   └── index.css
│   │   ├── App.tsx       # Main app component
│   │   └── main.tsx      # Entry point
│   ├── public/           # Static assets
│   ├── index.html        # HTML template
│   ├── package.json      # Frontend dependencies
│   ├── vite.config.ts    # Vite configuration
│   └── tsconfig.json     # TypeScript configuration
│
├── api/                  # Backend API functions (serverless)
│   ├── package.json      # API dependencies
│   └── v1/               # API version 1
│       ├── health.ts     # Health check endpoint
│       └── users/
│           └── test.ts   # Database test endpoint
│
└── database/
    └── migrations/       # Database schema migrations
```

## 🧪 Testing

### Test Frontend
```bash
# Should show the homepage
open http://localhost:3000
```

### Test API Endpoints
```bash
# Health check
curl http://localhost:3000/api/v1/health

# Database connection
curl http://localhost:3000/api/v1/users/test
```

### Run Tests (coming soon)
```bash
npm test
```

## 🛠️ Technology Stack

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **Supabase Client** - Database client

### Backend
- **Vercel Serverless Functions** - API endpoints
- **TypeScript** - Type safety
- **Node.js** - Runtime

### Database
- **Supabase** (PostgreSQL) - Primary database
- **Knowledge Pixels Nanopub Network** - Decentralized RDF storage

### Infrastructure
- **Vercel** - Hosting and deployment
- **GitHub** - Version control

## 📚 Documentation

- [SETUP.md](SETUP.md) - Complete setup guide with troubleshooting
- [Technical Specifications](docs/technical-specs.pdf) - Detailed technical documentation
- [API Documentation](docs/api.md) - API endpoint reference (coming soon)

## 🤝 Contributing

This project is currently in active development. Contribution guidelines will be added once the beta phase begins (January 2026).

### Development Team
- **Project Lead:** Anne Fouilloux (VitenHub AS)
- **Technical Architecture:** Knowledge Pixels + Prophet Town
- **Semantic Consulting:** Barbara Magagna (Mabablue)
- **Funding:** Astera Institute

## 🔒 Security

- **Environment Variables:** Never commit `.env` files. Use `.env.example` as template.
- **API Keys:** Keep Supabase service role keys secret. Only use anon keys in frontend.
- **GDPR Compliance:** Data stored in EU region (Frankfurt).

## 📜 License

[License information to be added]

## 🔗 Links

- **Website:** https://sciencelive4all.org
- **Documentation:** https://docs.sciencelive4all.org (coming soon)
- **Supabase Dashboard:** https://supabase.com/dashboard
- **Vercel Dashboard:** https://vercel.com/dashboard

## 📞 Contact

- **Email:** contact@sciencelive4all.org
- **Book a Call:** https://calendly.com/anne-fouilloux/30min
- **LinkedIn:** https://www.linkedin.com/company/sciencelive

## 🎓 Acknowledgments

Science Live is supported by the Astera Institute with planned transition to community-driven governance. Built on the nanopublication ecosystem infrastructure deployed by Knowledge Pixels.

---

**Current Version:** 0.1.0 (Development)  
**Last Updated:** October 2025
