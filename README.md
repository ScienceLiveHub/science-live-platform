# Science Live Platform

Transform research into connected knowledge through stackable knowledge bricks.

## 🎯 Vision

Science Live enables researchers to create FAIR (Findable, Accessible, Interoperable, Reusable) knowledge bricks from every stage of their research—from systematic reviews to data analysis—making scientific work discoverable, reusable, and properly credited while advancing Open Science practices.

## 📊 Project Status

🚧 **In Active Development** (October 2025 - June 2026)

| Phase     | Status   | Description                                  |
| --------- | -------- | -------------------------------------------- |
| ✅ Step 1 | Complete | Foundation setup (monorepo, Vercel, React)   |
| ✅ Step 2 | Complete | Database integration (PostgreSQL)            |
| ✅ Step 3 | Complete | Nanopub parser and viewer with display modes |
| 🔄 Step 4 | Next     | Credit system implementation                 |
| ⏳ Step 5 | Planned  | ORCID authentication                         |
| ⏳ Step 6 | Planned  | Template processing engine                   |

**Timeline:** Beta launch planned for January 2026, Public launch June 2026.

## 🏗️ Architecture

### Architecture preferences

- Open Source
- GDPR compliant
- Modern developer experience
- Serverless and low running cost (economical scale up and down)
- Avoid hard-dependency on proprietary micro-services
  - Self-contained auth broker (better-auth), any OIDC provider can be added
  - Plain postgres database via connection string
  - Vercel is default deployement but can be hosted elsewhere easily
- Future potential for private enterprise self-hosted instance

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
│  Backend API (Serverless)                               │
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
         │  PostgreSQL                             │
         │  - Users, credits, transactions         │
         │  - Organizations, travel grants         │
         ├─────────────────────────────────────────┤
         │  Knowledge Pixels Nanopub Network       │
         │  - Decentralized RDF storage            │
         │  - SPARQL query endpoints               │
         └─────────────────────────────────────────┘
```

## 🚀 Developer Quick Start

### Prerequisites

- Git
- A Postgres database and connection string
- **If using the recommended devcontainer:**
  - vscode (or other IDE that supports devcontainer)
  - Docker
- **If NOT using the recommended devcontainer** (which has everything built in), you need to manually install:
  - Node.js v22 or higher
  - npm (comes with Node.js)
- **If you want to deploy to Vercel:**
  - A [Vercel](https://vercel.com) account (free tier)
  - Log into `vercel` CLI

### First-time Setup

1. **Clone repository**

   ```bash
   git clone https://github.com/ScienceLiveHub/science-live-platform.git
   cd science-live-platform
   ```

2. **Copy environment templates:**

   ```bash
   cp frontend/.env.example frontend/.env
   cp api/.env.example api/.env
   ```

3. **Update both `.env` with your settings and credentials**

   Mainly, the variables marked REQUIRED must be changed.

### Development - using devcontainer (_RECOMMENDED_)

Simply build and start the [devcontainer](https://code.visualstudio.com/docs/devcontainers/containers) by clicking the blue icon in the bottom-left-most corner of the vscode window. Wait for the container to build for the first time and start running.

If you are starting with a blank database, run initial [database migrations](#database-migrations)

The running container will automatically close when you exit vscode.

### Development - using manual setup

_Note: You dont need to do any of this if you are using the devcontainer mentioned above_

```bash
# Install all dependencies
npm install

# If deploying to vercel, install Vercel CLI globally if required
npm install -g vercel
```

If you are starting with a blank database, run initial [database migrations](#database-migrations)

### Database migrations

You will need to run this initially on a blank database to set up the schema:

```bash
npm -w api run db:migrate
```

Then if you change the databse [schema](./api/src/db/schema), you will need to generate the new migration and apply it to the db:

```bash
npm -w api run db:generate
npm -w api run db:migrate
```

### Running the app for local development:

#### Using vscode Run Task

1. You can hit `Ctrl + Shift + P`
2. Type "Run Task", `Enter`
3. Select the `runDevelopment` task to start the frontend Vite server and backend Bun server.

Alternatively use the `npm run dev` and `npm run dev:api` commands.

Visit http://localhost:3000 to see the application.

#### Using terminal

```bash
# Option 1: Run backend using Bun (doesn't require Vercel account)
npm run dev:api
# Option 2: Run backend using Vercel (will need to log in using a Vercel account)
npm run dev:api-vc

# Run frontend using Vite
npm run dev
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
curl http://localhost:3001/api/health
```

## 🛠️ Technology Stack

#### Both Frontend and Backend

- **Node.js 22** - Runtime
- **TypeScript** - Type safety

#### Frontend

- **React 19** - UI library
- **React Router** - Client-side routing
- **Vite** - Build tool and Dev server
  TODO: Suggested additions: add @daveyplate/better-auth-ui for easy auth components, TailwindCSS, shadcn/ui, Sonner (toast) for simpler UI styling

#### Backend

- **Hono** - API endpoints
- **Bun** - Dev server
- **Vercel Serverless Functions** - Target Deployment
- **Better-Auth** - Auth library and user management
- **Drizzle** - ORM

#### Database

- **PostgreSQL** - Primary database
- **Knowledge Pixels Nanopub Network** - Decentralized RDF storage

#### Default Infrastructure (can be easily changed)

- **Vercel** - Default hosting and deployment
- **Neon** - Default postgres database
- **GitHub** - Version control

## 🤝 Contributing

This project is currently in active development. Contribution guidelines will be added once the beta phase begins (January 2026).

### Development Team

- **Project Lead:** Anne Fouilloux (VitenHub AS)
- **Technical Architecture:** Knowledge Pixels + Prophet Town
- **Semantic Consulting:** Barbara Magagna (Mabablue)
- **Funding:** Astera Institute

## 🔒 Security

- **Environment Variables:** Never commit `.env` files. Use `.env.example` as template.
- **API Keys:** Keep backend keys secret. Only use anon keys in frontend.
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
**Last Updated:** November 2025
