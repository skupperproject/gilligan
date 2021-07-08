import React from "react";
import { Modal, Button } from "@patternfly/react-core";
import { Form } from "@patternfly/react-core";
import { ArrowDownIcon } from "@patternfly/react-icons";

import { List, ListItem, ListComponent } from "@patternfly/react-core";
import CopyButton from "./copyButton";
import UseTokenModal from "./useTokenModal";
import ArrowTo from "./arrowTo";

class GetTokenModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isModalOpen: false,
      uploadMsg: null,
      uploadStatus: null,
      step2Enabled: false,
    };
  }

  handleModalToggle = () => {
    this.setState(
      { isModalOpen: !this.state.isModalOpen, uploadMsg: null },
      () => {
        // blur the step 2 when modal is closed so it won't be enabled if this dialog is re-displayed
        if (!this.state.isModalOpen) {
          this.setState({ step2Enabled: false });
        }
      }
    );
  };

  handleCopy = () => {
    this.props.service.getTokenData().then(
      (results) => {
        const token = JSON.stringify(results, null, 2);
        navigator.clipboard.writeText(token).then(
          (s) => {
            console.log("Copy to clipboard worked");
            this.setState(
              {
                uploadMsg: "Token copied to clipboard",
                uploadStatus: "success",
                step2Enabled: true,
              },
              this.handleCopyDone
            );
          },
          (e) => {
            console.log("Copy to clipboard failed");
            console.log(e);
            this.setState({ uploadMsg: e, uploadStatus: "error" });
          }
        );
      },
      (error) => {
        console.log(`fetch clipboard data error`);
        console.log(error);
        this.setState({ uploadMsg: error.message, uploadStatus: "error" });
      }
    );
  };

  handleCopyDone = () => {
    // enable Step 2
    if (this.arrowRef) {
      this.arrowRef.animateIn();
    }
  };

  handlePaste = (element) => {
    let sendToServer = (token) => this.props.service.uploadToken(token);
    if (navigator.clipboard.readText) {
      navigator.clipboard.readText().then((clipText) => {
        sendToServer(clipText).then(
          () => {},
          (error) => {
            console.log(error);
          }
        );
      });
    } else {
      setTimeout(() => {
        const token = element.value;
        sendToServer(token).then(
          () => {
            element.value = `Site linking requested.`;
          },
          (error) => {
            element.value = `Site linking is ${error}`;
          }
        );
      }, 0);
    }
  };

  render() {
    const { isModalOpen, uploadMsg, uploadStatus, step2Enabled } = this.state;

    return (
      <React.Fragment>
        <Button
          className={`${this.props.cls ? this.props.cls : ""}`}
          variant={"primary"}
          onClick={this.handleModalToggle}
          icon={!this.props.noIcon && <ArrowDownIcon />}
          id={`${!this.props.justButton ? "SKGETTOKEN" : ""}`}
        >
          {this.props.title ? this.props.title : "Link remote site"}
        </Button>
        {!this.props.justButton && (
          <Modal
            width={"50%"}
            title={this.props.title ? this.props.title : "Link remote site"}
            className="sk-siteinfo-page-wrapper"
            isOpen={isModalOpen}
            onClose={this.handleModalToggle}
            actions={[
              <Button
                key="cancel"
                variant="link"
                onClick={this.handleModalToggle}
              >
                Close
              </Button>,
            ]}
            isfooterleftaligned={"true"}
          >
            <Form key="download-form" className="sk-form">
              <h1 className={step2Enabled ? "disabled" : ""}>
                Step 1: Get a link token
              </h1>
              <div className={step2Enabled ? "disabled" : ""}>
                The token allows a remote site to connect to this site. This
                site needs to allow an incoming connection request. If this site
                does not allow incoming connections, navigate to the skupper
                console for the site that does allow incoming connections and
                get a token.
                <CopyButton
                  {...this.props}
                  handleDownloadClicked={this.handleCopy}
                  text="Copy a token to the clipboard"
                  cls={"sk-block-button"}
                />
                <span className={`sk-status-message ${uploadStatus}`}>
                  {uploadMsg}
                </span>
              </div>
              <h1 className={step2Enabled ? "" : "disabled"}>
                Step 2: Use the token to link the sites
              </h1>
              <List className={step2Enabled ? "" : "disabled"}>
                <ListItem component={ListComponent.ol}>
                  Navigate to the remote site's Skupper console.
                </ListItem>
                <ListItem component={ListComponent.ol}>
                  Once there, click on the{" "}
                  <UseTokenModal
                    {...this.props}
                    title="Use a token"
                    direction="up"
                    justButton
                    cls="sk-button-placeholder"
                  />{" "}
                  <ArrowTo
                    ref={(el) => (this.arrowRef = el)}
                    targetId={
                      this.props.targetId ? this.props.targetId : "SKUSETOKEN"
                    }
                  />{" "}
                  button to link the remote site to this site.
                </ListItem>
              </List>
            </Form>
          </Modal>
        )}
      </React.Fragment>
    );
  }
}

export default GetTokenModal;
