import React from "react";
import { Modal, Button } from "@patternfly/react-core";
import { Form, FormGroup, TextInput } from "@patternfly/react-core";
import DownloadButton from "./downloadButton";
import DownloadIcon from "@patternfly/react-icons/dist/js/icons/file-download-icon";

import { utils } from "../../utilities";

class DownloadModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isModalOpen: this.props.showOpen ? true : false,
      fileName: this.generateFileName(),
    };
    this.handleModalToggle = () => {
      this.setState(
        ({ isModalOpen }) => ({
          isModalOpen: !isModalOpen,
        }),
        () => {
          if (!this.state.isModalOpen && this.props.handleModalClose) {
            this.props.handleModalClose();
          }
        }
      );
    };
  }

  generateFileName = () => {
    return `site-token-${this.props.tokenName}-${utils.randomHex(4)}.token`;
  };

  handleTextInputChange1 = (fileName) => {
    this.setState({ fileName });
  };

  handleDownloadClicked = (event) => {
    console.log(`downloadModal::handleDownloadClicked`);
    const { fileName } = this.state;

    this.setState({ isModalOpen: false }, () => {
      if (this.props.doDownload) {
        this.props.doDownload(fileName);
      }
    });
  };

  render() {
    const { isModalOpen } = this.state;
    const { fileName } = this.state;

    return (
      <React.Fragment>
        {!this.props.hideButton && (
          <Button
            variant={this.props.variant ? this.props.variant : "primary"}
            onClick={this.handleModalToggle}
            icon={<DownloadIcon />}
          >
            Download a link token
          </Button>
        )}
        <Modal
          width={"50%"}
          key="download-modal"
          title="Download a link token"
          isOpen={isModalOpen}
          onClose={this.handleModalToggle}
          actions={[
            <DownloadButton
              key="download"
              text="Download"
              {...this.props}
              downloadFileName={fileName}
              handleDownloadClicked={this.handleDownloadClicked}
            />,
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
          <Form key="download-form">
            <FormGroup
              label="Name"
              key="download-formGroup"
              isRequired
              fieldId="simple-form-name"
              helperText="The token will be downloaded to your browser's download folder using this file name."
            >
              <TextInput
                isRequired
                key="download-textInput"
                type="text"
                id="simple-form-name"
                name="simple-form-name"
                aria-describedby="simple-form-name-helper"
                value={fileName}
                onChange={this.handleTextInputChange1}
              />
            </FormGroup>
          </Form>
        </Modal>
      </React.Fragment>
    );
  }
}

export default DownloadModal;
