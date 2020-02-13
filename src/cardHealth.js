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
import { Tooltip } from "@patternfly/react-core";

class CardHealth extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    return (
      <Tooltip content={<div>{`Health is ${this.props.cluster.health}`}</div>}>
        <span className="card-health">
          {this.props.cluster.health === "ok" ? (
            <i className="health-ok pf-icon pf-icon-ok" />
          ) : this.props.cluster.health === undefined ? (
            <i className="health-unknown pf-icon pf-icon-help" />
          ) : (
            <i className="health-bad pf-icon pf-icon-error-circle-o" />
          )}
        </span>
      </Tooltip>
    );
  }
}

export default CardHealth;
