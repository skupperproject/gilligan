/*
 * Copyright 2020 Red Hat Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const fs = require("fs");
const http = require("http");
const path = require("path");
const url = require("url");

class ConsoleServer {
  constructor() {
    // initialized once this.listen is called
    this.server = null;
  }
  close() {
    return new Promise(resolve => {
      this.server.close(resolve);
    });
  }
  listen(env) {
    this.server = http.createServer();
    const port = env.LISTEN_PORT === undefined ? 8888 : env.LISTEN_PORT;
    this.server.listen(port);
    console.log(`listening on port ${port}`);
    this.server.on("request", handleRequest);
    return this.server;
  }
}

const contentTypes = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpg",
  ".gif": "image/gif",
  ".woff": "application/font-woff",
  ".ttf": "application/font-ttf",
  ".eot": "application/vnd.ms-fontobject",
  ".otf": "application/font-otf",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

const getContentType = file => contentTypes[path.extname(file).toLowerCase()];

const staticHandler = (request, response) => {
  let file = path.join(__dirname, "/", url.parse(request.url).pathname);
  if (file.charAt(file.length - 1) === "/") {
    file += "index.html";
  }

  fs.readFile(file, (error, data) => {
    if (error) {
      response.statusCode = error.code === "ENOENT" ? 404 : 500;
      response.end();
      console.log(`GET ${request.url} => ${response.statusCode} ${error}`);
    } else {
      const contentType = getContentType(file);
      if (contentType) {
        response.setHeader("content-type", contentType);
      }
      console.log(`GOT ${request.url} => ${file}`);
      response.end(data);
    }
  });
};

const handleRequest = (request, response) => {
  // if we get a /topics[/<name>] request, we want to pass it along to
  // the back-end server and return the response to the web page
  const pathName = url.parse(request.url).pathname;
  const parts = pathName.split("/");
  // handle /topics and /topics/foo, but not /topicsfoo
  if (parts.length > 1 && parts[1] === "topics") {
    let body = "";
    // Accumulate the data to be sent
    request.on("data", data => {
      body += data;
      if (body.length > 1e7) {
        response.writeHead(413, "Request Entity Too Large", {
          "Content-Type": "text/html"
        });
        response.end(
          "<!doctype html><html><head><title>413</title></head><body>413: Request Entity Too Large</body></html>"
        );
      }
    });
    // After we have received all the data for this request,
    // send it on to the back-end server
    request.on("end", () => {
      console.log(`sending / topics ${request.method} request`);
      const options = {
        host: process.env.REST_HOST || "localhost",
        port: process.env.REST_PORT || 8080,
        path: pathName,
        method: request.method,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body)
        }
      };
      // setup the request to the back-end server
      const req = http.request(
        options,
        res => {
          console.log("getting a response");
          res.setEncoding("utf8");
          let chunks = "";
          // accumulate the response data
          res.on("data", chunk => {
            chunks += chunk;
            if (chunks.length > 1e7) {
              response.writeHead(413, "Response Entity Too Large", {
                "Content-Type": "text/html"
              });
              response.end(
                "<!doctype html><html><head><title>413</title></head><body>413: Response Entity Too Large</body></html>"
              );
            }
          });
          // once the response from the back-end server is here
          res.on("end", () => {
            console.log(
              `received / topics ${request.method} response.statusCode: ${res.statusCode}`
            );
            // inform the calling web page that we are done
            response.statusCode = res.statusCode;
            response.end(chunks);
          });
          res.on("error", e => {
            console.log(
              `received / topics ${request.method} response.statusCode: ${res.statusCode} error: ${e}`
            );
            response.statusCode = res.statusCode;
            response.end(e);
          });
        },
        e => {
          console.log(e);
          response.status.code = 500;
          response.end(e);
        }
      );
      req.on("error", err => {
        console.log(
          `can't connect to server at http://${process.env.REST_HOST ||
            "localhost"}:${process.env.REST_PORT || 8080}`
        );
        response.end("error");
      });
      // actually send the request to the back-end server
      console.log(`sending ${body}`);
      req.write(body);
      req.end();
    });
  } else {
    staticHandler(request, response);
  }
};

module.exports = ConsoleServer;
