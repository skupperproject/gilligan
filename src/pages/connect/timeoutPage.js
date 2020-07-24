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

class TimedoutPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    return (
      <LoginPage
        loginTitle="Connect timed out"
        footerListVariants="inline"
        brandImgSrc={brandImg}
        brandImgAlt="Gilligan logo"
        backgroundImgAlt="Images"
        textContent="A Skupper network management and visualization tool."
      >
        <Bullseye>
          <div className="creating-wrapper">
            <TextContent>
              <Text component={TextVariants.h3}>Timed out</Text>
            </TextContent>
            <TextContent>
              <Text className="creating-message" component={TextVariants.p}>
                The request to fetch the data has timed out.
              </Text>
            </TextContent>
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
                  To help diagnose the problem, go to
                  <div>{`${window.location.protocol}//${window.location.host}/DATA`}</div>
                  and report the results to the skupper support site.
                </ListItem>
              </List>
            </div>
          </div>
        </Bullseye>
      </LoginPage>
    );
  }
}

export default TimedoutPage;
