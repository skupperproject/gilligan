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
import {
  Bullseye,
  TextContent,
  Text,
  TextVariants,
} from "@patternfly/react-core";

import { CogIcon } from "@patternfly/react-icons";

class PleaseWait extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    return (
      <Bullseye>
        <div className="creating-wrapper">
          <div id="CogWrapper">
            <CogIcon
              id="CogMain"
              className="spinning-clockwise"
              color="#AAAAAA"
            />
            <CogIcon
              id="CogUpper"
              className="spinning-cclockwise"
              color="#AAAAAA"
            />
            <CogIcon
              id="CogLower"
              className="spinning-cclockwise"
              color="#AAAAAA"
            />
          </div>
          <TextContent>
            <Text component={TextVariants.h3}>Fetching data</Text>
          </TextContent>
          <TextContent>
            <Text className="creating-message" component={TextVariants.p}>
              The data for the service network is being retrieved. One moment
              please...
            </Text>
          </TextContent>
        </div>
      </Bullseye>
    );
  }
}

export default PleaseWait;
