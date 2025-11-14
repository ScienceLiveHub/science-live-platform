# Science Live Platform

Transform research into connected knowledge through stackable knowledge bricks.

## 🎯 Vision

Science Live enables researchers to create FAIR (Findable, Accessible, Interoperable, Reusable) knowledge bricks from every stage of their research—from systematic reviews to data analysis—making scientific work discoverable, reusable, and properly credited while advancing Open Science practices.

## 📊 Project Status

🚧 **In Active Development** (October 2025 - June 2026)

| Phase     | Status   | Description                                  |
| --------- | -------- | -------------------------------------------- |
| ✅ Step 1 | Complete | Foundation setup (monorepo, React)           |
| ✅ Step 2 | Complete | Database integration (PostgreSQL)            |
| ✅ Step 3 | Complete | Nanopub parser and viewer with display modes |
| 🔄 Step 4 | Next     | ORCID authentication                         |
| ⏳ Step 5 | Planned  | Template processing engine                   |
| ⏳ Step 6 | Planned  | Credit system implementation                 |

**Timeline:** Beta launch planned for January 2026, Public launch June 2026.

## 🏗️ Architecture

### Architecture preferences

- Open Source
- GDPR compliant
- Modern developer experience
- Serverless and low running cost (economical scale up and down)
- Option of deployment full data-sovereignty of user and app data
- Avoid hard-dependency on proprietary micro-services
  - Self-contained auth broker (better-auth), any OIDC provider can be added
  - Plain postgres database via connection string
  - Cloudflare is the default deployment but can be hosted elsewhere easily
- Future potential for private enterprise self-hosted instance

```
┌─────────────────────────────────────────────────────────┐
│           Science Live Platform                         │
├─────────────────────────────────────────────────────────┤
│  Frontend SPA (React + TypeScript + Vite)               │
│  - Landing pages & marketing                            │
│  - User dashboard & credit system                       │
│  - Nanopub creation & display                           │
│  - Template-based forms                                 │
├─────────────────────────────────────────────────────────┤
│  Backend API (Serverless, Hono)                         │
│  - /api/auth/*       - Better Auth + ORCID OIDC         │
│  - /api/users/*      - User profiles & credits          │
│  - /api/nanopubs/*   - Create, validate, fetch          │
│  - /api/templates/*  - Template management              │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
         ┌─────────────────────────────────────────┐
         │  Deployment, Data & Infrastructure      │
         ├─────────────────────────────────────────┤
         │  Cloudflare                             │
         │  - Default deployment                   │
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

Currently the `frontend` is a static SPA, with no SSR required, and client-side routing using react-router-dom. All dynamic content and data is pulled from the `api` which includes authentication and the database connection. This keeps the UX fast and responsive, as well as being easy to deploy as serverless without edge.

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
- **If you want to deploy to Cloudflare:**
  - A [Cloudflare](https://dash.cloudflare.com) account (free tier works fine)
    - Either log into `wrangler` CLI (`npx wrangler login`), OR set your `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in both the frontend and api .env files
    - Set up a Cloudflare Hyperdrive connection to your postgres db, and take note of its its UUID.
    - Copy each of the `wrangler.jsonc.example` files under both `api/` and `frontend/` folders to `wrangler.jsonc` and enter your ENVS into them where you see `CHANGE_TO_...`.
    - Create a `frontend/.env.production` file which should specify `VITE_API_URL=` pointing to your production API url
  - Build and deploy everything from project root: `npm run build` then `npm run deploy`

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
# Option 1: Run backend using Wrangler dev
npm run dev:api
# Option 2: Run backend using Bun
npm run dev:api-bun

# Run frontend using Vite
npm run dev
```

### Frontend UI Development

We are using **shadcn**, which is a tool to pull pre-made UI component code from online repositories. This allows for a high degree of customization and transparency of the UI, while still being as quick and easy to use as opaque imported UI libraries.

The components get pulled into the [frontend/src/components](frontend/src/components/ui) directory ready for import e.g.: `import { Button } from "@/components/ui/button";`

There is a helper script to pull new components, which must be run from the frontend folder:

```
cd frontend
npm run ui:add popover
```

There are basic [official components](https://ui.shadcn.com/docs/components) you can import and customize, or more powerful third-party composites available in [other repositories](https://www.shadcn.io/components).

Note that some of the components are just composites of simpler components, and you are expected to simply copy the component code into your app yourself rather than use the command.

Styling is done via **tailwindcss**. We should minimize the amount of custom css we need to manage. The main aspects of the theme can be edited in [frontend/src/styles/index.css](frontend/src/styles/index.css).

To adjust a specific UI elements style, layout, padding etc, use [tailwindcss](https://tailwindcss.com/docs) utility classes e.g.: `className="pt-6"` to set top padding of the element to 6.

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

#### Backend

- **Hono** - API endpoints
- **Bun** - Dev server
- **Better-Auth** - Auth library and user management
- **Drizzle** - ORM
- **Wrangler** - CLI for Cloudflare Serverless Deployment

#### Database

- **PostgreSQL** - Primary database
- **Knowledge Pixels Nanopub Network** - Decentralized RDF storage

#### Default 3rd-party Infrastructure used (can be easily changed)

- **Cloudflare** - Hosting and deployment
- **Neon** - Postgres database
- **Resend** - Email API
- **ORCID** - An OIDC provider
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

## 📞 Contact

- **Email:** contact@sciencelive4all.org
- **Book a Call:** https://calendly.com/anne-fouilloux/30min
- **LinkedIn:** https://www.linkedin.com/company/sciencelive

## 🎓 Acknowledgments

Science Live is supported by the Astera Institute with planned transition to community-driven governance. Built on the nanopublication ecosystem infrastructure deployed by Knowledge Pixels.

---

**Current Version:** 0.1.0 (Development)  
**Last Updated:** November 2025
