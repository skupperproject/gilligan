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

import React from "react";
import { utils } from "../../../utilities";
import { ServiceIcon } from "../../../assets/serviceIcon";

export class ServiceCard {
  constructor(data) {
    this.data = data;
    this.icon = <ServiceIcon />;
    this.cardType = "service";

    this.popupInfo = {
      compact: [
        { title: "Protocol", getFn: this.getProtocol },
        { title: this.getDeployedTitle, getFn: this.siteList },
      ],
      expanded: [
        {
          title: "Bytes sent",
          getFn: (service, props) =>
            this.getServicesSentReceived(true, service, props),
        },
        {
          title: "Bytes received",
          getFn: (service, props) =>
            this.getServicesSentReceived(false, service, props),
        },
      ],
    };
  }
  getIcon = ({ scale = 1 }) => {
    return <ServiceIcon scale={scale} />;
  };

  siteList = (service) =>
    Array.from(
      new Set(
        service.targets.map(
          (site) =>
            this.data.VAN.sites.find(
              (VANSite) => VANSite.site_id === site.site_id
            ).site_name
        )
      )
    );
  getDeployedTitle = (service) => {
    const siteCount = this.siteList(service).length;
    return utils.safePlural(siteCount, "Deployed at site");
  };
  getProtocol = (service) => service.protocol.toUpperCase();

  getServicesSentReceived = (sent, service, props) => {
    const bytesOutMap = {};
    const constrainSourceSiteID =
      props.view === "deployment" ? service.cluster.site_id : null;
    // for all links where source service is this service[/site], construct map of target service address: bytes_out
    const deploymentLinks = props.service.VAN.getDeploymentLinks();
    const from = sent ? "source" : "target";
    const to = sent ? "target" : "source";
    deploymentLinks.forEach((link) => {
      if (link[from].service.address === service.address) {
        if (
          !constrainSourceSiteID ||
          link[from].site.site_id === constrainSourceSiteID
        ) {
          let key = "";
          if (constrainSourceSiteID) {
            key += link[to].site.site_name + "/";
          }
          key += link[to].service.address;
          if (!bytesOutMap[key]) {
            bytesOutMap[key] = 0;
          }
          bytesOutMap[key] += link.request.bytes_out;
        }
      }
    });
    if (Object.keys(bytesOutMap).length > 0) {
      let total = 0;
      Object.keys(bytesOutMap).forEach((key) => {
        total += bytesOutMap[key];
      });
      const totalLine =
        Object.keys(bytesOutMap).length > 1 ? (
          <div className="card-request" key={"all"}>
            {this.format(total, props.stat)} bytes total
          </div>
        ) : (
          ""
        );
      // site/service: bytes
      return [
        totalLine,
        ...Object.keys(bytesOutMap).map((target, i) => (
          <div className="card-request" key={i}>
            {this.format(bytesOutMap[target], props.stat)}
            {sent ? " to " : " from "}
            {target}
          </div>
        )),
      ];
    }
  };

  format = (val, stat) => utils.formatStat(stat, val);

  getRequests = (service) => {
    if (service.requests_sent) {
      return this.getRequestsSent(service);
    }
    return this.getRequestsHandled(service);
  };
  getRequestsHandled = (service) => {
    const requestSums = this.data.adapter.requestSums(
      service,
      "requests_handled"
    );
    return requestSums.map((rs, i) => (
      <div className="card-request" key={`req-${i}`}>
        <span className="card-request-site">{rs.site_name}</span>
        <span className="card-request-requests">{rs.sum}</span>
      </div>
    ));
  };
  getRequestsSent = (service) => {
    const requestSums = this.data.adapter.requestSums(service, "requests_sent");
    return requestSums.map((rs, i) => (
      <div className="card-request" key={`req-${i}`}>
        <span className="card-request-site">{rs.site_name}</span>
        <span className="card-request-requests">{rs.sum}</span>
      </div>
    ));
  };
}

export default ServiceCard;
