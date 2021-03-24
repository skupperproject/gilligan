import React from "react";
import { Modal, Button } from "@patternfly/react-core";
import { Form, FormGroup, TextInput } from "@patternfly/react-core";
import DownloadButton from "./downloadButton";
import DownloadIcon from '@patternfly/react-icons/dist/js/icons/file-download-icon';

import { utils } from "../../utilities";

class DownloadModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isModalOpen: false,
    };
    this.handleModalToggle = () => {
      this.setState(({ isModalOpen }) => ({
        isModalOpen: !isModalOpen,
        value1: `site-token-${
          this.props.service.siteInfo.site_name
        }-${utils.randomHex(4)}.token`,
      }));
    };
  }

  handleTextInputChange1 = (value1) => {
    this.setState({ value1 });
  };
  render() {
    const { isModalOpen } = this.state;
    const { value1 } = this.state;

    return (
      <React.Fragment>
        <Button variant={this.props.variant ? this.props.variant : "primary"} onClick={this.handleModalToggle} icon={<DownloadIcon />}> 
          Download a link token
        </Button>
        <Modal
          width={"50%"}
          title="Download a link token"
          isOpen={isModalOpen}
          onClose={this.handleModalToggle}
          actions={[
            <DownloadButton
              text="Download"
              {...this.props}
              downloadFileName={value1}
              handleDownloadClicked={this.handleModalToggle}
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
                value={value1}
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
