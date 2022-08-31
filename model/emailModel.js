const mongoose = require("mongoose");
// const Imap = require("imap");
// const fs = require("fs");
const http = require("http");

const emailSchema = new mongoose.Schema({
  email: {
    type: String,
    // required: [true, 'Please provide email name!']
  },
  date: {},
  ////////////////
});
const myMail = "erisoyemi@gmail.com";
const myPwd = "oqufwcbqkgmajzvr";
// const myPwd = process.env.PWD;

// let mailServer = new Imap({
//   user: myMail,
//   password: myPwd,
//   host: "imap.gmail.com",
//   port: 993,
//   tls: true,
//   tlsOptions: {
//     rejectUnauthorized: false,
//   },
//   authTimeout: 3000,
// }).once("error", function (err) {
//   console.log("Source Server Error:- ", err);
// });

// const server = http.createServer((req, res) => {
//   console.log(req.url);
//   res.end("mailServer");
// });

// server.listen(5000, "127.0.0.1", () => {
//   console.log("listening to req now");
// });

// function openInbox(cb) {
//   mailServer.openBox("INBOX", true, cb);
// }

// mailServer.once("ready", function () {
//   mailServer.openBox("INBOX", true, function (err, box) {
//     if (err) throw err;
//     mailServer.search(
//       ["SEEN", ["SINCE", "August 29, 2022"]],
//       function (err, results) {
//         if (err) throw err;
//         var f = mailServer.fetch(results, {
//           bodies: "HEADER.FIELDS (FROM TO SUBJECT DATE BODY)",
//         });
//         console.log(results);
//         f.on("message", function (msg, seqno) {
//           let prefix = "(#" + seqno + ") ";

//           msg.on("body", function (stream, info) {
//             let buffer = "";

//             stream.on("data", function (chunk) {
//               buffer += chunk.toString("utf8");
//             });

//             stream.once("end", function () {
//               console.log(
//                 prefix + "Parsed header: %s",
//                 inspect(Imap.parseHeader(buffer))
//               );
//             });
//           });
//         });
//         f.once("error", function (err) {
//           console.log("Fetch error: " + err);
//         });

//         f.once("end", function () {
//           console.log("Done fetching all messages!");
//           mailServer.end();
//         });
//       }
//     );
//   });
// });

// mailServer.once("error", function (err) {
//   console.log(err);
// });

// mailServer.once("end", function () {
//   console.log("Connection ended");
// });

// mailServer.connect();
/////////////////////////////////////

const Email = mongoose.model("Email", emailSchema);

module.exports = Email;

///////////////////////////////////////

const config = require("../../config.json");
const markAsRead =
  config.imapOptions && config.imapOptions.markAsRead
    ? config.imapOptions.markAsRead
    : false;

const fs = require("fs");
const { Base64Decode } = require("base64-stream");

const Imap = require("imap");
const imap = new Imap(config.imap);

// Simple logger:
const logger = require("simple-node-logger").createSimpleLogger(
  config.logs?.simpleNodeLogger || {
    logFilePath: "mail-downloader.log",
    timestampFormat: "YYYY-MM-DD HH:mm:ss.SSS",
  }
);
logger.setLevel(config.logs?.level || "debug");

var f = imap.seq.fetch("1:*", {
  bodies: ["HEADER.FIELDS (FROM TO SUBJECT DATE)"],
  struct: true,
  markSeen: true, // <---- this is new
});

// var emailDate;
// var emailFrom;
function formatFilename(filename, emailFrom, emailDate) {
  // defaults to current filename:
  let name = filename;
  // if custom config is present:
  if (config.downloads) {
    // if format provided, use it to build filename:
    if (config.downloads.filenameFormat) {
      name = config.downloads.filenameFormat;
      // converts from field from "Full Name <fullname@mydomain.com>" into "fullname":
      name = name.replace(
        "$FROM",
        emailFrom.replace(/.*</i, "").replace(">", "").replace(/@.*/i, "")
      );
      // parses text date and uses timestamp:
      name = name.replace("$DATE", new Date(emailDate).getTime());
      name = name.replace("$FILENAME", filename);
    }
    // if directory provided, use it:
    if (config.downloads.directory)
      name = `${config.downloads.directory}/${name}`;
  }
  // return formatted filename:
  return name;
}

