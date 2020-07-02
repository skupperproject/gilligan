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
class RequestReceived extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  heading = (data) => {
    return (
      data.requests_received.length > 0 && (
        <StackItem>
          <TextContent>
            <Text component={TextVariants.h3}>HTTP requests received from</Text>
          </TextContent>
        </StackItem>
      )
    );
  };

  requests = (data) => (
    <DataList aria-label="Expandable data list" isCompact>
      {data.requests_received.map((r, i) => (
        <DataListItem
          key={`rr-${i}`}
          aria-labelledby={`item-${i}`}
          isExpanded={this.props.expanded.includes(`request-${i}`)}
        >
          {this.request(data, r, i)}
        </DataListItem>
      ))}
    </DataList>
  );

  request = (data, r, ikey) => {
    console.log(`--- rendering request ${data.address}`);
    console.log(r);
    console.log(this.props.service);
    const VANData = this.props.service.adapter.findService(data.address);
    console.log(VANData);
    console.log(data);
    const clients = Object.keys(r.by_client);
    return clients.map((client, i) => {
      return this.client(r.by_client[client], client, `${ikey}-${i}`);
    });
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
    return (
      <React.Fragment>
        {this.heading(data)}
        {this.requests(data)}
      </React.Fragment>
    );
  }
}

export default RequestReceived;
