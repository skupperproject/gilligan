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
import { Split, SplitItem } from "@patternfly/react-core";
import LinkedSitesTable from "./linkedSitesTable";
import GetTokenModal from "./getTokenModal";
import UseTokenModal from "./useTokenModal";

class LinkedSitesPage extends React.Component {
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

  getUniqueId = () => new Date().getTime();

  update = () => {
    if (this.tableRef && this.tableRef.update) {
      this.tableRef.update();
    }
  };

  render() {
    return (
      <div className="sk-siteinfo-page-wrapper">
        <Split gutter="md">
          <SplitItem>
            <h1>Links for this site</h1>
          </SplitItem>
          <SplitItem isFilled></SplitItem>
          <SplitItem>
            <div className="sk-site-actions">
              <GetTokenModal {...this.props} targetId="SKUSETOKEN2" />
              <UseTokenModal
                {...this.props}
                title="Use a token"
                direction="up"
                targetId="SKUSETOKEN2"
              />
            </div>
          </SplitItem>
        </Split>

        <LinkedSitesTable ref={(el) => (this.tableRef = el)} {...this.props} />
      </div>
    );
  }
}

export default LinkedSitesPage;
