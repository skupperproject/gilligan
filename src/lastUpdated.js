/*
 * Copyright 2020 Red Hat Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import React from "react";
import { Text } from "@patternfly/react-core";
import { getDuration, timeAgo } from "./utilities";

class LastUpdated extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      elapsed: "",
    };
    this.lastUpdated = new Date();
  }

  componentDidMount = () => {
    this.timer = setInterval(this.showElapsed, 1000);
  };
  componentWillUnmount = () => {
    clearInterval(this.timer);
  };

  // called when data is updated
  update = () => {
    this.lastUpdated = new Date();
  };

  // called internally every second
  showElapsed = () => {
    const secondsAgo = Math.floor((new Date() - this.lastUpdated) / 1000);
    const { epoch } = getDuration(secondsAgo);
    // don't show anything if updated within the last minute
    const elapsed =
      epoch === "second" ? "" : `Updated ${timeAgo(this.lastUpdated)}`;
    this.setState({ elapsed });
  };

  render() {
    return <Text className="status-text">{this.state.elapsed}</Text>;
  }
}

export default LastUpdated;
