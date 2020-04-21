import React from "react";
import {
  Dropdown,
  DropdownItem,
  DropdownSeparator,
  DropdownPosition,
  KebabToggle
} from "@patternfly/react-core";
import { ExpandIcon, BackwardIcon, CheckIcon } from "@patternfly/react-icons";

class KebabDropdown extends React.Component {
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
      this.setState({
        isOpen: !this.state.isOpen
      });
      this.onFocus();
      if (event.target.id.toLowerCase() === "all") this.props.handleShowAll();
    };
    this.onFocus = () => {
      const element = document.getElementById("toggle-id-6");
      element.focus();
    };
  }

  render() {
    const { isOpen } = this.state;
    const dropdownItems = [
      <DropdownItem key="action" component="button" variant="icon">
        <div className="dropdown-icon-containter">
          <ExpandIcon />
        </div>
        Expand
      </DropdownItem>,
      <DropdownItem
        key="all"
        component="button"
        variant="icon"
        isDisabled={this.props.disableAll}
        id="all"
      >
        <div
          className="dropdown-icon-containter"
          onClick={this.onSelect}
          id="all"
        >
          <BackwardIcon id="all" />
        </div>
        All {this.props.allText}
      </DropdownItem>,
      <DropdownSeparator key="separator" />,
      <DropdownItem key="recieving" component="button" variant="icon">
        <div className="dropdown-icon-containter">
          <CheckIcon />
        </div>
        Receiving
      </DropdownItem>,
      <DropdownItem key="originating" component="button" variant="icon">
        <div className="dropdown-icon-containter invisible">
          <CheckIcon />
        </div>
        Originating
      </DropdownItem>,
      <DropdownSeparator key="separator2" />,
      <DropdownItem key="rate" component="button" variant="icon">
        <div className="dropdown-icon-containter invisible">
          <CheckIcon />
        </div>
        Rate
      </DropdownItem>,
      <DropdownSeparator key="separator3" />,
      <DropdownItem key="requests" component="button" variant="icon">
        <div className="dropdown-icon-containter">
          <CheckIcon />
        </div>
        Requests
      </DropdownItem>,
      <DropdownItem key="bytes_in" component="button" variant="icon">
        <div className="dropdown-icon-containter invisible">
          <CheckIcon />
        </div>
        Bytes in
      </DropdownItem>,
      <DropdownItem key="bytes_out" component="button" variant="icon">
        <div className="dropdown-icon-containter invisible">
          <CheckIcon />
        </div>
        Bytes out
      </DropdownItem>
    ];
    return (
      <Dropdown
        onSelect={this.onSelect}
        position={DropdownPosition.right}
        toggle={<KebabToggle onToggle={this.onToggle} id="toggle-id-6" />}
        isOpen={isOpen}
        isPlain
        dropdownItems={dropdownItems}
      />
    );
  }
}

export default KebabDropdown;

/*
      <DropdownItem key="all" component="button">
        <DropdownItemIcon>
          <BackwardIcon />
        </DropdownItemIcon>
        All services
      </DropdownItem>
*/
