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
        const token = results; //JSON.stringify(results, null, 2);
        navigator.clipboard.writeText(token).then(
          (s) => {
            console.log("Copy to clipboard worked. Received token");
            console.log(token);
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

/*
{
    "kind": "Secret",
    "apiVersion": "v1",
    "metadata": {
        "name": "vXIU8ECK990LcLGECEiwxXHb",
        "creationTimestamp": null,
        "labels": {
            "skupper.io/type": "token-claim"
        },
        "annotations": {
            "skupper.io/generated-by": "2d20d07c-cfca-4c37-8aea-823b7e56b8f8",
            "skupper.io/url": "https://claims-default.grs1-153f1de160110098c1928a6c05e19444-0000.eu-gb.containers.appdomain.cloud:443/474b7d0c-e3e7-11eb-a8f2-fe772f9330c2"
        }
    },
    "data": {
        "ca.crt": "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUREakNDQWZhZ0F3SUJBZ0lSQU1KYk12RFpsVWdXOFp1N00rQTdOd2t3RFFZSktvWklodmNOQVFFTEJRQXcKR2pFWU1CWUdBMVVFQXhNUGMydDFjSEJsY2kxemFYUmxMV05oTUI0WERUSXhNRGN4TXpBNU5ETXlNRm9YRFRJMgpNRGN4TWpBNU5ETXlNRm93R2pFWU1CWUdBMVVFQXhNUGMydDFjSEJsY2kxemFYUmxMV05oTUlJQklqQU5CZ2txCmhraUc5dzBCQVFFRkFBT0NBUThBTUlJQkNnS0NBUUVBdHlUcHB2dFIyYjI4Z3Q4M0kveHd5ZnoyNnFjMlhzS0oKVzJCVnpaZGRHYVU1TURPOWt2Mks0UUNWNnVZajN2enhaTHVTejE5eWhKOFJSOEEzMXRwb2NTcVRpb05wa3psVwozOFhOd0V1R21PT1RacUpBejdnZS9CQXpRTEhnU0dzNGh0V1NWcFF6MXE5eU9mM3VVTnRJNEp3aDlzNktzUm9YClQra05KZ3FTZ3RQNUpham5DWGlwcWx1ckhHUFRoRFYydWVldlVkbEZWSnZRZ1d5ZGxRaHB3elFzVE1YTVhHaHQKVVJzaGNESXdlMlc4dGNDWnFRSjlNYUkwUXhlSmRObTR3MEErYzBBTElWbDQ4S2JPSnFpUmJzcGZkVnNBWXk2NwpFckJabHZCekNyZnZXQTIralBvNmlUVVFZY3ErT1FmUldBd1NsbWV2eDJ6RHVvcCs0N2NpVndJREFRQUJvMDh3ClRUQU9CZ05WSFE4QkFmOEVCQU1DQXFRd0hRWURWUjBsQkJZd0ZBWUlLd1lCQlFVSEF3RUdDQ3NHQVFVRkJ3TUMKTUE4R0ExVWRFd0VCL3dRRk1BTUJBZjh3Q3dZRFZSMFJCQVF3QW9JQU1BMEdDU3FHU0liM0RRRUJDd1VBQTRJQgpBUUIwU1lyZ3B3SFExL0FaVzk3a3RLQitiaERCVTU4WWMwb1YvQ0E1L0FpOFpqS1o3eHpQdnA2TWVvWGhSWCsrCmtSdnZ1RTY5MEIvTU9UdXM4bnBwRUw4UUhpUERuTXZNMlloMHFxUTNOTUR0WG85NzAxWklGTkhBSFoxM293bU4KMEQ5N0llOThScTJrdFRjV05yOURpR2xXMTNKc2QrLzRja0VybFBOTnMyNldpSjMvZjh2cU5VVVlLbTl2eEJzUgptOXc2M1lwanFUZFBsQnJlNlFvYWNKK3RwWXlObmdxU3Z0ZVV2S0M2dUZxVmtzTmN1dmsyNzRaMys5SVY3WVI1ClFsdWxuenlMZTBGZXI4ZVBkaU1BOEl1WDRqSGI1cHora2p2Q29hbFNkRHV6VXYxdjZYWTFnRWx3QWtpbHBMalgKSzZEREQ5bHdGdklkQkdOUTJldEhRa1R4Ci0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K",
        "password": "VDhVeDRnMDZTbk5kRjc0MGNmMThYa1g1ZXNJclZBUzNIUkhOTXZlYmg2b3lDc0pSdlBxbENZdGxuMFphTld3VXpxbWNiT1VNd1dqZmVGaHU3ZHVEaERvakkzYXNwUWRWeXlKVHJKZmpFeDNXWlVRdDJiVTYwZEZNTGZjN29LN2w="
    }
}
*/
