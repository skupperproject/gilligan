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
import SiteModal from "./siteModal";
import { utils } from "../../../utilities";
import { ServiceIcon } from "../../../assets/serviceIcon";

export class ServiceCard {
  constructor(data) {
    this.data = data;
    this.icon = <ServiceIcon />;

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
        {
          title: () => "Show site to site traffic",
          getFn: (data, props) => (
            <div className="card-request">
              <SiteModal
                {...props}
                data={data}
                ref={(el) => (this.modalRef = el)}
              ></SiteModal>
            </div>
          ),
          views: ["service"],
          doUpdate: (props) => {
            if (this.modalRef && this.modalRef.doUpdate) {
              this.modalRef.doUpdate(props);
            }
          },
        },
      ],
    };
  }
  getIcon = ({ scale = 1 }) => {
    return <ServiceIcon scale={scale} />;
  };
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
    return utils.safePlural(siteCount, "Deployed at site");
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
