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

import React from "react";
import { Button } from "@patternfly/react-core";

class ExpandButton extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    const Charts = <span>Charts</span>;
    return (
      <div
        id={`${this.props.expanded === 0 ? "sk-topology-expand-fixed" : ""}`}
      >
        {this.props.expanded < 2 && (
          <Button
            aria-expanded={this.props.expanded > 0}
            onClick={this.props.handleExpandDrawer}
            className={`sk-topology-expand-button${
              this.props.expanded === 1 ? " sk-full-page" : ""
            }`}
          >
            <i
              className={`fas ${
                this.props.expanded === 0
                  ? "fa-angle-double-left"
                  : "fa-expand-arrows-alt"
              } sk-topology-show-charts`}
            />
          </Button>
        )}
        {this.props.expanded > 0 && (
          <Button
            aria-expanded={true}
            onClick={this.props.handleCollapseDrawer}
            className={`sk-topology-expand-button${
              this.props.expanded === 2 ? " sk-collapse" : ""
            }`}
          >
            <i
              className={`fas ${
                this.props.expanded === 2
                  ? "fa-compress-arrows-alt"
                  : "fa-angle-double-right"
              } sk-topology-show-charts`}
            />
          </Button>
        )}
      </div>
    );
  }
}

export default ExpandButton;
