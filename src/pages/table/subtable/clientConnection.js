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
  DataListItemRow,
  DataListCell,
  DataListToggle,
  DataListContent,
  DataListItemCells,
} from "@patternfly/react-core";
import { utils } from "../../../utilities";
class ClientConnection extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  portFromConnection = (connection) => {
    return connection.id.match(/:(.*)@/).pop();
  };

  ipFromConnection = (connection) => {
    return connection.id.match(/^(.*):/).pop();
  };

  getTime = (date) => {
    const options = {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    };
    return new Date(date).toLocaleDateString(undefined, options);
  };

  TCPDetails = (connection, ikey) => {
    const details = ["start_time", "last_in", "last_out"];
    return details
      .filter((det) => connection[det])
      .map((det, i) => (
        <div key={`detail-${ikey}-${i}`}>{`${utils.humanize(
          det
        )} ${this.getTime(connection[det])}`}</div>
      ));
  };

  render() {
    const { connection, name, ikey, expanded, toggle } = this.props;
    const rkey = `request-${ikey}`;
    return (
      <div>
        <DataListItemRow>
          <DataListToggle
            onClick={() => toggle(rkey)}
            isExpanded={expanded.includes(rkey)}
            id={`toggle-${ikey}`}
            aria-controls={`expand-${ikey}`}
          />
          <DataListItemCells
            dataListCells={[
              <DataListCell key="name">
                <span>{name}</span>
              </DataListCell>,
              <DataListCell key="conn_ip">
                ip address
                <span className="detail-value">
                  {this.ipFromConnection(connection)}
                </span>
              </DataListCell>,
              <DataListCell key="conn_port">
                port
                <span className="detail-value">
                  {this.portFromConnection(connection)}
                </span>
              </DataListCell>,
              <DataListCell key="bytes_in">
                <span className="detail-value">
                  {utils.formatStat("bytes_in", connection.bytes_in)}
                </span>
              </DataListCell>,
              <DataListCell key="bytes_out">
                <span className="detail-value">
                  {utils.formatStat("bytes_out", connection.bytes_out)}
                </span>
              </DataListCell>,
            ]}
          />
        </DataListItemRow>
        <DataListContent
          aria-label="Primary Content Details"
          id={`expand-${ikey}`}
          isHidden={!expanded.includes(rkey)}
        >
          {this.TCPDetails(connection, ikey)}
        </DataListContent>
      </div>
    );
  }
}

export default ClientConnection;
