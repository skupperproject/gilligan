import React from "react";
import { Modal, Button } from "@patternfly/react-core";

class UnlinkModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  unlink = () => {
    this.props.doUnlink(this.props.unlinkInfo);
    this.handleModalToggle();
  };

  handleModalToggle = () => {
    if (this.props.handleModalClose) {
      this.props.handleModalClose();
    }
  };

  render() {
    return (
      <React.Fragment>
        <Modal
          width={"50%"}
          key="download-modal"
          title="Unlink site"
          isOpen={true}
          onClose={this.handleModalToggle}
          actions={[
            <Button key="unlink" onClick={this.unlink}>
              Unlink
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
          Are you sure you want to unlink {this.props.unlinkInfo.name}
        </Modal>
      </React.Fragment>
    );
  }
}

export default UnlinkModal;
