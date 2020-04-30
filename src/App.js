/*
Licensed to the Apache Software Foundation (ASF) under one
or more contributor license agreements.  See the NOTICE file
distributed with this work for additional information
regarding copyright ownership.  The ASF licenses this file
to you under the Apache License, Version 2.0 (the
"License"); you may not use this file except in compliance
with the License.  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing,
software distributed under the License is distributed on an
"AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, either express or implied.  See the License for the
specific language governing permissions and limitations
under the License.
*/

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
          <Route path="/" render={(props) => <PageLayout {...props} />} />
        </div>
      </Router>
    );
  }
}

export default App;
