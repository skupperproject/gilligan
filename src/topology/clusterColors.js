import * as d3 from "d3";

export const clusterColor = index => {
  return [
    "#E5F2FF",
    "#FFF2E5",
    "#E5FFF2",
    "#F2FFE5",
    "#F5DEB3",
    "#F5DEF5",
    "#F5DEDE",
    "#F5F5DE",
    "#F2E5FF",
    "#B3F5DE"
  ][index % 10];
};

export const darkerColor = index => {
  return d3.rgb(clusterColor(index)).darker(2);
};
