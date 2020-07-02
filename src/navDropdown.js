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
  Dropdown,
  DropdownPosition,
  DropdownToggle,
  DropdownItem,
} from "@patternfly/react-core";

class NavDropdown extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isDropDownOpen: false,
    };
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
      },
      /*{
        key: "card",
        description: "Card",
        selected: viewType === "card",
      },*/
      {
        key: "table",
        description: "Table",
        selected: this.props.mode === "table",
        path: "Table",
        enabled: true,
      },
    ];
    /* console.log(
      `NAVDROPDOWN mode ${this.props.mode} items ${JSON.stringify(
        this.dropdownItems
      )}`
    );*/
  }
  onDropDownToggle = (isOpen) => {
    this.setState({
      isDropDownOpen: isOpen,
    });
  };

  onDropDownSelect = (event) => {
    this.setState({
      isDropDownOpen: !this.state.isDropDownOpen,
    });
    const desc = event.target.text;
    this.dropdownItems.forEach((item) => {
      item.selected = item.description === desc;
      if (item.selected) {
        this.props.handleChangeViewMode(item.key);
      }
    });
  };

  /*
              component={
              <Link to={`/${this.props.view}${item.path}`}>
                {item.description}
              </Link>
            }
*/
  render() {
    const { isDropDownOpen } = this.state;
    return (
      <Dropdown
        id="navDropdown"
        onSelect={this.onDropDownSelect}
        position={DropdownPosition.left}
        toggle={
          <DropdownToggle onToggle={this.onDropDownToggle}>
            {
              this.dropdownItems.find((item) => item.selected === true)
                .description
            }
          </DropdownToggle>
        }
        isOpen={isDropDownOpen}
        dropdownItems={this.dropdownItems.map((item) => (
          <DropdownItem key={item.key}>{item.description}</DropdownItem>
        ))}
      />
    );
  }
}

export default NavDropdown;
