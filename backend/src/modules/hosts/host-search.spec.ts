import { searchHosts } from "./host-search";

const hosts = [
  { displayName: "Maria Shikongo", department: "Facilities", active: true },
  { displayName: "Marius Amukoto", department: "Finance", active: true },
  { displayName: "Joseph Maria", department: "Security", active: true },
  { displayName: "Élodie Nangolo", department: "Finance", active: true },
  { displayName: "Retired Host", department: "Facilities", active: false },
];

describe("searchHosts", () => {
  it("ranks names that start with the query first, then names that contain it", () => {
    expect(searchHosts(hosts, "mari").map((h) => h.displayName)).toEqual([
      "Maria Shikongo",
      "Marius Amukoto",
      "Joseph Maria",
    ]);
  });

  it("matches the department, ignores case and accents, and needs every word to match", () => {
    expect(searchHosts(hosts, "finance").map((h) => h.displayName)).toEqual(["Élodie Nangolo", "Marius Amukoto"]);
    expect(searchHosts(hosts, "ELODIE")[0].displayName).toBe("Élodie Nangolo");
    expect(searchHosts(hosts, "maria facilities").map((h) => h.displayName)).toEqual(["Maria Shikongo"]);
    expect(searchHosts(hosts, "maria finance")).toEqual([]);
  });

  it("never offers an inactive host, and lists alphabetically with no query", () => {
    expect(searchHosts(hosts, "retired")).toEqual([]);
    expect(searchHosts(hosts, "").map((h) => h.displayName)).toEqual([
      "Élodie Nangolo",
      "Joseph Maria",
      "Maria Shikongo",
      "Marius Amukoto",
    ]);
  });

  it("caps the result and keeps the cap in a sane range", () => {
    const many = Array.from({ length: 150 }, (_, i) => ({
      displayName: `Host ${String(i).padStart(3, "0")}`,
      department: null,
      active: true,
    }));
    expect(searchHosts(many, "host", 5)).toHaveLength(5);
    expect(searchHosts(many, "host", 5000)).toHaveLength(100);
    expect(searchHosts(many, "host", -3)).toHaveLength(20);
  });
});
