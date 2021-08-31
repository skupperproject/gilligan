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
import {
  Title,
  EmptyState,
  EmptyStateIcon,
  EmptyStateBody,
} from "@patternfly/react-core";
import SearchIcon from "@patternfly/react-icons/dist/js/icons/search-icon";
import RequestReceived from "./requestReceived";
import RequestSent from "./requestSent";
import ConnectionsIn from "./connectionsIn";
import ConnectionsOut from "./connectionsOut";
class SubDetails extends Component {
  constructor(props) {
    super(props);
    this.state = { expanded: [] };
  }

  toggle = (id) => {
    const expanded = this.state.expanded;
    const index = expanded.indexOf(id);
    const newExpanded =
      index >= 0
        ? [
            ...expanded.slice(0, index),
            ...expanded.slice(index + 1, expanded.length),
          ]
        : [...expanded, id];
    this.setState(() => ({ expanded: newExpanded }));
  };

  render() {
    const data = this.props.data
      ? this.props.data
      : this.props.info.extraInfo.rowData.data.cardData;
    if (!data) {
      return <div />;
    }
    return (
      <div className="sk-subdetails">
        {false && !data.protocol && (
          <div>
            <EmptyState>
              <EmptyStateIcon icon={SearchIcon} />
              <Title size="lg" headingLevel="h4">
                No data
              </Title>
              <EmptyStateBody>Data is not available.</EmptyStateBody>
            </EmptyState>
          </div>
        )}
        {data.protocol && (
          <div className="details-section">
            <span className="detail-prompt">Protocol</span> {data.protocol}
          </div>
        )}
        {(data.protocol === "http" || data.nodeType === "cluster") && (
          <RequestReceived
            data={data}
            service={this.props.service}
            toggle={this.toggle}
            expanded={this.state.expanded}
          />
        )}
        <RequestSent
          data={data}
          service={this.props.service}
          toggle={this.toggle}
          expanded={this.state.expanded}
        />
        {data.protocol === "tcp" && (
          <ConnectionsIn
            data={data}
            service={this.props.service}
            toggle={this.toggle}
            expanded={this.state.expanded}
          />
        )}
        <ConnectionsOut
          data={data}
          service={this.props.service}
          toggle={this.toggle}
          expanded={this.state.expanded}
        />
      </div>
    );
  }
}

export default SubDetails;
