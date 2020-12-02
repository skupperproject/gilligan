import { QDRService } from "./qdrService";

console.error = jest.fn();
console.warn = jest.fn();

it("can get DATA", () => {
  const service = new QDRService();
  return service.connect().then(
    (data) => {
      expect(data.deploymentLinks.length === 14).toBeTruthy();
      expect(data.sites.length === 3).toBeTruthy();
      expect(data.services.length === 10).toBeTruthy();
    },
    (error) => {
      throw error;
    }
  );
});
