import { render, screen } from "@testing-library/react";
import SiteInfoPage from "./siteInfoPage";

import { QDRService } from "../../qdrService";

const service = new QDRService();

test("renders site info page", () => {
  Object.assign(navigator, {
    clipboard: {
      readText: () => Promise.resolve(jest.fn()),
    },
  });
  const setOptions = jest.fn();
  return service.connect().then(async () => {
    const props = { view: "service", service, setOptions };
    render(<SiteInfoPage {...props} />);
  });
});
