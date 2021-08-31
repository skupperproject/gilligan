import { render, screen } from "@testing-library/react";
import SiteInfoPage from "./siteInfoPage";

import { QDRService } from "../../qdrService";

const service = new QDRService();

test("renders site info page", () => {
  Object.defineProperty(navigator, "clipboard", {
    value: {
      readText: jest.fn(),
    },
  });
  const setOptions = jest.fn();
  return service.connect().then(async () => {
    const props = { view: "service", service, setOptions };
    render(<SiteInfoPage {...props} />);
  });
});
