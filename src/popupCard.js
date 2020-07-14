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

import { Card, CardBody, CardHeader } from "@patternfly/react-core";
import CardHealth from "./cardHealth";
import { utils } from "./utilities";

class PopupCard extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }
  bodyLine = (obj, prop) => {
    let property = prop.getFn ? prop.getFn(obj) : obj[prop];
    if (typeof property === "boolean") {
      property = property.toString();
    }
    const title = this.cardTitle(obj, prop);
    return (
      <div className="body-line">
        <span className="body-line-prompt">{utils.Icap(title)}</span>
        <span className="body-line-value">{property}</span>
      </div>
    );
  };

  attrExists = (obj, attr) => {
    if (typeof attr === "string") return obj[attr];
    if (attr.getFn) {
      const v = attr.getFn(obj);
      return v !== undefined ? true : false;
    }
  };

  cardTitle = (obj, attr) => {
    if (typeof attr === "string") return attr;
    if (typeof attr.title === "string") return attr.title;
    if (typeof attr.title === "function") return attr.title(obj);
  };

  cardBodies = (obj) => {
    const expanded = this.props.cardSize === "expanded";
    let attrs = this.props.card.popupInfo.compact;
    if (expanded) {
      attrs = [...attrs, ...this.props.card.popupInfo.expanded];
    }
    let bodies = attrs.map((attr, i) => {
      const exists = this.attrExists(obj, attr);
      return (
        exists && (
          <CardBody key={`${this.cardTitle(obj, attr)}-${i}`}>
            {this.bodyLine(obj, attr)}
          </CardBody>
        )
      );
    });
    return bodies;
  };

  cardIcon = (card) => {
    if (typeof card.icon === "string") {
      return <i className={`pf-icon pf-icon-${card.icon}`}></i>;
    }
    if (typeof card.icon === "object") {
      return card.icon;
    }
  };
  cardName = (data, card) => {
    if (data.address) {
      return utils.shortName(data.address);
    } else if (data.site_name) {
      return data.site_name;
    }
    if (card.getTitle) {
      return card.getTitle(data);
    }
  };
  render() {
    let { cardService, card, hideBody, hideHeading } = this.props;
    return (
      <Card
        isHoverable
        isCompact
        className={`list-card service-card ${
          this.props.inline ? "inline" : "popup"
        }`}
      >
        {!hideHeading && (
          <CardHeader>
            <div className="card-cluster-header">
              {this.cardIcon(card)}
              <span className="iconSeparator"></span>
              <span>{this.cardName(cardService, card)}</span>
            </div>
          </CardHeader>
        )}
        {!hideBody && (
          <CardBody>
            <span className="body-line-prompt">Health</span>
            <CardHealth cluster={cardService} />
          </CardBody>
        )}
        {!hideBody && this.cardBodies(cardService)}
      </Card>
    );
  }
}

export default PopupCard;
