import { planMonthlyForSites } from "./billing.service";

const site = { monthlyAmount: "1500.00", includedSites: 1, extraSiteMonthlyAmount: null };
const network = { monthlyAmount: "4500.00", includedSites: 3, extraSiteMonthlyAmount: "950.00" };
const assure = { monthlyAmount: "9500.00", includedSites: 3, extraSiteMonthlyAmount: "1500.00" };

describe("planMonthlyForSites", () => {
  it("charges the base price for sites within the allowance", () => {
    expect(planMonthlyForSites(site, 1)).toBe(1500);
    expect(planMonthlyForSites(network, 1)).toBe(4500);
    expect(planMonthlyForSites(network, 3)).toBe(4500);
  });

  it("adds the extra-site price for each site above the allowance", () => {
    expect(planMonthlyForSites(network, 4)).toBe(5450);
    expect(planMonthlyForSites(network, 20)).toBe(20650);
    expect(planMonthlyForSites(assure, 20)).toBe(35000);
  });

  it("never adds cost when the plan has no extra-site price", () => {
    expect(planMonthlyForSites(site, 5)).toBe(1500);
  });
});
