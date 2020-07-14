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
import { Nav, NavItem, NavList } from "@patternfly/react-core";
import { utils } from "../../../utilities";

class SubNav extends Component {
  constructor(props) {
    super(props);
    this.state = {
      activeItem: "summary",
    };
    this.navItems = {
      service: ["summary", "deployments", "charts"],
      deployment: ["summary", "charts"],
      site: ["summary", "charts"],
    };
  }

  onSelect = (result) => {
    this.setState({
      activeItem: result.itemId,
    });
  };

  render() {
    const { activeItem } = this.state;
    return (
      <Nav onSelect={this.onSelect} className="sk-subnav">
        <NavList variant="tertiary">
          {this.navItems[this.props.view].map(function(item) {
            return (
              <NavItem key={item} itemId={item} isActive={activeItem === item}>
                {utils.Icap(item)}
              </NavItem>
            );
          })}
        </NavList>
      </Nav>
    );
  }
}

export default SubNav;
