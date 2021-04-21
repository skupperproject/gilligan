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
import { utils } from "./utilities";
export const UPDATE_INTERVAL = 2000;
export const ALERT_TIMEOUT = 6000;

// number of milliseconds between topology updates
export class QDRService {
  constructor(hooks) {
    this.hooks = hooks;
    this.history = {};
    this.VAN = null;
    this.rest = null;
    this.adapter = null;
    this.siteInfo = null;
  }

  connect = (to) => {
    return new Promise((resolve, reject) => {
      if (!this.rest) this.rest = new RESTService();
      this.rest
        .getData(to)
        .then(
          (data) => {
            if (this.adapter) delete this.adapter;
            this.adapter = new Adapter(data);
            this.VAN = data;
            this.saveTimeSeries(data);
            this.initColors(data);
            if (!this.siteInfo) {
              this.rest.getSiteInfo().then((info) => {
                this.siteInfo = info;
                resolve(data);
              });
            } else {
              resolve(data);
            }
          },
          (error) => reject(error)
        )
        .catch(() => {});
    });
  };

  // SITE
  getSiteInfo = () => this.rest.getSiteInfo();

  // USETOKEN
  uploadToken = (data) => this.rest.uploadToken(data);

  getSkupperTokenURL = () => {
    return this.rest.getSkupperTokenURL();
  };

  // GENERATE_TOKEN
  getTokenData = () => this.rest.getTokenData();

  // DELETE_TOKEN
  deleteToken = (data) => this.rest.deleteToken(data);

  // UPDATE_TOKEN
  updateToken = (data) => this.rest.updateToken(data);

  // UNLINK
  unlinkSite = (data) => this.rest.unlinkSite(data);

  update() {
    return this.connect();
  }

  initColors = (data) => {
    data.sites.forEach((site) => {
      utils.siteColor(site.site_name, site.site_id);
    });
    data.services.forEach((service) => {
      utils.serviceColor(service.address);
    });
  };

  saveTimeSeries = (data) => {
    // push the current link.request onto link.history
    data.deploymentLinks.forEach((link) => {
      utils.keepHistory({
        obj: link.request,
        storage: this.history,
        key: link.key,
        history: (60 * 60 * 1000) / UPDATE_INTERVAL, // 1 hour of samples
      });
      link.history = this.history[link.key];
    });
  };
}

(function () {
  console.dump = function (o) {
    if (window.JSON && window.JSON.stringify)
      console.log(JSON.stringify(o, undefined, 2));
    else console.log(o);
  };
})();
