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
class ClientRequest extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  HTTPDetails = (clientRequest, ikey) => {
    const details = Object.keys(clientRequest.details);
    return details.map((det, i) => (
      <div
        key={`detail-${ikey}-${i}`}
      >{`${det} ${clientRequest.details[det]}`}</div>
    ));
  };

  render() {
    const { clientRequest, name, ikey, expanded, toggle } = this.props;
    const short = utils.shortName(name);
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
                <span>{short}</span>
              </DataListCell>,
              <DataListCell key="requests">
                <span>{clientRequest.requests}</span>
                <span className="detail-value">requests</span>
              </DataListCell>,
              <DataListCell key="latency">
                <span>
                  {utils.formatStat("latency_max", clientRequest.latency_max)}
                </span>
                <span className="detail-value">latency (max)</span>
              </DataListCell>,
              <DataListCell key="bytes_in">
                <span className="detail-value">
                  {utils.formatStat("bytes_in", clientRequest.bytes_in)}
                </span>
              </DataListCell>,
              <DataListCell key="bytes_out">
                <span className="detail-value">
                  {`${utils.formatStat(
                    "bytes_out",
                    clientRequest.bytes_out
                  )} out`}
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
          {this.HTTPDetails(clientRequest)}
        </DataListContent>
      </div>
    );
  }
}

export default ClientRequest;
