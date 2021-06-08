import React from "react";
import { Button } from "@patternfly/react-core";
import { utils } from "../../utilities";

export class DeploymentRows {
  // called when the expose button is clicked
  expose = (value, extraInfo) => {
    this.showExpose(extraInfo.rowData);
  };

  // returns the cell value for the exposed column
  ExposeButton = (value, extraInfo) => {
    if (value === "No") {
      return (
        <Button
          data-testid={value}
          variant="primary"
          onClick={(event) => this.expose(value, extraInfo)}
        >
          Expose
        </Button>
      );
    } else {
      return <span>{value}</span>;
    }
  };

  // determine if the Name column should be link to the details page
  isDetailLink = (value, extraInfo, detailsLink) => {
    if (extraInfo.rowData.data.Exposed !== "No") {
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
    { title: "Port", field: "Port" },
    { title: "Protocol", field: "Protocol" },
  ];

  fetch = (emptyRows, VANservice, formatterData) => {
    const dataKey = "deployments";
    this.showExpose = formatterData.expose;

    return new Promise((resolve) => {
      VANservice.getSiteInfo().then((siteInfo) => {
        let data = siteInfo[dataKey];

        const rows = data.map((row) => {
          // add cardData so the sub table viewer has the correct info
          // find the service for this row
          const service = VANservice.VAN.services.filter(
            (s) => s.address === row.Name
          );
          row.cardData = { ...service[0] };
          row.cardData.name = row.Name;
          row.cardData.shortName = row.Name;
          row.cardData.nodeType = "service";
          if (row.Exposed === 0) {
            row.Exposed = "unknown";
          } else if (row.Exposed === false || row.Exposed === undefined) {
            row.Exposed = "No";
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
