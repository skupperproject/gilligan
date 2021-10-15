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

export class SiteCard {
  constructor() {
    this.icon = "cluster";
    this.cardType = "site";
    this.popupInfo = {
      compact: ["namespace"],
      expanded: [
        { title: "Version", getFn: (o) => o.version },
        { title: "URL", getFn: (o) => o.url },
        { title: this.getDeploymentTitle, getFn: this.getDeployments },
        {
          title: (site) => (site.edge ? "Site type" : null),
          getFn: (o) => (o.edge ? "Edge" : null),
        },
      ],
    };
  }
  subNodes = (cluster) => cluster.services.length;
  getDeploymentTitle = (site) => {
    return `Deployed ${utils.safePlural(this.subNodes(site), "service")}`;
  };
  getDeployments = (site) => {
    const deployed = [];
    site.services.forEach((service, i) => {
      deployed.push(
        <div className="card-request" key={`deploy-${site.site_id}-${i}`}>
          <span className="card-request-site">{service.address}</span>
        </div>
      );
    });
    return deployed;
  };
}

export default SiteCard;
