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
  Button,
  Toolbar,
  ToolbarGroup,
  ToolbarItem
} from "@patternfly/react-core";

class ListToolbar extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    return (
      <Toolbar className="graph-toolbar pf-l-toolbar pf-u-justify-content-space-between pf-u-px-xl pf-u-py-md">
        <ToolbarGroup>
          <ToolbarItem className="pf-u-mr-md">
            <Button
              variant="control"
              className={`radio-button${
                this.props.size === "compact"
                  ? "-selected ws-core-box-shadow-box pf-u-box-shadow-inset"
                  : ""
              }`}
              onClick={this.props.handleChangeSize}
              id="compact"
            >
              Compact
            </Button>
            <Button
              variant="control"
              className={`radio-button${
                this.props.size === "expanded"
                  ? "-selected ws-core-box-shadow-box pf-u-box-shadow-inset"
                  : ""
              }`}
              onClick={this.props.handleChangeSize}
              id="expanded"
            >
              Expanded
            </Button>
          </ToolbarItem>
        </ToolbarGroup>
      </Toolbar>
    );
  }
}

export default ListToolbar;
