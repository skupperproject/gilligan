import React from "react";
import { Modal, Button, Tooltip } from "@patternfly/react-core";
export const STATIC_ID = "SK_STATIC_TEXT";
const MIN_STATIC_WIDTH = 40;
const MAX_STATIC_WIDTH = 500;

class EditSiteNameModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = { confirmName: null, staticWidth: 0 };
  }

  componentDidMount = () => {
    let { staticWidth } = this.state;
    const staticText = document.getElementById(STATIC_ID);
    if (staticText) {
      const staticRect = staticText.getBoundingClientRect();
      const padding = 4;
      staticWidth = Math.max(
        MIN_STATIC_WIDTH,
        Math.min(staticRect.width + padding, MAX_STATIC_WIDTH)
      );
      this.setState({ staticWidth });
    }
  };

  componentDidUpdate = (newProps) => {
    if (this.state.confirmName === null) {
      this.setState({ confirmName: newProps.name }, () => {
        if (this.editRef) {
          this.editRef.focus();
        }
      });
    }
  };

  regen = () => {
    this.props.handleSiteNameChange(this.state.confirmName);
    this.handleModalToggle();
  };

  handleModalToggle = () => {
    if (this.props.handleModalClose) {
      this.props.handleModalClose();
      this.setState({ confirmName: null });
    }
  };

  handleValueChange = (event) => {
    this.setState({ confirmName: event.target.value });
  };

  render() {
    const { confirmName, staticWidth } = this.state;
    if (staticWidth === 0) {
      return null;
    }
    const style = {
      width: `${staticWidth}px`,
    };
    return (
      <React.Fragment>
        <Modal
          width={"50%"}
          key="regen-modal"
          title="Edit the site name"
          isOpen={true}
          onClose={this.handleModalToggle}
          actions={[
            <Button
              key="regen"
              onClick={this.regen}
              isDisabled={confirmName === this.props.name}
            >
              Change name
            </Button>,
            <Button
              key="cancel"
              variant="link"
              onClick={this.handleModalToggle}
            >
              Cancel
            </Button>,
          ]}
          isfooterleftaligned={"true"}
        >
          <input
            ref={(el) => (this.editRef = el)}
            type="text"
            value={confirmName}
            onChange={this.handleValueChange}
            style={style}
          />
        </Modal>
      </React.Fragment>
    );
  }
}

export default EditSiteNameModal;
