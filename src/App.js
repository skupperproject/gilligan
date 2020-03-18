import React, { Component } from "react";
import { HashRouter as Router, Route } from "react-router-dom";
import "@patternfly/patternfly/patternfly.css";
import "@patternfly/patternfly/patternfly-addons.css";

import "patternfly/dist/css/patternfly.css";
import "patternfly/dist/css/patternfly-additions.css";

import "@patternfly/patternfly/components/Nav/nav.css";
import "./App.css";
import PageLayout from "./layout";

class App extends Component {
  state = {};

  render() {
    return (
      <Router>
        <div className="App">
          <Route path="/" render={props => <PageLayout {...props} />} />
        </div>
      </Router>
    );
  }
}

export default App;
