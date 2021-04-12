import React from "react";
import { Modal, Button } from "@patternfly/react-core";
import { Form } from "@patternfly/react-core";
import { ArrowRightIcon } from "@patternfly/react-icons";
import {
  List,
  ListItem,
  ListComponent,
  OrderType,
} from "@patternfly/react-core";
import CopyButton from "./copyButton";
import PasteButton from "./pasteButton";

class LinkSitesModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isModalOpen: false,
    };
    this.handleModalToggle = () => {
      this.setState(({ isModalOpen }) => ({
        isModalOpen: !isModalOpen,
      }));
    };
  }

  render() {
    const { isModalOpen } = this.state;
    const clipboardSupported = navigator.clipboard.readText;

    return (
      <React.Fragment>
        <Button
          variant={"primary"}
          onClick={this.handleModalToggle}
          icon={<ArrowRightIcon />}
        >
          Link remote site
        </Button>
        <Modal
          width={"50%"}
          title="Link remote site"
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
          <Form key="download-form">
            <h1>Linking a remote site to this site</h1>
            <List>
              <ListItem component={ListComponent.ol} type={OrderType.number}>
                <CopyButton
                  {...this.props}
                  handleDownloadClicked={this.handleCopy}
                  text="Copy a token to the clipboard"
                />{" "}
              </ListItem>
              <ListItem component={ListComponent.ol} type={OrderType.number}>
                Navigate to the remote site's Skupper console and use the{" "}
                <h2 className="sk-inline-h2">
                  Linking this site to a remote site
                </h2>{" "}
                section below to{" "}
                {clipboardSupported
                  ? "send the token to create the link."
                  : "paste the copied token to create the link."}
              </ListItem>
            </List>
            <h1>Linking this site to a remote site</h1>
            <List>
              <ListItem component={ListComponent.ol} type={OrderType.number}>
                Navigate to the remote site's Skupper console and copy a token
                to the clipboard.
              </ListItem>
              <ListItem component={ListComponent.ol} type={OrderType.number}>
                {clipboardSupported && (
                  <React.Fragment>
                    <span>
                      Use the token on the clipboard to create the link.
                    </span>
                    <PasteButton
                      handlePasteClicked={this.handlePaste}
                      text="Use the token on the clipboard"
                    />
                  </React.Fragment>
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
              </ListItem>
            </List>
            <h1>Linking sites using the command line</h1>
            <div className="sk-sub-text">
              Paul will supply some reasonable text describing this action.
              <Button
                className="sk-block-button"
                component="a"
                href="https://skupper.io/releases/index.html"
                target="_blank"
                variant="primary"
              >
                Download the command-line tool
              </Button>
            </div>
          </Form>
        </Modal>
      </React.Fragment>
    );
  }
}

export default LinkSitesModal;
