import React from "react";
import { Modal, Button } from "@patternfly/react-core";
import { Form } from "@patternfly/react-core";
import { ArrowUpIcon } from "@patternfly/react-icons";
import { List, ListItem, ListComponent } from "@patternfly/react-core";
import PasteButton from "./pasteButton";
import GetTokenModal from "./getTokenModal";

class UseTokenModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isModalOpen: false,
      uploadMsg: null,
    };
  }

  handleModalToggle = () => {
    this.setState(
      { isModalOpen: !this.state.isModalOpen, uploadMsg: null },
      () => {
        if (this.state.isModalOpen) {
          if (this.arrowRef) {
            //this.arrowRef.animateIn();
          }
        }
      }
    );
  };

  addAlert = (alertProps) => {
    if (this.props.addAlert) {
      this.props.addAlert(alertProps);
    }
  };

  handlePaste = (element) => {
    let sendToServer = (token) => this.props.service.uploadToken(token);
    const success = () => {
      const msg = `Site linking request submitted. The request may take a little while.`;
      console.log(msg);
      this.addAlert({
        title: msg,
        variant: "success",
        isLiveRegion: true,
      });
      this.setState({ isModalOpen: false });
    };
    const failure = (error) => {
      const msg = `Site linking request failed ${error.message}`;
      console.error(msg);
      this.addAlert({
        title: msg,
        variant: "danger",
        ariaLive: "assertive",
        ariaRelevant: "additions text",
        ariaAtomic: "false",
      });
      this.setState({ isModalOpen: false });
    };
    if (navigator.clipboard.readText) {
      navigator.clipboard.readText().then((clipText) => {
        sendToServer(clipText).then(success, failure);
      });
      // this is clipboard text
    } else {
      setTimeout(() => {
        const token = element.value;
        sendToServer(token).then(success, failure);
      }, 0);
    }
  };

  render() {
    const { isModalOpen, uploadMsg } = this.state;
    const clipboardSupported = navigator.clipboard.readText;

    return (
      <React.Fragment>
        <Button
          className={`sk-second-button ${this.props.cls ? this.props.cls : ""}`}
          variant={"primary"}
          onClick={this.handleModalToggle}
          icon={<ArrowUpIcon />}
          id={`${
            !this.props.justButton
              ? this.props.targetId
                ? this.props.targetId
                : "SKUSETOKEN"
              : ""
          }`}
        >
          {this.props.title ? this.props.title : "Use token"}
        </Button>
        {!this.props.justButton && (
          <Modal
            width={"50%"}
            title={this.props.title ? this.props.title : "Use token"}
            className="sk-siteinfo-page-wrapper"
            isOpen={isModalOpen}
            onClose={this.handleModalToggle}
            actions={[
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
            <Form key="download-form" className="sk-form">
              <h1 className="sk-faded">Step 1: Generate a token</h1>
              <List className="sk-faded">
                <ListItem component={ListComponent.ol}>
                  If you have not already done so, navigate to the site that can
                  accept an incoming connection.
                </ListItem>
                <ListItem component={ListComponent.ol}>
                  Use the{" "}
                  <GetTokenModal
                    {...this.props}
                    title="Link a remote site"
                    justButton
                    cls="sk-button-placeholder"
                  />
                  button to get a link token.
                </ListItem>
              </List>
              <h1>Step 2: Use the token to link the sites</h1>
              {clipboardSupported && (
                <PasteButton
                  handlePasteClicked={this.handlePaste}
                  text="Use the token on the clipboard"
                />
              )}
              {!clipboardSupported && (
                <React.Fragment>
                  <span>
                    Paste the token from the remote site to create a link.
                  </span>
                  <input
                    ref={(el) => (this.pasteRef = el)}
                    id="skPastedInput"
                    placeholder="Paste token copied from another site here"
                    onPaste={() => this.handlePaste(this.pasteRef)}
                  />
                </React.Fragment>
              )}
              {uploadMsg}
            </Form>
          </Modal>
        )}
      </React.Fragment>
    );
  }
}

export default UseTokenModal;
