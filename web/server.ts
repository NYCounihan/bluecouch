// web/server.ts
import express from "express";
import AdminJS from "adminjs";
import * as AdminJSExpress from "@adminjs/express";
import { Database, Resource } from "@adminjs/typeorm";
import { DataSource } from "typeorm";

// 1) Register the "typeorm" adapter so AdminJS can introspect tables
AdminJS.registerAdapter({ Database, Resource });

const app = express();

// 2) Postgres connection (simple URI, internal host 'db')
const pgUrl = process.env.DATABASE_URL_SIMPLE || "postgres://bluecouch:supersecurepassword@db:5432/bluecouch";

// Create TypeORM DataSource
const dataSource = new DataSource({
  type: "postgres",
  url: pgUrl,
  synchronize: false,
  logging: false,
});

// Admin credential (very basic login for now)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "change_me";

// 3) Create the AdminJS instance pointing to your DB
const admin = new AdminJS({
  databases: [dataSource], // TypeORM DataSource
  rootPath: "/admin",
  branding: {
    companyName: "Bluecouch Admin",
  },
  resources: [
    // TypeORM will auto-discover tables from the database
    // You can also specify specific entities if needed
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

// Initialize DataSource and start server
dataSource.initialize().then(() => {
  app.listen(3000, () => {
    console.log("Web (AdminJS) running at http://0.0.0.0:3000/admin");
  });
}).catch((error) => {
  console.error("Error initializing database:", error);
  process.exit(1);
});
