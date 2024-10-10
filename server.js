const express = require("express");
const http = require("http");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const yargs = require("yargs");

const options = yargs
  .usage("Usage: $0 -data-path <name>")
  .option("data-path", {
    alias: "d",
    describe: "Data path",
    type: "string",
    demandOption: true,
  })
  .option("port", {
    alias: "p",
    describe: "Port number",
    type: "number",
    demandOption: false,
  })
  .option("env", {
    alias: "e",
    describe: "Environment",
    type: "string",
    demandOption: false,
  }).argv;

const CUR_PATH = path.dirname(__filename);
const ENV = options.env || "development";
const IS_ADDON = ENV === "addon";
const PUBLIC_PATH = path.join(CUR_PATH, "public");
const API_PORT = options.port || 3001;

const staticRequests = (request, response, next) => {
  const requestUrl = request.path === "/" ? "/index.html" : request.path;
  const isJsFile = requestUrl.endsWith(".js");
  const isHtmlFile = requestUrl.endsWith(".html");

  const urlToReplace = IS_ADDON
    ? String(request?.headers?.["x-ingress-path"] || "") + "/"
    : "/";

  if (isJsFile || isHtmlFile) {
    const filePath = path.join(PUBLIC_PATH, requestUrl);
    fs.readFile(filePath, "utf8", (err, data) => {
      if (err) {
        console.error("Error reading file:", err);
        return response.status(500).send("Internal Server Error");
      }
      // Modify the content of the JavaScript file as needed
      const modifiedData = data
        .replace(/\/\[\[\*\*\|DASHBOARD_BASE_URL\|\*\*]](\/)?/g, urlToReplace)
        .replace(
          /\/%5B%5B\*\*%7CDASHBOARD_BASE_URL%7C\*\*%5D%5D\//g,
          urlToReplace
        );
      // Set Content-Type header
      response.set("Content-Type", isJsFile ? "text/javascript" : "text/html");
      // Send the modified JavaScript content
      response.send(modifiedData);
    });
  } else {
    // Pass through for non-JS files
    next();
  }
};
// Create an instance of Express
const app = express()
  .use(express.json())
  .use(cors())
  .use(staticRequests)
  .use(express.static(PUBLIC_PATH));

app;
// Create an HTTP server and bind it to Express
const server = http.createServer(app);
app.get("/ping", async (_, res) => {
  res.send("Pong");
});

server.listen(API_PORT, () => {
  console.log(`Server is running on http://localhost:${API_PORT}`);
});
