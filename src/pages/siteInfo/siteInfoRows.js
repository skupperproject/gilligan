import { utils } from "../../utilities";

export const linkedSitesFields = [
  { title: "Name", field: "Name" },
  { title: "Status", field: "Status" },
  { title: "Type", field: "Site type" },
  { title: "Cost", field: "Cost" },
  { title: "Linked", field: "Linked" },
];

export const SiteInfoRows = (emptyRows, service, includeCurrent = true) => {
  const dataKey = "links";
  return new Promise((resolve) => {
    service.getSiteInfo().then((siteInfo) => {
      let data = siteInfo[dataKey];
      if (includeCurrent) {
        data = [
          {
            Name: siteInfo.site_name,
            site_id: siteInfo.site_id,
            Status: "OK",
            "Site type": siteInfo["Site type"],
            Cost: "",
          },
          ...data,
        ];
      }

      // add cardData so the sub table viewer has the correct info
      const rows = data.map((row) => {
        row.cardData = {
          site_name: row.Name,
          site_id: row.site_id,
          nodeType: "cluster",
        };
        return row;
      });

      rows.forEach((row) => {
        if (row.Linked !== undefined) {
          if (row.Linked === 0) {
            row.Linked = "Never";
          } else {
            row.Linked = utils.convertDate(row.Linked, "present");
          }
        }
      });

      resolve(siteInfo[dataKey].length > 0 ? rows : emptyRows);
    });
  });
};
