import React from "react";
import { Dropdown, DropdownToggle, DropdownItem } from "@patternfly/react-core";
import { reality } from "../topology/topoUtils.js";

class AddressDropdown extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isOpen: false
    };
    this.onToggle = isOpen => {
      this.setState({
        isOpen
      });
    };
    this.onSelect = event => {
      this.props.handleChangeAddress(event.target.textContent);
      this.setState({
        isOpen: !this.state.isOpen
      });
    };
    this.addresses = [];
    reality.serviceConnections.forEach(si => {
      this.addresses.push(si.address);
    });
  }

  handleHoverAddress = event => {
    this.props.handleChangeAddress(event.target.textContent);
  };

  render() {
    const { isOpen } = this.state;
    const dropdownItems = this.addresses.map(address => (
      <DropdownItem key={address}>
        <div value={address} onMouseOver={this.handleHoverAddress}>
          {address}
        </div>
      </DropdownItem>
    ));

    return (
      <Dropdown
        onSelect={this.onSelect}
        toggle={
          <DropdownToggle className="address-dropdown" onToggle={this.onToggle}>
            {this.props.address}
          </DropdownToggle>
        }
        isOpen={isOpen}
        dropdownItems={dropdownItems}
        autoFocus={false}
      />
    );
  }
}

export default AddressDropdown;