function findAttachmentParts(struct, attachments) {
  attachments = attachments || [];
  for (var i = 0, len = struct.length, r; i < len; ++i) {
    if (Array.isArray(struct[i])) {
      findAttachmentParts(struct[i], attachments);
    } else {
      if (
        struct[i].disposition &&
        ["inline", "attachment"].indexOf(
          struct[i].disposition.type.toLowerCase()
        ) > -1
      ) {
        attachments.push(struct[i]);
      }
    }
  }
  return attachments;
}

function buildAttMessageFunction(attachment, emailFrom, emailDate) {
  const filename = attachment.params.name;
  const encoding = attachment.encoding;

  return function (msg, seqno) {
    var prefix = "(#" + seqno + ") ";
    msg.on("body", function (stream, info) {
      //Create a write stream so that we can stream the attachment to file;
      logger.debug(
        prefix + "Streaming this attachment to file",
        filename,
        info
      );
      var writeStream = fs.createWriteStream(
        formatFilename(filename, emailFrom, emailDate)
      );
      writeStream.on("finish", function () {
        logger.debug(prefix + "Done writing to file %s", filename);
      });

      //so we decode during streaming using
      if (encoding.toLowerCase() === "base64") {
        //the stream is base64 encoded, so here the stream is decode on the fly and piped to the write stream (file)
        stream.pipe(new Base64Decode()).pipe(writeStream);
      } else {
        //here we have none or some other decoding streamed directly to the file which renders it useless probably
        stream.pipe(writeStream);
      }
    });
    msg.once("end", function () {
      logger.debug(prefix + "Finished attachment %s", filename);
      logger.info(`Attachment downloaded: ${filename}`);
    });
  };
}
// const app = require("../app");

const server = http.createServer((req, res) => {
  console.log(req.url);
  res.end();
});

server.listen(5000, "127.0.0.1", () => {
  console.log("listening to req now");
});

imap.once("ready", function () {
  logger.info("Connected");
  imap.openBox("INBOX", !markAsRead, function (err, box) {
    if (err) throw err;
    imap.search(
      ["UNSEEN", ["SINCE", "August 31, 2022"]],
      function (err, results) {
        if (err) throw err;

        if (!results.length) {
          // if now unread messages, log and end connection:
          logger.info("No new emails found");
          imap.end();
        } else {
          logger.info(`Found ${results.length} unread emails`);
          // if unread messages, fetch and process:
          var f = imap.fetch(results, {
            bodies: ["HEADER.FIELDS (FROM TO SUBJECT DATE)"],
            struct: true,
            markSeen: markAsRead,
          });

          f.on("message", function (msg, seqno) {
            logger.debug("Message #%d", seqno);
            const prefix = "(#" + seqno + ") ";

            var emailDate;
            var emailFrom;

            msg.on("body", function (stream, info) {
              var buffer = "";
              stream.on("data", function (chunk) {
                buffer += chunk.toString("utf8");
              });
              stream.once("end", function () {
                const parsedHeader = Imap.parseHeader(buffer);
                logger.debug(prefix + "Parsed header: %s", parsedHeader);
                // set to global vars so they can be used later to format filename:
                emailFrom = parsedHeader.from[0];
                emailDate = parsedHeader.date[0];
                logger.info(`Email from ${emailFrom} with date ${emailDate}`);
              });
            });

            msg.once("attributes", function (attrs) {
              const attachments = findAttachmentParts(attrs.struct);
              logger.debug(prefix + "Has attachments: %d", attachments.length);
              logger.info(`Email with ${attachments.length} attachemnts`);
              for (var i = 0, len = attachments.length; i < len; ++i) {
                const attachment = attachments[i];
                logger.debug(
                  prefix + "Fetching attachment %s"
                  // attachment.params.name
                );
                var f = imap.fetch(attrs.uid, {
                  bodies: [attachment.partID],
                  struct: true,
                });
                //build function to process attachment message
                f.on(
                  "message",
                  buildAttMessageFunction(attachment, emailFrom, emailDate)
                );
              }
            });

            msg.once("end", function () {
              logger.debug(prefix + "Finished email");
            });
          });

          f.once("error", function (err) {
            logger.error("Fetch error: " + err);
          });

          f.once("end", function () {
            logger.info("Done fetching all messages!");
            imap.end();
          });
        }
      }
    );
  });
});

imap.once("error", function (err) {
  logger.error(err);
});

imap.once("end", function () {
  logger.info("Connection ended");
});

imap.connect();
