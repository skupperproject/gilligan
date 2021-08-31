import React from "react";
import { Modal, Button, Tooltip } from "@patternfly/react-core";

class RegenCAModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = { confirmName: "" };
  }

  regen = () => {
    this.props.doRegenCA(this.props.regenInfo);
    this.handleModalToggle();
  };

  handleModalToggle = () => {
    if (this.props.handleModalClose) {
      this.props.handleModalClose();
    }
  };

  handleValueChange = (event) => {
    this.setState({ confirmName: event.target.value });
  };

  render() {
    const { confirmName } = this.state;
    return (
      <React.Fragment>
        <Modal
          width={"50%"}
          key="regen-modal"
          title="Regenerate certificate authority"
          isOpen={true}
          onClose={this.handleModalToggle}
          actions={[
            <Tooltip
              content="Regerating the certificate authority for this site will unlink all sites."
              key="tooltip"
            >
              <Button
                key="regen"
                onClick={this.regen}
                isAriaDisabled={confirmName !== this.props.siteName}
              >
                Regenerate
              </Button>
            </Tooltip>,
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
          <div>
            The current site name is{" "}
            <span className="sk-highlight-text">{this.props.siteName}</span>
          </div>
          <p>
            Confirm you want to regenerate the certificate authority for this
            site by entering the current site name.
          </p>
          <br />
          <input
            type="text"
            value={confirmName}
            onChange={this.handleValueChange}
            key="input"
          />
        </Modal>
      </React.Fragment>
    );
  }
}

export default RegenCAModal;
