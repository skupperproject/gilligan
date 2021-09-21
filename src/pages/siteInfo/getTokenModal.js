import React from "react";
import { Modal, Button } from "@patternfly/react-core";
import { Form } from "@patternfly/react-core";
import { ArrowDownIcon } from "@patternfly/react-icons";

import { List, ListItem, ListComponent } from "@patternfly/react-core";
import CopyButton from "./copyButton";
import UseTokenModal from "./useTokenModal";
import ArrowTo from "./arrowTo";
import ManualCopyModal from "./manualCopyModal";

class GetTokenModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isModalOpen: false,
      showManualModal: false,
      uploadMsg: null,
      uploadStatus: null,
      step2Enabled: false,
    };
    this.clipboardSupported = navigator.clipboard;
  }

  handleModalToggle = () => {
    this.setState(
      { isModalOpen: !this.state.isModalOpen, uploadMsg: null },
      () => {
        // blur the step 2 when modal is closed so it won't be enabled if this dialog is re-displayed
        if (!this.state.isModalOpen) {
          this.setState({ step2Enabled: false, showManualModal: false });
        }
      }
    );
  };

  handleCopy = () => {
    if (this.state.step2Enabled) {
      // they clicked on the "Copy a token..." button after the token was already created.
      if (!this.clipboardSupported) {
        this.setState({
          uploadMsg: "",
          uploadStatus: "pending",
          showManualModal: true,
        });
      }
    } else {
      this.props.service.getTokenData().then(
        (results) => {
          if (!this.clipboardSupported) {
            this.setState({
              theToken: results,
              step2Enabled: true,
              uploadMsg: "",
              uploadStatus: "pending",
              showManualModal: true,
            });
          } else {
            navigator.clipboard.writeText(results).then(
              (clip) => {
                const msg = `Request for token sent. The token should be on the clipboard.`;
                console.log(msg);
                this.setState(
                  {
                    uploadMsg: "Token copied to clipboard",
                    uploadStatus: "success",
                    step2Enabled: true,
                  },
                  this.handleCopyDone
                );
              },
              (error) => {
                const msg = `Request for token failed ${error.message}`;
                console.error(msg);
                this.setState({ uploadMsg: error, uploadStatus: "error" });
              }
            );
          }
        },
        (error) => {
          console.log(`fetch clipboard data error`);
          console.log(error);
          this.setState({ uploadMsg: error.message, uploadStatus: "error" });
        }
      );
    }
  };

  handleCopyDone = () => {
    // enable Step 2
    if (this.arrowRef) {
      this.arrowRef.animateIn();
    }
  };
  handleManualCopyModalClose = () => {
    this.setState({ showManualModal: false });
  };

  showManualCopyModal = () => {
    this.setState({ showManualModal: true });
  };

  render() {
    const {
      isModalOpen,
      showManualModal,
      uploadMsg,
      uploadStatus,
      step2Enabled,
      theToken,
    } = this.state;

    return (
      <React.Fragment>
        <Button
          className={`${this.props.cls ? this.props.cls : ""}`}
          variant={"primary"}
          onClick={this.handleModalToggle}
          icon={!this.props.noIcon && <ArrowDownIcon />}
          id={`${!this.props.justButton ? "SKGETTOKEN" : ""}`}
        >
          {this.props.title ? this.props.title : "Link a remote site"}
        </Button>
        {!this.props.justButton && (
          <Modal
            width={"50%"}
            title={this.props.title ? this.props.title : "Link a remote site"}
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
              </div>
              <CopyButton
                {...this.props}
                handleDownloadClicked={this.handleCopy}
                text={`${
                  this.clipboardSupported ? "Copy" : "Manually copy"
                } a token to the clipboard`}
                cls={"sk-block-button"}
              />
              {showManualModal && (
                <ManualCopyModal
                  copyText={theToken}
                  handleModalClose={this.handleManualCopyModalClose}
                />
              )}

              <span className={`sk-status-message ${uploadStatus}`}>
                <h1>{uploadMsg}</h1>
              </span>
              <h1 className={step2Enabled ? "" : "disabled"}>
                Step 2: Use the token to link the sites
              </h1>
              <List className={step2Enabled ? "" : "disabled"}>
                <ListItem component={ListComponent.ol}>
                  Navigate to the remote site's Skupper console.
                </ListItem>
                <ListItem component={ListComponent.ol}>
                  Once there, click on that console's{" "}
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
