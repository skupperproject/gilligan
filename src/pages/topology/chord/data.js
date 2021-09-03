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

import { MIN_CHORD_THRESHOLD } from "./matrix.js";

const SAMPLES = 5; // number of snapshots to use for rate calculations

class ChordData {
  // eslint-disable-line no-unused-vars
  constructor(QDRService, isRate, converter) {
    this.QDRService = QDRService;
    this.last_matrix = undefined;
    this.last_values = { values: undefined, timestamp: undefined };
    this.rateValues = undefined;
    this.snapshots = []; // last N values used for calculating rate
    this.isRate = isRate;
    // fn to convert raw data to matrix
    this.converter = converter;
    // object that determines which addresses are excluded
    this.filter = [];
  }
  setRate(isRate) {
    this.isRate = isRate;
  }
  setConverter(converter) {
    this.converter = converter;
  }
  setFilter(filter) {
    this.filter = filter;
  }
  getAddresses() {
    let addresses = {};
    let outer = this.snapshots;
    if (outer.length === 0) outer = outer = [this.last_values];
    outer.forEach(function (snap) {
      snap.values.forEach(function (lv) {
        if (!(lv.address in addresses)) {
          addresses[lv.address] = this.filter.indexOf(lv.address) < 0;
        }
      }, this);
    }, this);
    return addresses;
  }
  getRouters() {
    let routers = {};
    let outer = this.snapshots;
    if (outer.length === 0) outer = [this.last_values];
    outer.forEach(function (snap) {
      snap.values.forEach(function (lv) {
        routers[lv.egress] = true;
        routers[lv.ingress] = true;
      });
    });
    return Object.keys(routers).sort();
  }
  applyFilter(filter) {
    if (filter) this.setFilter(filter);
    return new Promise(function (resolve) {
      resolve(convert(this, this.last_values));
    });
  }
  // construct a square matrix of the number of messages each router has egressed from each router
  getMatrix(d, stat) {
    let self = this;
    return new Promise(function (resolve, reject) {
      // get the router.node and router.link info
      // the raw data received from the routers
      // for each router in the network
      const values = self.QDRService.adapter.matrix(d, stat);
      // values is an array of objects like [{ingress: 'xxx', egress: 'xxx', address: 'xxx', messages: ###}, ....]
      // convert the raw values array into a matrix object
      let matrix = convert(self, values);
      // resolve the promise
      resolve(matrix);
    });
  }
  getSiteMatrixForSite(d, converter, stat) {
    let self = this;
    return new Promise((resolve) => {
      const values = self.QDRService.adapter.siteMatrixForSite(d, stat);
      const matrix = convert(self, values, converter);
      resolve(matrix);
    });
  }

  getAllServiceMatrix(converter, stat) {
    let self = this;
    return new Promise((resolve) => {
      const values = self.QDRService.adapter.allServiceMatrix(stat);
      const matrix = convert(self, values, converter);
      resolve(matrix);
    });
  }

  getSiteMatrix(converter, stat) {
    let self = this;
    return new Promise((resolve) => {
      const values = self.QDRService.adapter.siteMatrix(stat);
      const matrix = convert(self, values, converter);
      resolve(matrix);
    });
  }

  getSite2SiteMatrix(d, converter, deploymentLinks, stat) {
    let self = this;
    return new Promise((resolve) => {
      const values = [];
      deploymentLinks.forEach((link) => {
        if (
          link.source.service.address === d.address ||
          link.target.service.address === d.address
        ) {
          values.push({
            ingress: link.source.site.site_name,
            egress: link.target.site.site_name,
            info: {
              source: {
                site_name: link.source.site.site_name,
                site_id: link.source.site.site_id,
                address: link.source.service.address,
              },
              target: {
                site_name: link.target.site.site_name,
                site_id: link.target.site.site_id,
                address: link.target.service.address,
              },
            },
            messages: link.request[stat],
          });
        }
      });
      const matrix = convert(self, values, converter);
      resolve(matrix);
    });
  }

  getDeploymentMatrix(d, converter, deploymentLinks) {
    let self = this;
    return new Promise((resolve) => {
      const values = [];
      const siteAttr = (sourceTarget, attr) => {
        if (sourceTarget.parentNode) return sourceTarget.parentNode[attr];
        if (sourceTarget.cluster) return sourceTarget.cluster[attr];
        return null;
      };
      deploymentLinks.forEach((link) => {
        if (link.source === d || link.target === d) {
          const sourceSiteName = siteAttr(link.source, "site_name");
          const ingressSite = sourceSiteName ? ` (${sourceSiteName})` : "";
          const sourceSiteId = siteAttr(link.source, "site_id");
          const targetSiteName = siteAttr(link.target, "site_name");
          const egressSite = targetSiteName ? ` (${targetSiteName})` : "";
          const targetSiteId = siteAttr(link.target, "site_id");
          values.push({
            ingress: `${link.source.address}${ingressSite}`,
            egress: `${link.target.address}${egressSite}`,
            address: d.address,
            info: {
              source: {
                site_name: sourceSiteName ? sourceSiteName : "",
                site_id: sourceSiteId ? sourceSiteId : "",
                address: link.source.address,
              },
              target: {
                site_name: targetSiteName ? targetSiteName : "",
                site_id: targetSiteId ? targetSiteId : "",
                address: link.target.address,
              },
            },
            messages: link.value,
          });
        }
      });
      const matrix = convert(self, values, converter);
      resolve(matrix);
    });
  }

