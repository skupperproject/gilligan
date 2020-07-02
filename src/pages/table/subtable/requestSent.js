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
import { shortName } from "../../../utilities";
class RequestSent extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  heading = () => (
    <StackItem>
      <TextContent>
        <Text component={TextVariants.h3}>HTTP requests sent to</Text>
      </TextContent>
    </StackItem>
  );

  sentList = (reqs) => (
    <DataList aria-label="Expandable data list" isCompact>
      <DataListItem
        key={`requestsent`}
        aria-labelledby={`sent`}
        isExpanded={false}
      >
        {reqs}
      </DataListItem>
    </DataList>
  );

  requests = (data) => {
    const VANData = this.props.service.adapter.findService(data.address);
    const sent = [];
    VANData.targetServices.forEach((target, i) => {
      if (target.protocol === "http") {
        target.requests_received.forEach((req) => {
          const clients = Object.keys(req.by_client);
          const shorts = clients.map((c) => shortName(c));
          const index = shorts.indexOf(shortName(data.address));
          if (index >= 0) {
            req.by_client[clients[index]].from_address = shortName(
              target.address
            );
            sent.push(req.by_client[clients[index]]);
          }
        });
      }
    });
    return sent.map((req, i) => (
      <ClientRequest
        key={`sent-${i}`}
        clientRequest={req}
        name={req.from_address}
        ikey={`sent-${i}`}
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
        {requests.length > 0 && this.sentList(requests)}
      </React.Fragment>
    );
  }
}

export default RequestSent;
