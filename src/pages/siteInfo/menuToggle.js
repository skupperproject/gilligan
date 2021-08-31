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
import { Menu, MenuList, MenuItem } from "@patternfly/react-core";
import EditIcon from "@patternfly/react-icons/dist/js/icons/edit-alt-icon";
import RegerateIcon from "@patternfly/react-icons/dist/js/icons/sync-alt-icon";

class MenuToggle extends React.Component {
  constructor(props) {
    super(props);
    this.state = { expanded: false, activeItem: 0 };
  }

  componentDidMount = () => {
    document.addEventListener("mousedown", this.handleMouseOutside);
  };

  componentWillUnmount() {
    document.removeEventListener("mousedown", this.handleMouseOutside);
  }

  handleMouseOutside = (event) => {
    if (
      this.menuRef &&
      this.buttonRef &&
      (this.menuRef.contains(event.target) ||
        this.buttonRef.contains(event.target))
    ) {
      return;
    }
    this.setState({ expanded: false });
  };

  update = () => {};

  handleMenuClick = () => {
    const { expanded } = this.state;
    this.setState({ expanded: !expanded });
  };

  handleMenuSelect = (_event, itemId) => {
    this.setState(
      {
        activeItem: itemId,
        expanded: false,
      },
      () => {
        // notify parent that a menu item was clicked
        switch (itemId) {
          case 0:
            this.props.handleStartEdit();
            break;
          case 1:
            this.props.handleRegenCA();
            break;
          default:
            console.log(`need to implement selecting menu id ${itemId}`);
        }
      }
    );
  };

  render() {
    const { expanded, activeItem } = this.state;
    return (
      <React.Fragment>
        <button
          ref={(el) => (this.buttonRef = el)}
          className={`pf-c-menu-toggle pf-m-plain ${
            expanded ? "pf-m-expanded" : ""
          }`}
          type="button"
          aria-expanded="false"
          aria-label="Actions"
          onClick={this.handleMenuClick}
        >
          <i className="fas fa-ellipsis-v" aria-hidden="true"></i>
        </button>
        {expanded && (
          <div ref={(el) => (this.menuRef = el)}>
            <Menu
              className="sk-popup-menu"
              onSelect={this.handleMenuSelect}
              activeItemId={activeItem}
            >
              <MenuList>
                <MenuItem icon={<EditIcon aria-hidden />} itemId={0}>
                  Edit this site name
                </MenuItem>
                <MenuItem icon={<RegerateIcon aria-hidden />} itemId={1}>
                  Regenerate site CA
                </MenuItem>
              </MenuList>
            </Menu>
          </div>
        )}
      </React.Fragment>
    );
  }
}

export default MenuToggle;
