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
class ConnectionsIn extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  heading = () => (
    <StackItem>
      <TextContent>
        <Text component={TextVariants.h3}>TCP connections in</Text>
      </TextContent>
    </StackItem>
  );

  connectionList = (data) => (
    <DataList aria-label="Expandable data list" isCompact>
      <DataListItem
        key={`connin`}
        aria-labelledby={`connections in`}
        isExpanded={false}
      >
        {this.conns(data)}
      </DataListItem>
    </DataList>
  );

  conns = (data) => {
    const connections = [];
    data.connections_ingress.forEach((conn) => {
      for (let connId in conn.connections) {
        connections.push(conn.connections[connId]);
      }
    });
    return connections.map((conn, i) => (
      <ClientConnection
        key={`connin-${i}`}
        connection={conn}
        name={shortName(conn.client)}
        ikey={`connin-${i}`}
        expanded={this.props.expanded}
        toggle={this.props.toggle}
      />
    ));
  };

  render() {
    const { data } = this.props;
    return (
      <React.Fragment>
        {this.heading()}
        {this.connectionList(data)}
      </React.Fragment>
    );
  }
}

export default ConnectionsIn;
