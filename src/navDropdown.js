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
import { Nav, NavList, NavItem } from "@patternfly/react-core";
import "./navDropdown.css";

class NavDropdown extends Component {
  constructor(props) {
    super(props);
    this.state = {};
    this.dropdownItems = [
      {
        key: "graph",
        description: "Graph",
        selected:
          !this.props.mode ||
          this.props.mode === "graph" ||
          this.props.mode === "",
        path: "",
        enabled: true,
        icon: "pf-icon-topology",
        iconClass: "pf-icon",
      },
      {
        key: "table",
        description: "Table",
        selected: this.props.mode === "table",
        path: "Table",
        enabled: true,
        icon: "fa-table",
        iconClass: "fas",
      },
    ];
  }

  onDropDownSelect = (e) => {
    // clicked on text => use target.text, clicked on icon => use target.id
    const desc = e.event.target.text || e.event.target.id;
    this.dropdownItems.forEach((item) => {
      item.selected = item.description === desc;
      if (item.selected) {
        this.props.handleChangeViewMode(item.key);
      }
    });
  };

  render() {
    const selectedItem = this.dropdownItems.find(
      (item) => item.selected === true
    );
    return (
      <Nav onSelect={this.onDropDownSelect} variant="tertiary">
        <NavList>
          {this.dropdownItems.map((item, num) => (
            <NavItem
              key={item.key}
              itemId={num}
              isActive={selectedItem.key === item.key}
              title={`Show ${item.description} view`}
            >
              <i
                className={`${item.iconClass} ${item.icon} sk-nav-icon`}
                id={`${item.description}`}
              />
              {`${item.description}`}
            </NavItem>
          ))}
        </NavList>
      </Nav>
    );
  }
}

export default NavDropdown;
