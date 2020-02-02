import React from "react";
import brandImg from "./assets/skupper.svg";
import { LoginPage, BackgroundImageSrc } from "@patternfly/react-core";

import { withRouter } from "react-router-dom";
import PleaseWait from "./pleaseWait";

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
    const loginForm = <PleaseWait />;

    const images = {
      [BackgroundImageSrc.lg]: "./assets/skupper.svg",
      [BackgroundImageSrc.sm]: "./assets/skupper.svg",
      [BackgroundImageSrc.sm2x]: "./assets/skupper.svg",
      [BackgroundImageSrc.xs]: "./assets/skupper.svg",
      [BackgroundImageSrc.xs2x]: "./assets/skupper.svg"
    };

    return (
      <LoginPage
        loginTitle="Connect"
        footerListVariants="inline"
        brandImgSrc={brandImg}
        brandImgAlt="Gilligan logo"
        backgroundImgSrc={images}
        backgroundImgAlt="Images"
        textContent="A skupper network management/visualization tool."
      >
        {loginForm}
      </LoginPage>
    );
  }
}

withRouter(ConnectPage);
export default ConnectPage;
