import React from "react";
import { Dropdown, DropdownToggle, DropdownItem } from "@patternfly/react-core";
import { reality } from "./topoUtils.js";
import { utils } from "../amqp/utilities";

class serviceDropdown extends React.Component {
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
      this.props.handleChangeService(event.target.textContent);
      this.setState({
        isOpen: !this.state.isOpen
      });
    };
    this.services = [];
    this.services.push("All");
    reality.serviceTypes.forEach(st => {
      this.services.push(st.name);
    });
  }

  handleHoverService = event => {
    this.props.handleChangeService(event.target.textContent);
  };

  render() {
    const { isOpen } = this.state;
    const dropdownItems = this.services.map(service => (
      <DropdownItem key={service}>
        <div value={service} onMouseOver={this.handleHoverService}>
          {service}
        </div>
      </DropdownItem>
    ));

    return (
      <Dropdown
        onSelect={this.onSelect}
        toggle={
          <DropdownToggle onToggle={this.onToggle}>
            {`${utils.Icap(this.props.service)}`}
          </DropdownToggle>
        }
        isOpen={isOpen}
        dropdownItems={dropdownItems}
        autoFocus={false}
      />
    );
  }
}

export default serviceDropdown;
