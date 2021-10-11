import React from "react";
import { Switch } from "@patternfly/react-core";

import { utils } from "../../utilities";
const UNEXPOSED_VALUE = false;

export class DeploymentRows {
  // called when the expose button is clicked
  expose = (value, extraInfo) => {
    if (value === this.unexposedValue) {
      this.showExpose(extraInfo.rowData);
    } else {
      this.showUnExpose(extraInfo.rowData);
    }
  };

  // returns the cell value for the exposed column
  ExposeButton = (value, extraInfo) => (
    <Switch
      data-testid={value}
      label="Exposed"
      labelOff="Not exposed"
      isChecked={value !== this.unexposedValue}
      onChange={(event) => this.expose(value, extraInfo)}
    />
  );

  fixProtocol = (value) => utils.protocol(value);

  // make the magic value accessible
  unexposedValue = UNEXPOSED_VALUE;

  // what to display in the Age column
  age = (value, extraInfo) => {
    if (value !== this.unexposedValue) {
      return <span>{value}</span>;
    } else {
      return <span></span>;
    }
  };

  // determine if the Name column should be a link to the details page
  isDetailLink = (value, extraInfo, detailsLink) => {
    if (extraInfo.rowData.data.exposed !== this.unexposedValue) {
      return detailsLink(value, extraInfo);
    }
    return <span>{value}</span>;
  };

  // Columns to display in the services table
  // This needs to be declared after the expose and isDetailLink variables are defined
  DeploymentFields = [
    { title: "Name", field: "name", isDetailLink: this.isDetailLink },
    {
      title: "Exposed",
      field: "exposed",
      formatter: this.ExposeButton,
    },
    /*
    {
      title: "Age",
      field: "Exposed",
      formatter: this.age,
    },
    */
    { title: "Port", field: "port" },
    { title: "Protocol", field: "protocol", formatter: this.fixProtocol },
  ];

  fetch = (emptyRows, VANservice, formatterData) => {
    const dataKey = "services";
    this.showExpose = formatterData.expose;
    this.showUnExpose = formatterData.unExpose;

    return new Promise((resolve) => {
      VANservice.getSiteInfo().then((siteInfo) => {
        const filtered = siteInfo[dataKey].filter(
          (service) => service.exposed !== undefined
        );
        const rows = filtered.map((row) => {
          // add cardData so the sub table viewer has the correct info
          const deployment = VANservice.VAN.deployments.find(
            (d) =>
              d.service.address === row.name &&
              d.site.site_id === siteInfo.site_id
          );
          const service = VANservice.VAN.services.find(
            (s) => s.address === row.name
          );
          if (deployment && service) {
            row.cardData = { ...service };
            row.cardData.name = row.name;
            row.cardData.shortName = row.name;
            row.cardData.nodeType = "deployment";
            row.cardData.cluster = VANservice.VAN.sites.find(
              (s) => s.site_id === siteInfo.site_id
            );
          }
          if (row.exposed === 0) {
            row.exposed = "unknown";
          } else if (row.exposed === false || row.exposed === undefined) {
            row.exposed = this.unexposedValue;
          } else {
            row.exposed = utils.convertDate(row.exposed, "past");
          }
          return row;
        });

        resolve(siteInfo[dataKey].length > 0 ? rows : emptyRows);
      });
    });
  };
}
