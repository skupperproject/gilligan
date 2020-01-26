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
import {
  PageSection,
  PageSectionVariants,
  TextContent,
  Text
} from "@patternfly/react-core";

import {
  Card,
  CardBody,
  CardHead,
  CardHeader,
  Gallery,
  GalleryItem
} from "@patternfly/react-core";
import { CubesIcon } from "@patternfly/react-icons";
import CardHealth from "./cardHealth";
import avatarImg from "./assets/skupper.svg";
import { safePlural } from "./qdrGlobals";
import ListToolbar from "./listToolbar";
import { utils } from "./amqp/utilities";

// make sure you've installed @patternfly/patternfly
class ListPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      cardSize: "compact"
    };
  }

  subNodes = cluster =>
    this.props.service.VAN.serviceTypes.filter(st => st.cluster === cluster)
      .length;

  handleChangeSize = event => {
    this.setState({ cardSize: event.target.id });
  };

  bodyLine = (expanded, prop, cluster) => (
    <div className="body-line">
      {expanded ? (
        <span className="body-line-prompt">{utils.Icap(prop)}</span>
      ) : (
        ""
      )}
      <span className="body-line-value">{cluster[prop]}</span>
    </div>
  );

  cardBodies = cluster => {
    const expanded = this.state.cardSize === "expanded";
    const bodies = [
      <CardBody key="location">
        {this.bodyLine(expanded, "location", cluster)}
      </CardBody>,
      <CardBody key="provider">
        {this.bodyLine(expanded, "provider", cluster)}
      </CardBody>
    ];
    if (expanded) {
      bodies.push(
        <CardBody key="zone">
          {this.bodyLine(expanded, "zone", cluster)}
        </CardBody>
      );
      bodies.push(
        <CardBody key="namespaces">
          {this.bodyLine(expanded, "namespaces", cluster)}
        </CardBody>
      );
    }
    return bodies;
  };
  render() {
    const { clusters } = this.props.service.VAN;
    const { cardSize } = this.state;
    return (
      <React.Fragment>
        <PageSection variant={PageSectionVariants.light}>
          <ListToolbar
            size={cardSize}
            handleChangeSize={this.handleChangeSize}
          />
        </PageSection>
        <PageSection className="list-section">
          <Gallery gutter="md">
            {clusters.map((c, i) => (
              <GalleryItem key={i}>
                <Card isHoverable isCompact className="list-card">
                  <CardHead>
                    <div className="card-cluster-header">
                      <i className="pf-icon pf-icon-cluster"></i>
                      <span>
                        <CardHealth cluster={c} />
                        {c.name}
                      </span>
                    </div>
                  </CardHead>
                  <CardBody>
                    {this.subNodes(i)} {safePlural(this.subNodes(i), "service")}
                  </CardBody>
                  {this.cardBodies(c)}
                </Card>
              </GalleryItem>
            ))}
          </Gallery>
        </PageSection>
      </React.Fragment>
    );
  }
}

export default ListPage;
