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
import { siteColor, serviceColor } from "./utilities";

// number of milliseconds between topology updates
export class QDRService {
  constructor(hooks) {
    this.hooks = hooks;
  }

  connect() {
    return new Promise((resolve, reject) => {
      if (!this.rest) this.rest = new RESTService();
      this.rest.getData().then(
        (data) => {
          if (this.modifier) this.modifier.update(data);
          this.adapter = new Adapter(data);
          this.VAN = data;
          this.initColors(data);
          resolve(data);
        },
        (error) => reject(error)
      );
    });
  }
  update() {
    return this.connect();
  }

  initColors = (data) => {
    data.sites.forEach((site) => {
      siteColor(site.site_name, site.site_id);
    });
    data.services.forEach((service) => {
      serviceColor(service.address);
    });
  };
}

(function() {
  console.dump = function(o) {
    if (window.JSON && window.JSON.stringify)
      console.log(JSON.stringify(o, undefined, 2));
    else console.log(o);
  };
})();