  getAllDeploymentMatrix(
    deploymentLinks,
    onlyServices,
    service,
    stat,
    converter
  ) {
    let self = this;
    return new Promise((resolve) => {
      const values = [];
      if (onlyServices.length > 0) {
        deploymentLinks = service.VAN.getDeploymentLinks().filter((l) => {
          return onlyServices.some(
            (os) =>
              os.address === l.source.service.address ||
              os.address === l.target.service.address
          );
        });
      }
      deploymentLinks.forEach((link) => {
        let source, target, sourceSite, targetSite, value;
        if (link.source.address) {
          source = link.source;
          target = link.target;
          sourceSite = link.source.parentNode;
          targetSite = link.target.parentNode;
          value = link.value;
        } else {
          source = link.source.service;
          target = link.target.service;
          sourceSite = link.source.site;
          targetSite = link.target.site;
          value = link.request[stat];
        }
        values.push({
          ingress: `${source.address}${
            !source.derived ? ` (${sourceSite.site_name})` : ""
          }`,
          egress: `${target.address}${
            !target.derived ? ` (${targetSite.site_name})` : ""
          }`,
          address: target.address,
          info: {
            source: {
              site_name: sourceSite.site_name,
              site_id: sourceSite.site_id,
              address: source.address,
            },
            target: {
              site_name: targetSite.site_name,
              site_id: targetSite.site_id,
              address: target.address,
            },
          },
          messages: value,
        });
      });
      const matrix = convert(self, values, converter);
      resolve(matrix);
    });
  }

  convertUsing(converter) {
    let values = this.isRate ? this.rateValues : this.last_values.values;
    // convert the values to a matrix using the requested converter and the current filter
    return converter(values, this.filter);
  }
}

// Private functions

// compare the current values to the last_values and return the rate/second
let calcRate = function (values, last_values, snapshots) {
  let now = Date.now();
  if (!last_values.values) {
    last_values.values = values;
    last_values.timestamp = now - 1000;
  }

  // ensure the snapshots are initialized
  if (snapshots.length < SAMPLES) {
    for (let i = 0; i < SAMPLES; i++) {
      if (snapshots.length < i + 1) {
        snapshots[i] = JSON.parse(JSON.stringify(last_values));
        snapshots[i].timestamp = now - 1000 * (SAMPLES - i);
      }
    }
  }
  // remove oldest sample
  snapshots.shift();
  // add the new values to the end.

  snapshots.push(JSON.parse(JSON.stringify(last_values)));

  let oldest = snapshots[0];
  let newest = snapshots[snapshots.length - 1];
  let rateValues = [];
  let elapsed = (newest.timestamp - oldest.timestamp) / 1000;
  let getValueFor = function (snap, value) {
    for (let i = 0; i < snap.values.length; i++) {
      if (
        snap.values[i].ingress === value.ingress &&
        snap.values[i].egress === value.egress &&
        snap.values[i].address === value.address
      )
        return snap.values[i].messages;
    }
  };
  values.forEach(function (value) {
    let first = getValueFor(oldest, value);
    let last = getValueFor(newest, value);
    let rate = (last - first) / elapsed;

    rateValues.push({
      ingress: value.ingress,
      egress: value.egress,
      address: value.address,
      messages: Math.max(rate, MIN_CHORD_THRESHOLD),
    });
  });
  return rateValues;
};

let genKeys = function (values) {
  values.forEach(function (value) {
    value.key = value.egress + value.ingress + value.address;
  });
};
let sortByKeys = function (values) {
  return values.sort(function (a, b) {
    return a.key > b.key ? 1 : a.key < b.key ? -1 : 0;
  });
};
let convert = function (self, values, converter) {
  if (!converter) converter = self.converter;
  // sort the raw data by egress router name
  genKeys(values);
  sortByKeys(values);

  self.last_values.values = JSON.parse(JSON.stringify(values));
  self.last_values.timestamp = Date.now();
  if (self.isRate) {
    self.rateValues = values = calcRate(
      values,
      self.last_values,
      self.snapshots
    );
  }
  // convert the raw data to a matrix
  let matrix = converter(values, self.filter);
  self.last_matrix = matrix;

  return matrix;
};

export { ChordData };
