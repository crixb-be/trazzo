import { expect, it } from "vitest";
import packageInfo from "../../package.json";
import { APP_INFO } from "./app-info";

it("uses the package version and links to GitHub over HTTPS", () => {
  expect(APP_INFO.version).toBe(packageInfo.version);
  const github = new URL(APP_INFO.developer.githubUrl);
  expect(github.protocol).toBe("https:");
  expect(github.hostname).toBe("github.com");
});
