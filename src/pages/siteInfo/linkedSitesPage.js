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
import SiteInfoTable from "./siteInfoTable";

class LinkedSitesPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
    this.actions = [
      {
        title: "Revoke",
        onClick: (event, rowId, rowData, extra) =>
          console.log("clicked on revoke on row: ", rowId),
      },
    ];
    this.columns = [
      "Name",
      "Status",
      "Site type",
      "Cost",
      { name: "Linked", dateType: "present" },
    ];
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
      <SiteInfoTable
        {...this.props}
        actions={this.actions}
        dataKey="linked_sites"
        columns={this.columns}
      />
    );
  }
}

export default LinkedSitesPage;
