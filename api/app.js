// load .env
require("dotenv").config();

// import other files
require("./eventHandlers/startingIndexBlockSet");
require("./eventHandlers/claimed");
require("./eventHandlers/editionAdded");
// express
const express = require("express");
const indexRouter = require("./routes/index");
const app = express();
const createError = require("http-errors");

// web3
const web3 = require("./resources/web3");

// mongodb
const mongo = require("mongodb").MongoClient;

// other utilities
const fs = require("fs");

// readable json
app.set("json spaces", 3);

// routes
app.use("/", indexRouter);
app.use("/claims/:address", indexRouter);
app.use("/edition/:edId/:id", indexRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.sendStatus(err.status || 500);
});

module.exports = app;
