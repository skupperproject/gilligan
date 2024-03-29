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
import DeploymentTable from "./deploymentTable";

class ExposePage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  update = () => {
    if (this.tableRef && this.tableRef.update) {
      this.tableRef.update();
    }
  };

  render() {
    return (
      <div className="sk-siteinfo-page-wrapper">
        <h2>Exposing deployments on the network</h2>
        <div className="sk-sub-text">
          Before a deployment is available from linked sites, it must be exposed
          on the Skupper network.
        </div>
        <h2>Deployments available on this site</h2>
        <DeploymentTable ref={(el) => (this.tableRef = el)} {...this.props} />
      </div>
    );
  }
}

export default ExposePage;
