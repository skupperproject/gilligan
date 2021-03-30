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

import React from "react";
import ServiceTable from "./serviceTable"

class ExposePage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  componentDidMount = () => {
    this.mounted = true;
  };

  componentWillUnmount = () => {
    this.mounted = false;
  };

  componentDidUpdate = () => {};

  update = () => {};

  render() {
    return (
      <div className="sk-siteinfo-page-wrapper">
    <h2>Exposing services on the network</h2>
    <div className="sk-sub-text">
      Paul will do his stuff here.
      <div className="sk-command-line-example">
        $ skupper expose deployment/
        <span className="sk-command-line">{"<deployment-name>"}</span>
      </div>
    </div>
    <h2>Connecting to services on the network</h2>
    <div className="sk-sub-text">
      Paul will supply some reasonable text describing this table.
      <ServiceTable />
    </div>
      </div>
    )
}
}

export default ExposePage;
