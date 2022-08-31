const express = require("express");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
// const hpp = require('hpp');
const cookieParser = require("cookie-parser");
const compression = require("compression");
const cors = require("cors");
const Imap = require("imap");
const fs = require("fs");

const http = require("http");
const url = require("url");
const emailRouter = require("./routes/emailRoute");
require("dotenv").config();
const cluster = require("cluster");
const numCPUs = require("os").cpus().length;
const path = require("path");
const bodyParser = require("body-parser");
const app = express();

const isDev = process.env.NODE_ENV !== "production";
const PORT = process.env.PORT || 5000;

/////////////////////////////

app.enable("trust proxy");

// Implement CORS
app.use(cors());
app.options("*", cors());

// Set security HTTP headers
app.use(helmet());

// Development logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: "Too many requests from this IP, please try again in an hour!",
});
app.use("/api", limiter);

// Body parser, reading data from body into req.body
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

app.use(compression());

const ads = [{ title: "Hello, world (again)!" }];

// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.cookies);
  next();
});

// Routes
app.use("/api/v1/emails", emailRouter);

app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// app.use(globalErrorHandler);

module.exports = app;

/////////////////////

const {
  parseBODYSTRUCTURE,
} = require("emailjs-imap-client/dist/command-parser");

console.log(parseBODYSTRUCTURE);

require("dotenv").config();

inspect = require("util").inspect;
fileStream = require("util").inspect;

//////////////////////////

// Multi-process to utilize all CPU cores.
if (!isDev && cluster.isMaster) {
  console.error(`Node cluster master ${process.pid} is running`);

  // Fork workers.
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code, signal) => {
    console.error(
      `Node cluster worker ${worker.process.pid} exited: code ${code}, signal ${signal}`
    );
  });
} else {
  const app = express();

  // apply rate limiter to all requests
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minute
    max: 100, // limit to 100 requests per windowMs
  });
  app.use(apiLimiter);

  // Set app to use proper methods to parse our data
  // parse application/json
  app.use(bodyParser.json());
  // parse application/x-www-form-urlencoded
  app.use(bodyParser.urlencoded({ extended: true }));

  // Priority serve any static files.
  // Replace the example to connect to your frontend.
  // Priority serve any static files.
  app.use("/", express.static(path.resolve(__dirname, "./frontend/build")));

  // Answer API requests.
  // const mailrouter = require("./routes/mailrouter");
  // app.use("/routes", mailrouter);

  // All remaining requests return the frontend app, so it can handle routing.
  // app.get("*", (req, res) => {
  //   res.sendFile(path.resolve(__dirname, "./frontend/build", "index.html"));
  // });

  app.get("/api", (req, res) => {
    res.json({ message: "Hello from server!" });
  });

  app.listen(PORT, () => {
    console.log(
      `Node ${
        isDev ? "dev server" : `cluster worker ${process.pid}`
      }: listening on port ${PORT}`
    );
  });

  process.on("SIGTERM", () => {
    server.close(() => {
      console.log("Process terminated");
    });
  });
}
