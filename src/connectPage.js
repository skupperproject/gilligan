import React from "react";
import brandImg from "./assets/gilligan.png";
import {
  LoginFooterItem,
  LoginPage,
  BackgroundImageSrc,
  ListItem
} from "@patternfly/react-core";

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

class _ConnectPage extends React.Component {
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
              Gilligan
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
        </div>
      </PageSection>
    );
  }
}

class ConnectPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showHelperText: false,
      usernameValue: "",
      isValidUsername: true,
      passwordValue: "",
      isValidPassword: true,
      isRememberMeChecked: false
    };

    this.onLoginButtonClick = event => {
      event.preventDefault();
      this.setState({ isValidUsername: !!this.state.usernameValue });
      this.setState({ isValidPassword: !!this.state.passwordValue });
      this.setState({
        showHelperText: !this.state.usernameValue || !this.state.passwordValue
      });
    };
  }

  handleConnectCancel = () => {
    this.setState({ showForm: false });
  };

  render() {
    const { from } = this.props.location.state || { from: { pathname: "/" } };

    const listItem = (
      <React.Fragment>
        <ListItem>
          <LoginFooterItem href="#">Terms of Use </LoginFooterItem>
        </ListItem>
        <ListItem>
          <LoginFooterItem href="#">Help</LoginFooterItem>
        </ListItem>
        <ListItem>
          <LoginFooterItem href="#">Privacy Policy</LoginFooterItem>
        </ListItem>
      </React.Fragment>
    );

    const loginForm = (
      <ConnectForm
        prefix="form"
        handleConnect={this.props.handleConnect}
        handleConnectCancel={this.handleConnectCancel}
        service={this.props.service}
        fromPath={from.pathname}
        isConnected={this.props.isConnected}
      />
    );

    const images = {
      [BackgroundImageSrc.lg]: "./assets/gilligan.png"
    };

    return (
      <LoginPage
        footerListVariants="inline"
        brandImgSrc={brandImg}
        brandImgAlt="Gilligan logo"
        backgroundImgSrc={images}
        backgroundImgAlt="Images"
        textContent="Gilligan is a skupper network management/visualization tool."
      >
        {loginForm}
      </LoginPage>
    );
  }
}

withRouter(ConnectPage);
export default ConnectPage;
