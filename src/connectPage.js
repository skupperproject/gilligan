import React from "react";
import {
  Brand,
  PageSection,
  PageSectionVariants,
  TextContent,
  Text
} from "@patternfly/react-core";
import ConnectForm from "./connect-form";
const avatarImg = require("./assets/pug.png");

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
            fromPath={from.pathname}
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
              This console provides information about skupper installations
              across multiple namespaces and/or cluster.
            </Text>
          </TextContent>
          <Brand src={avatarImg} alt="Patternfly Logo" />
        </div>
      </PageSection>
    );
  }
}

export default ConnectPage;
