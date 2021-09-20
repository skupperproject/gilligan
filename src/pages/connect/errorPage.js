import React from "react";
import { LoginPage } from "@patternfly/react-core";
import {
  Bullseye,
  Button,
  List,
  ListItem,
  TextContent,
  Text,
  TextVariants,
} from "@patternfly/react-core";
import "./connect.css";
import brandImg from "../../assets/skupper.svg";

class ErrorPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    return (
      <LoginPage
        loginTitle={this.props.title}
        footerListVariants="inline"
        brandImgSrc={brandImg}
        brandImgAlt="Gilligan logo"
        backgroundImgAlt="Images"
        textContent="A Skupper network management and visualization tool."
      >
        <Bullseye>
          <div className="creating-wrapper">
            <TextContent>
              <Text className="creating-message" component={TextVariants.p}>
                {this.props.error}
              </Text>
            </TextContent>
            {this.props.reason === "updating" && (
              <TextContent>
                <Text component={TextVariants.p}>
                  Skupper network is adjusting to a new or removed link between
                  sites. One moment please.
                </Text>
              </TextContent>
            )}
            {this.props.reason !== "updating" && (
              <div id="sk-try-list">
                <TextContent>
                  <Text component={TextVariants.p}>
                    Here are some things to try:
                  </Text>
                </TextContent>
                <List>
                  <ListItem>
                    <Button
                      id="sk-try-again"
                      variant="primary"
                      onClick={this.props.handleTryAgain}
                    >
                      Try again
                    </Button>
                  </ListItem>
                  <ListItem>
                    To help diagnose the problem
                    <pre>{`curl ${window.location.protocol}//${window.location.host}/DATA`}</pre>
                    and report the results to the skupper support site.
                  </ListItem>
                </List>
              </div>
            )}
          </div>
        </Bullseye>
      </LoginPage>
    );
  }
}

export default ErrorPage;
