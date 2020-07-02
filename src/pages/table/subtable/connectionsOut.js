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
import { shortName } from "../../../utilities";
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

  requests = (data) => (
    <DataList aria-label="Expandable data list" isCompact>
      <DataListItem
        key={`connout`}
        aria-labelledby={`connections out`}
        isExpanded={false}
      >
        {this.request(data)}
      </DataListItem>
    </DataList>
  );

  request = (data) => {
    const ingresses = [];
    data.targetServices.forEach((target, i) => {
      if (target.protocol === "tcp") {
        target.connections_ingress.forEach((ingress) => {
          for (let connectionId in ingress.connections) {
            const connection = ingress.connections[connectionId];
            if (shortName(connection.client) === shortName(data.address)) {
              ingresses.push(connection);
            }
          }
        });
      }
    });
    return ingresses.map((ingress, i) => {
      return this.client(ingress, shortName(data.address), i);
    });
  };

  client = (connection, name, ikey) => {
    return (
      <ClientConnection
        key={`request-${ikey}`}
        connection={connection}
        name={name}
        ikey={ikey}
        expanded={this.props.expanded}
        toggle={this.props.toggle}
      />
    );
  };

  render() {
    const { data } = this.props;
    return (
      <React.Fragment>
        {this.heading()}
        {this.requests(data)}
      </React.Fragment>
    );
  }
}

export default ConnectionsOut;
