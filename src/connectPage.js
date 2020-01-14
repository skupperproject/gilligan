import React from "react";
import {
  Brand,
  PageSection,
  PageSectionVariants,
  TextContent,
  Text
} from "@patternfly/react-core";
import { withRouter } from "react-router-dom";
import ConnectForm from "./connect-form";
const avatarImg = require("./assets/skupper.svg");

class ConnectPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = { showForm: true };
  }

  handleConnectCancel = () => {
    this.setState({ showForm: false });
  };

  render() {
    const { showForm } = this.state;
    const { from } = this.props.location.state || { from: { pathname: "/" } };
    return (
      <PageSection variant={PageSectionVariants.light} className="connect-page">
        {showForm ? (
          <ConnectForm
            prefix="form"
            handleConnect={this.props.handleConnect}
            handleConnectCancel={this.handleConnectCancel}
            service={this.props.service}
            fromPath={from.pathname}
            isConnected={this.props.isConnected}
          />
        ) : (
          <React.Fragment />
        )}
        <div className="left-content">
          <TextContent>
            <Text component="h1" className="console-banner">
              Skipper
            </Text>
          </TextContent>
          <TextContent>
            <Text component="p">
              This tool will visualize a Skupper network.
            </Text>
            <Text component="p">
              Log into the network with the host and port of a Skupper
              installation in any of your cluster's namespaces.
            </Text>
          </TextContent>
          <div className="skupper-logo" />
        </div>
      </PageSection>
    );
  }
}

withRouter(ConnectPage);
export default ConnectPage;
