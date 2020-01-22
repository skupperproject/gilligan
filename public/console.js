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
var ConsoleServer = require("./console_http_server.js");

function start(env) {
  var console_server = new ConsoleServer(env);
  console_server.listen(env);

  process.on("SIGTERM", function() {
    console.log("Shutdown started");
    var exitHandler = function() {
      process.exit(0);
    };
    var timeout = setTimeout(exitHandler, 2000);

    console_server.close().then(function() {
      console.log("Console server closed");
      clearTimeout(timeout);
      exitHandler();
    });
  });
}

if (require.main === module) {
  start(process.env);
} else {
  module.exports.start = start;
}
