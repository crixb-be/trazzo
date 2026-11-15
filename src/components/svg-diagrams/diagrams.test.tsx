import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DoorClearance } from "./DoorClearance";
import { LightWell } from "./LightWell";
import { ParkingStall } from "./ParkingStall";
import { RampSlope } from "./RampSlope";
import { StairStep } from "./StairStep";
import { WheelchairTurn } from "./WheelchairTurn";

function expectValidSvg(markup: string): void {
  expect(markup).toMatch(/<svg[^>]*role="img"/);
  expect(markup).toMatch(/viewBox="0 0 [\d.]+ [\d.]+"/);
  expect(markup).not.toMatch(/NaN|Infinity/);
  // Geometry must never be wrapped in a scaling group again.
  expect(markup).not.toMatch(/scale\(/);
}

describe("SVG diagrams", () => {
  it.each([0.1, 0.25, 0.75, 1.2, 2, 2.5])("RampSlope renders for rise %s m", (rise) => {
    for (const slope of [0.02, 0.06, 0.12]) {
      expectValidSvg(renderToStaticMarkup(<RampSlope rise={rise} slope={slope} />));
    }
  });

  it("RampSlope draws a break line for very long runs", () => {
    const markup = renderToStaticMarkup(<RampSlope rise={2.5} slope={0.02} />);
    expect(markup).toContain("125.00 m");
    expect(markup).toContain("TRAMO CORTADO");
  });

  it.each([
    [2.4, 14, 0.171, 0.29],
    [3, 17, 0.176, 0.27],
    [4.5, 26, 0.173, 0.28],
  ])("StairStep renders for floor height %s m", (_height, risers, cp, p) => {
    expectValidSvg(renderToStaticMarkup(<StairStep risers={risers} cp={cp} p={p} />));
  });

  it.each([3, 6, 12, 18])("LightWell renders for wall height %s m", (height) => {
    for (const kind of ["habitable", "servicios"] as const) {
      expectValidSvg(renderToStaticMarkup(<LightWell height={height} kind={kind} />));
    }
  });

  it.each([
    [0.8, 2.1],
    [0.9, 2.3],
    [1.2, 2.4],
  ])("DoorClearance renders for %s × %s m", (width, height) => {
    expectValidSvg(renderToStaticMarkup(<DoorClearance width={width} height={height} />));
    expectValidSvg(
      renderToStaticMarkup(<DoorClearance width={width} height={height} showElevation={false} />),
    );
  });

  it.each([1, 1.5, 2])("WheelchairTurn renders for Ø %s m", (diameter) => {
    expectValidSvg(renderToStaticMarkup(<WheelchairTurn diameter={diameter} />));
  });

  it("ParkingStall renders default and custom sizes", () => {
    expectValidSvg(renderToStaticMarkup(<ParkingStall />));
    expectValidSvg(renderToStaticMarkup(<ParkingStall width={2.4} length={4.5} transfer={0.9} />));
  });

  it("falls back to safe values for invalid input", () => {
    expectValidSvg(renderToStaticMarkup(<RampSlope rise={Number.NaN} slope={0} />));
    expectValidSvg(renderToStaticMarkup(<StairStep risers={Infinity} cp={Number.NaN} />));
    expectValidSvg(renderToStaticMarkup(<LightWell height={-5} />));
  });

  it("uses unique marker and pattern ids per instance", () => {
    const markup = renderToStaticMarkup(
      <>
        <RampSlope />
        <RampSlope />
      </>,
    );
    const ids = [...markup.matchAll(/ id="([^"]+)"/g)].map((match) => match[1]);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it.each(["height", "tread", "width"] as const)("renders the %s highlight label", (highlight) => {
    const html = renderToStaticMarkup(<StairStep highlight={highlight} />);
    expect(html).toContain(
      highlight === "height"
        ? "Altura piso a piso"
        : highlight === "tread"
          ? "Paso (p)"
          : "Ancho libre",
    );
  });
});
