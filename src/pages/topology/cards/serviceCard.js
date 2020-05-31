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
import { safePlural } from "../../../utilities";

export class ServiceCard {
  constructor(data) {
    this.data = data;
    this.icon = (
      <svg xmlns="http://www.w3.org/2000/svg" width="56" height="18">
        <g transform="scale(0.75)">
          <g transform="translate(20, 0)">
            <rect
              x="2"
              y="2"
              rx="4"
              strokeWidth="2"
              stroke="black"
              fill="transparent"
              width="30"
              height="20"
            />
          </g>
          <g id="service-arrow" transform="translate(0, 10)">
            <g transform="translate(0, 2)">
              <line
                x0="0"
                x1="20"
                y0="2"
                y1="0"
                stroke="black"
                strokeWidth="2"
              />
            </g>
            <g transform="translate(12, 2)">
              <path stroke="black" fill="black" d="M 0 -5 L 10 0 L 0 5 z" />
            </g>
          </g>
          <use href="#service-arrow" transform="translate(52, 0)" />
        </g>
      </svg>
    );

    this.popupInfo = {
      compact: [
        { title: "Protocol", getFn: this.getProtocol },
        { title: this.getDeployedTitle, getFn: this.getSites },
      ],
      expanded: [
        {
          title: this.getRequestTitle,
          getFn: this.getRequests,
        },
      ],
    };
  }
  getRequestTitle = (service) => {
    return service.requests_sent
      ? "Sites originating requests"
      : "Sites handling requests";
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
    return safePlural(siteCount, "Deployed at site");
  };
  getProtocol = (service) => service.protocol.toUpperCase();
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
