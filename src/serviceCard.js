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

import { Card, CardBody, CardHead } from "@patternfly/react-core";
import CardHealth from "./cardHealth";
import { safePlural, Icap } from "./utilities";

class ServiceCard extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
    this.cardAttributes = {
      cluster: {
        compact: ["namespace"],
        expanded: [
          "url",
          "edge",
          { title: this.getDeploymentTitle, getFn: this.getDeployments }
        ]
      },
      service: {
        compact: [
          "protocol",
          { title: this.getDeployedTitle, getFn: this.getSites }
        ],
        expanded: [{ title: this.getRequestTitle, getFn: this.getRequests }]
      }
    };
  }
  subNodes = cluster => cluster.services.length;

  getRequestTitle = service => {
    return service.requests_sent
      ? "Sites originating requests"
      : "Sites handling requests";
  };
  getDeploymentTitle = site => {
    return `Deployed ${safePlural(this.subNodes(site), "service")}`;
  };
  getDeployments = site => {
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
  getSites = service => this.siteList(service).join(", ");
  siteList = service =>
    Array.from(
      new Set(
        service.targets.map(
          site =>
            this.props.service.VAN.sites.find(
              VANSite => VANSite.site_id === site.site_id
            ).site_name
        )
      )
    );

  getRequests = service => {
    if (service.requests_sent) {
      return this.getRequestsSent(service);
    }
    return this.getRequestsHandled(service);
  };
  getRequestsHandled = service => {
    const handled = [];
    service.requests_handled.forEach((request, i) => {
      const reqSum = this.props.service.adapter.requestSum(request);
      handled.push(
        <div className="card-request" key={`req-${i}`}>
          <span className="card-request-site">
            {this.props.service.adapter.siteNameFromId(request.site_id)}
          </span>
          <span className="card-request-requests">{reqSum}</span>
        </div>
      );
    });
    return handled;
  };
  getRequestsSent = service => {
    const handled = [];
    service.requests_sent.forEach((request, i) => {
      handled.push(
        <div className="card-request" key={`req-sent-${i}`}>
          <span className="card-request-site">
            {this.props.service.adapter.siteNameFromId(request.site_id)}
          </span>
          <span className="card-request-requests">{`(${request.requests})`}</span>
        </div>
      );
    });
    return handled;
  };
  getDeployedTitle = service => {
    const siteCount = this.siteList(service).length;
    return safePlural(siteCount, "Deployed at site");
  };
  bodyLine = (expanded, prop, obj) => {
    let property = prop.getFn ? prop.getFn(obj) : obj[prop];
    if (typeof property === "boolean") {
      property = property.toString();
    }
    const title = prop.title
      ? typeof prop.title === "function"
        ? prop.title(obj)
        : prop.title
      : prop;
    return (
      <div className="body-line">
        {expanded ? (
          <span className="body-line-prompt">{Icap(title)}</span>
        ) : (
          ""
        )}
        <span className="body-line-value">{property}</span>
      </div>
    );
  };
  serviceBodies = service => {
    const expanded = this.props.cardSize === "expanded";
    if (service.address) {
      let bodies = this.cardAttributes.service.compact.map((attr, i) => {
        return (
          <CardBody
            key={`${typeof attr === "string" ? attr : attr.title}-${i}`}
          >
            {this.bodyLine(expanded, attr, service)}
          </CardBody>
        );
      });
      if (expanded) {
        bodies = [
          ...bodies,
          ...this.cardAttributes.service.expanded.map((attr, i) => (
            <CardBody key={`expanded-${attr}-${i}`}>
              {this.bodyLine(expanded, attr, service)}
            </CardBody>
          ))
        ];
      }

      return bodies;
    }
  };
  siteServices = site =>
    site.site_id && (
      <CardBody>
        <div className="body-line">
          {this.props.cardSize === "expanded" ? (
            <span className="body-line-prompt">{`Deployed ${safePlural(
              this.subNodes(site),
              "service"
            )}`}</span>
          ) : (
            ""
          )}
          {site.services.map((s, i) => (
            <span
              key={`deployed-${s.address}-${i}`}
              className="body-line-value"
            >
              {s.address}
            </span>
          ))}
        </div>
      </CardBody>
    );

  siteBodies = cluster => {
    const expanded = this.props.cardSize === "expanded";
    if (cluster.site_id) {
      let bodies = this.cardAttributes.cluster.compact.map((attr, i) => (
        <CardBody key={`site-${attr}-${i}`}>
          {this.bodyLine(expanded, attr, cluster)}
        </CardBody>
      ));
      if (expanded) {
        bodies = [
          ...bodies,
          ...this.cardAttributes.cluster.expanded.map(attr => (
            <CardBody key={attr}>
              {this.bodyLine(expanded, attr, cluster)}
            </CardBody>
          ))
        ];
      }

      return bodies;
    }
  };
  render() {
    let { cardService } = this.props;
    return (
      <Card isHoverable isCompact className="list-card service-card popup">
        <CardHead>
          <div className="card-cluster-header">
            <i
              className={`pf-icon pficon-${
                cardService.address ? "service" : "cluster"
              }`}
            ></i>
            <span>
              {cardService.address
                ? cardService.address
                : cardService.site_name}
            </span>
          </div>
        </CardHead>
        <CardBody>
          Health <CardHealth cluster={cardService} />
        </CardBody>
        {this.siteBodies(cardService)}
        {this.serviceBodies(cardService)}
      </Card>
    );
  }
}

export default ServiceCard;
