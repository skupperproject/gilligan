import React from "react";
import { utils } from "../../utilities";
export const LINKDOWN_VALUE = "Disconnected";

export class LinksRows {
  // determine if the Name column should be a link to the details page
  isDetailLink = (value, extraInfo, detailsLink) => {
    if (extraInfo.rowData.data.cardData) {
      return detailsLink(value, extraInfo);
    }

    return <span>{value}</span>;
  };

  // Columns to display in the links/linked sites table
  LinkFields = [
    { title: "Name", field: "Name", isDetailLink: this.isDetailLink },
    {
      title: "Status",
      field: "Connected",
    } /*
    {
      title: "Configured",
      field: "Configured",
    },*/,
    {
      title: "Cost",
      field: "Cost",
    },
    { title: "Created", field: "Created", dateType: "past" },
  ];

  // called by tableViewer to get the rows
  fetch = (emptyRows, VANservice, formatterData, dataFilter) => {
    const dataKey = "links";
    this.showUnlink = formatterData.unlink;

    return new Promise((resolve) => {
      VANservice.getSiteInfo().then((siteInfo) => {
        let data = siteInfo[dataKey];

        if (dataFilter) {
          data = dataFilter(data);
        }
        const rows = data.map((row) => {
          // add cardData so the sub table viewer has the correct info
          // find the service for this row
          const parts = row.Url.split(":");
          const url = parts[0];
          const sites = VANservice.VAN.sites.filter((s) => s.url === url);
          if (sites.length > 0) {
            const site = sites[0];
            row.cardData = { ...site };
            row.cardData.name = site.site_name;
            row.cardData.shortName = utils.shortName(site.site_name);
            row.cardData.nodeType = "cluster";
          }
          if (row.Linked) {
            row.Linked = utils.convertDate(row.Linked, "date");
          }
          if (row.Connected) {
            if (sites.length > 0) {
              const site_name = sites[0].site_name;
              row.Connected = `Connected to ${site_name}`;
            } else {
              row.Connected = "Connected but not configured";
            }
          } else {
            row.Connected = "Not connected";
          }
          row.Configured = row.Configured ? "True" : "";

          if (row.Created) {
            const date = new Date(row.Created);
            row.Created = utils.convertDate(date, "past");
          }
          return row;
        });
        resolve(siteInfo[dataKey].length > 0 ? rows : emptyRows);
      });
    });
  };
}
