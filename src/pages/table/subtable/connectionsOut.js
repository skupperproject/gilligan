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
import ClientConnection from "./clientConnection";
import { utils } from "../../../utilities";
class ConnectionsOut extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  heading = () => (
    <StackItem>
      <TextContent>
        <Text component={TextVariants.h3}>TCP connections out</Text>
      </TextContent>
    </StackItem>
  );

  connList = (reqs) => (
    <DataList aria-label="Expandable data list" isCompact>
      <DataListItem
        key={`connout`}
        aria-labelledby={`connections out`}
        isExpanded={false}
      >
        {reqs}
      </DataListItem>
    </DataList>
  );

  requests = (data) => {
    let ingresses = [];
    if (data.nodeType === "cluster") {
      const VANData = this.props.service.adapter.data;
      const bySite = {};
      VANData.getDeploymentLinks(false).forEach((l) => {
        if (l.target.site.site_id === data.site_id && l.request.id) {
          const siteName = l.source.site.site_name;
          if (!(siteName in bySite)) {
            bySite[siteName] = l.request;
            bySite[siteName].from_address = siteName;
          } else {
            utils.aggregateAttributes(l.request, bySite[siteName]);
          }
        }
      });
      ingresses = Object.keys(bySite).map((s) => bySite[s]);
    } else {
      data.targetServices.forEach((target, i) => {
        if (target.protocol === "tcp") {
          target.connections_ingress.forEach((ingress) => {
            for (let connectionId in ingress.connections) {
              const connection = ingress.connections[connectionId];
              if (
                utils.shortName(connection.client) ===
                utils.shortName(data.address)
              ) {
                connection.from_address = utils.shortName(target.address);
                ingresses.push(connection);
              }
            }
          });
        }
      });
    }
    return ingresses.map((connection, i) => (
      <ClientConnection
        key={`sent-${i}`}
        connection={connection}
        name={utils.shortName(connection.from_address)}
        ikey={`conn-${i}`}
        expanded={this.props.expanded}
        toggle={this.props.toggle}
      />
    ));
  };

  render() {
    const { data } = this.props;
    const requests = this.requests(data);
    return (
      <React.Fragment>
        {requests.length > 0 && this.heading()}
        {requests.length > 0 && this.connList(requests)}
      </React.Fragment>
    );
  }
}

export default ConnectionsOut;
