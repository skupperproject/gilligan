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
import { Alert } from "@patternfly/react-core";
import LinkedSitesTable from "./linkedSitesTable";

import { ALERT_TIMEOUT } from "../../qdrService";
class LinkedSitesPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = { alerts: [] };
  }

  componentDidMount = () => {
    this.mounted = true;
  };

  componentWillUnmount = () => {
    this.mounted = false;
  };

  getUniqueId = () => new Date().getTime();

  addAlert = (alertProps) => {
    if (!this.mounted) return;
    alertProps.key = this.getUniqueId();
    this.setState({ alerts: [...this.state.alerts, alertProps] });
  };

  update = () => {};

  render() {
    const { alerts } = this.state;

    return (
      <React.Fragment>
        {alerts.map(
          ({
            title,
            variant,
            isLiveRegion,
            ariaLive,
            ariaRelevant,
            ariaAtomic,
            key,
          }) => (
            <Alert
              className="sk-alert"
              variant={variant}
              title={title}
              timeout={ALERT_TIMEOUT}
              isLiveRegion={isLiveRegion}
              aria-live={ariaLive}
              aria-relevant={ariaRelevant}
              aria-atomic={ariaAtomic}
              key={key}
            />
          )
        )}
        <LinkedSitesTable {...this.props} addAlert={this.addAlert} />{" "}
      </React.Fragment>
    );
  }
}

export default LinkedSitesPage;
