import React from "react";
import { Modal, Button } from "@patternfly/react-core";

class DeleteModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  delete = () => {
    this.props.doDelete(this.props.deleteInfo);
    this.handleModalToggle();
  };

  handleModalToggle = () => {
    if (this.props.handleModalClose) {
      this.props.handleModalClose();
    }
  };

  render() {
    const { deleteInfo } = this.props;
    return (
      <React.Fragment>
        <Modal
          width={"50%"}
          key="download-modal"
          title="Delete token"
          isOpen={true}
          onClose={this.handleModalToggle}
          actions={[
            <Button key="delete" onClick={this.delete}>
              Delete
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
          Are you sure you want to delete the token for{" "}
          {deleteInfo.actionProps.data.site_name}
        </Modal>
      </React.Fragment>
    );
  }
}

export default DeleteModal;
