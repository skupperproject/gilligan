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

import React, { Component } from "react";
import { DataList, DataListItem } from "@patternfly/react-core";
import {
  StackItem,
  TextContent,
  Text,
  TextVariants,
} from "@patternfly/react-core";
import ClientRequest from "./clientRequest";
import { utils } from "../../../utilities";
class RequestReceived extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  heading = (requests) => {
    return (
      requests &&
      requests.length > 0 && (
        <StackItem>
          <TextContent>
            <Text component={TextVariants.h3}>HTTP requests received from</Text>
          </TextContent>
        </StackItem>
      )
    );
  };

  dataList = (requests) =>
    requests && (
      <DataList aria-label="Expandable data list" isCompact>
        {requests.map((r, i) => (
          <DataListItem
            key={`rr-${i}`}
            aria-labelledby={`item-${i}`}
            isExpanded={this.props.expanded.includes(`request-${i}`)}
          >
            {this.request(r, i)}
          </DataListItem>
        ))}
      </DataList>
    );

  requests = (data) => {
    let received = [];
    if (data.nodeType === "cluster") {
      const fromSite = {};
      this.props.service.adapter.getDeploymentLinks().forEach((l) => {
        if (l.target.site.site_name === data.site_name && l.request.details) {
          const sourceSite = l.source.site.site_name;
          if (!(sourceSite in fromSite)) {
            fromSite[sourceSite] = l.request;
          } else {
            utils.aggregateAttributes(l.request, fromSite[sourceSite]);
          }
        }
      });
      received = Object.keys(fromSite).map((site_name) => ({
        clientRequest: fromSite[site_name],
        name: site_name,
      }));
    } else {
      received = data.requests_received;
    }
    return received;
  };

  request = (r, ikey) => {
    if (r.by_client) {
      const clients = Object.keys(r.by_client);
      return clients.map((client, i) => {
        return this.client(r.by_client[client], client, `${ikey}-${i}`);
      });
    } else {
      return this.client(r.clientRequest, r.name, `${ikey}-${0}`);
    }
  };

  client = (clientRequest, name, ikey) => {
    return (
      <ClientRequest
        key={`request-${ikey}`}
        clientRequest={clientRequest}
        name={name}
        ikey={ikey}
        expanded={this.props.expanded}
        toggle={this.props.toggle}
      />
    );
  };

  render() {
    const { data } = this.props;
    const requests = this.requests(data);
    return (
      <React.Fragment>
        {this.heading(requests)}
        {this.dataList(requests)}
      </React.Fragment>
    );
  }
}

export default RequestReceived;
