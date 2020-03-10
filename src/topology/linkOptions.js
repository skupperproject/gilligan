import React from "react";
import { Dropdown, DropdownToggle, DropdownItem } from "@patternfly/react-core";
import { CaretDownIcon } from "@patternfly/react-icons";
import { Icap } from "../utilities";

class LinkOptions extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isOptionsOpen: false,
      linkOptions: this.props.service.adapter.requestAttributes()
    };
  }

  onToggle = isOptionsOpen => {
    this.setState({
      isOptionsOpen
    });
  };
  onSelect = event => {
    const which = event.target.text.toLowerCase();
    this.props.handleChangeOption(which);
    this.setState({ isOptionsOpen: !this.state.isOptionsOpen });
    this.onFocus();
  };

  onFocus = () => {
    const element = document.getElementById("toggle-id");
    element.focus();
  };

  render() {
    const { isOptionsOpen, linkOptions } = this.state;
    const { stat } = this.props.options.link;
    const dropdownItems = linkOptions.map((option, i) => (
      <DropdownItem key={option} className={stat === option ? "selected" : ""}>
        {option}
      </DropdownItem>
    ));
    return (
      <Dropdown
        onSelect={this.onSelect}
        toggle={
          <DropdownToggle
            id="toggle-id"
            onToggle={this.onToggle}
            iconComponent={CaretDownIcon}
            isDisabled={!this.props.showStat}
          >
            {Icap(this.props.options.link.stat)}
          </DropdownToggle>
        }
        isOpen={isOptionsOpen}
        dropdownItems={dropdownItems}
      />
    );
  }
}

export default LinkOptions;
