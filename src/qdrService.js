/*
Licensed to the Apache Software Foundation (ASF) under one
  or more contributor license agreements.  See the NOTICE file
  distributed with this work for additional information
  regarding copyright ownership.  The ASF licenses this file
  to you under the Apache License, Version 2.0 (the
  "License"); you may not use this file except in compliance
  with the License.  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing,
  software distributed under the License is distributed on an
  "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
  KIND, either express or implied.  See the License for the
  specific language governing permissions and limitations
  under the License.
*/

import RESTService from "./restService";
import Adapter from "./adapter";

// number of milliseconds between topology updates
export class QDRService {
  constructor(hooks) {
    this.hooks = hooks;
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.rest = new RESTService();
      this.rest.getData().then(
        data => {
          this.adapter = new Adapter(data);
          this.VAN = data;
          resolve(data);
        },
        error => reject(error)
      );
    });
  }
}

(function() {
  console.dump = function(o) {
    if (window.JSON && window.JSON.stringify)
      console.log(JSON.stringify(o, undefined, 2));
    else console.log(o);
  };
})();
