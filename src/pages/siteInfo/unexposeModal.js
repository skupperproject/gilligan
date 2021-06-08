import React from "react";
import { Modal, Button } from "@patternfly/react-core";

class UnexposeModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  unexpose = () => {
    this.props.doUnexpose(this.props.unexposeInfo);
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
          key="unexpose-modal"
          title="Unexpose service"
          isOpen={true}
          onClose={this.handleModalToggle}
          actions={[
            <Button key="unexpose" onClick={this.unexpose}>
              Unexpose
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
          Are you sure you want to unexpose service{" "}
          {this.props.unexposeInfo.Name}
        </Modal>
      </React.Fragment>
    );
  }
}

export default UnexposeModal;
