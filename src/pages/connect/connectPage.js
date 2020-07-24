import React from "react";
import brandImg from "../../assets/skupper.svg";
import { LoginPage } from "@patternfly/react-core";

import { withRouter } from "react-router-dom";
import PleaseWait from "./pleaseWait";

class ConnectPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    return (
      <LoginPage
        loginTitle="Connect"
        footerListVariants="inline"
        brandImgSrc={brandImg}
        brandImgAlt="Gilligan logo"
        backgroundImgAlt="Images"
        textContent="A Skupper network management and visualization tool."
      >
        <PleaseWait />
      </LoginPage>
    );
  }
}

withRouter(ConnectPage);
export default ConnectPage;
