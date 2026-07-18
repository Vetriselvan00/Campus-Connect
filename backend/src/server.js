const fs = require("fs");
const path = require("path");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const express = require("express");
const { connectDatabase } = require("./config/db");
const { env } = require("./config/env");
const apiRoutes = require("./routes");

const app = express();
const frontendRoot = path.resolve(__dirname, "../../frontend");
const pagesRoot = path.join(frontendRoot, "pages");
const assetsRoot = path.join(frontendRoot, "assets");
const uploadsRoot = path.resolve(__dirname, "../uploads");

app.use(
  cors({
    origin: true,
    credentials: true
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/assets", express.static(assetsRoot));
app.use("/uploads", express.static(uploadsRoot));
app.use("/api", apiRoutes);

function injectAssets(html, pageName) {
  const withoutInlineTailwindConfig = html.replace(
    /<script>\s*tailwind\.config\s*=\s*\{[\s\S]*?<\/script>/i,
    ""
  );

  const withBodyPage = withoutInlineTailwindConfig.replace(
    /<body([^>]*)>/i,
    `<body$1 data-page="${pageName}">`
  );

  const headInjection = [
    '<link rel="preconnect" href="https://fonts.googleapis.com">',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    '<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">',
    '<link rel="stylesheet" href="/assets/css/app.css">',
    '<script src="/assets/js/common/tailwind.js"></script>'
  ].join("");

  const bodyInjection = [
    '<script defer src="/assets/js/common/config.js"></script>',
    '<script defer src="/assets/js/common/api.js"></script>',
    '<script defer src="/assets/js/common/auth.js"></script>',
    '<script defer src="/assets/js/common/page.js"></script>',
    `<script defer src="/assets/js/pages/${pageName}.js"></script>`
  ].join("");

  return withBodyPage.replace("</head>", `${headInjection}</head>`).replace("</body>", `${bodyInjection}</body>`);
}

function sendPage(res, pageName) {
  const target = path.join(pagesRoot, `${pageName}.html`);
  if (!fs.existsSync(target)) {
    res.status(404).send("Page not found");
    return;
  }

  const html = fs.readFileSync(target, "utf8");
  res.send(injectAssets(html, pageName));
}

app.get("/", (_req, res) => sendPage(res, "index"));
app.get("/:page.html", (req, res, next) => {
  if (req.params.page.startsWith("api")) {
    next();
    return;
  }

  sendPage(res, req.params.page);
});
app.get("/pages/:page.html", (req, res) => sendPage(res, req.params.page));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({
    message: err.message || "Unexpected server error."
  });
});

async function start() {
  const dbState = await connectDatabase();
  app.locals.dbState = dbState;

  app.listen(env.port, () => {
    console.log(`Campus Connect server running on http://localhost:${env.port}`);
    console.log(`Data mode: ${dbState.mode}`);
  });
}

start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
