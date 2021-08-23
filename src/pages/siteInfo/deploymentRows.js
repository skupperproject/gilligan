import React from "react";
import { Switch } from "@patternfly/react-core";

import { utils } from "../../utilities";
const UNEXPOSED_VALUE = "No";

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
      labelOff="Not Exposed"
      isChecked={value !== this.unexposedValue}
      onChange={(event) => this.expose(value, extraInfo)}
    />
  );

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
    if (extraInfo.rowData.data.Exposed !== this.unexposedValue) {
      return detailsLink(value, extraInfo);
    }
    return <span>{value}</span>;
  };

  // Columns to display in the services table
  // This needs to be declared after the expose and isDetailLink variables are defined
  DeploymentFields = [
    { title: "Name", field: "Name", isDetailLink: this.isDetailLink },
    {
      title: "Exposed",
      field: "Exposed",
      formatter: this.ExposeButton,
    },
    {
      title: "Age",
      field: "Exposed",
      formatter: this.age,
    },
    { title: "Port", field: "Port" },
    { title: "Protocol", field: "Protocol" },
  ];

  fetch = (emptyRows, VANservice, formatterData) => {
    const dataKey = "services";
    this.showExpose = formatterData.expose;
    this.showUnExpose = formatterData.unExpose;

    return new Promise((resolve) => {
      VANservice.getSiteInfo().then((siteInfo) => {
        let data = siteInfo[dataKey];

        const rows = data.map((row) => {
          // add cardData so the sub table viewer has the correct info
          const deployment = VANservice.VAN.deployments.find(
            (d) =>
              d.service.address === row.Name &&
              d.site.site_id === siteInfo.site_id
          );
          const service = VANservice.VAN.services.find(
            (s) => s.address === row.Name
          );
          if (deployment && service) {
            row.cardData = { ...service };
            row.cardData.name = row.Name;
            row.cardData.shortName = row.Name;
            row.cardData.nodeType = "deployment";
            row.cardData.cluster = VANservice.VAN.sites.find(
              (s) => s.site_id === siteInfo.site_id
            );
          }
          if (row.Exposed === 0) {
            row.Exposed = "unknown";
          } else if (row.Exposed === false || row.Exposed === undefined) {
            row.Exposed = this.unexposedValue;
          } else {
            row.Exposed = utils.convertDate(row.Exposed, "past");
          }
          return row;
        });

        resolve(siteInfo[dataKey].length > 0 ? rows : emptyRows);
      });
    });
  };
}
