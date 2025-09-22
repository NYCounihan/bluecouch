// web/server.ts
import express from "express";
import AdminJS from "adminjs";
import * as AdminJSExpress from "@adminjs/express";
import { Database, Resource } from "@adminjs/sql";
import { Client } from "pg";

// 1) Register the "sql" adapter so AdminJS can introspect tables
AdminJS.registerAdapter({ Database, Resource });

const app = express();

// 2) Postgres connection (simple URI, internal host 'db')
const pgUrl = process.env.DATABASE_URL_SIMPLE || "postgres://bluecouch:supersecurepassword@db:5432/bluecouch";
const client = new Client({ connectionString: pgUrl });

// Admin credential (very basic login for now)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "change_me";

// 3) Create the AdminJS instance pointing to your DB
const admin = new AdminJS({
  databases: [], // not used by sql adapter
  rootPath: "/admin",
  branding: {
    companyName: "Bluecouch Admin",
  },
  resources: [
    // With @adminjs/sql, you can let it auto-discover tables
    // or specify included tables explicitly:
    { resource: { model: "items", client }, options: { navigation: "App" } },
    // Add more tables as needed, e.g. users, orders, etc.
  ],
});

// 4) Auth middleware (basic email/password)
const router = AdminJSExpress.buildAuthenticatedRouter(
  admin,
  {
    authenticate: async (email, password) => {
      if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        return { email };
      }
      return null;
    },
    cookiePassword: "use-a-long-random-string-here",
  },
  null,
  {
    resave: false,
    saveUninitialized: true,
  }
);

app.use(admin.options.rootPath, router);

// 5) Healthcheck
app.get("/healthz", (_req, res) => res.json({ ok: true }));

app.listen(3000, () => {
  console.log("Web (AdminJS) running at http://0.0.0.0:3000/admin");
});
