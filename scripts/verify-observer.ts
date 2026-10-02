import assert from "node:assert/strict";
import {
  DAY,
  YEAR,
  calendar,
  bodies,
  observe,
  radiusKm,
  openingObservation,
  nextGathering,
  rotationHours,
  toggleRotation,
} from "../src/lib/observatory";

async function verify() {
  assert.equal(calendar(27 * DAY).month, 2);
  assert.equal(calendar(27 * DAY).date, 1);
  assert.equal(calendar(351 * DAY).year, 1);
  assert.equal(calendar(351 * DAY).month, 1);
  assert.equal(calendar((2454 * YEAR + 350) * DAY).year, 2454);
  assert.equal(calendar((2454 * YEAR + 350) * DAY).month, 13);
  assert.equal(calendar((2454 * YEAR + 350) * DAY).date, 27);
  assert.equal(radiusKm("Sebaka"), 6371);
  assert.equal(radiusKm("Alpha"), 695700);

  const start = openingObservation();
  const spinning = { enabled: true, offset: 0, frozenHours: 0 };
  const held = toggleRotation(start, spinning);
  assert.equal(rotationHours(start + 6, held), start);
  const resumed = toggleRotation(start + 6, held);
  assert.equal(
    rotationHours(start + 6, resumed),
    start,
    "Resume must not jump the horizon",
  );
  assert.equal(rotationHours(start + 7, resumed), start + 1);
  const heldNow = observe(start, 24, 0, true, rotationHours(start, held));
  const heldLater = observe(
    start + 6,
    24,
    0,
    true,
    rotationHours(start + 6, held),
  );
  assert.ok(heldNow.frame.up.distanceTo(heldLater.frame.up) < 1e-12);
  assert.ok(
    heldNow.positions.Sebaka.distanceTo(heldLater.positions.Sebaka) > 0.01,
    "Pausing rotation must not freeze the orbit",
  );
  const physical = observe(start, 24, 0, false),
    apparent = observe(start);
  for (const b of physical.sky) {
    const amplified = apparent.sky.find((a) => a.name === b.name)!;
    assert.ok(
      b.direction.distanceTo(amplified.direction) < 1e-12,
      "Weave must not move a body",
    );
    assert.equal(b.distanceAU, amplified.distanceAU);
    assert.equal(b.altitude, amplified.altitude);
    assert.ok(amplified.apparentDiameter >= b.physicalDiameter);
    assert.ok(
      amplified.apparentDiameter <=
        (amplified.maxApparentDiameterDeg ?? Infinity),
    );
  }
  assert.ok(
    physical.sky.find((b) => b.name === "Aetheris")!.physicalDiameter < 0.03,
    "Physical radius must not reuse exaggerated legacy mesh units",
  );
  assert.ok(apparent.sky.find((b) => b.name === "Aetheris")!.altitude > 0);
  assert.ok(apparent.solarAltitude < 0);
  assert.ok(
    !apparent.sky.some((b) =>
      ["Gelidis", "Liminis", "Sebaka"].includes(b.name),
    ),
  );
  for (const name of ["Gelidis", "Liminis"]) {
    assert.ok(
      apparent.positions[name],
      "Hidden planets remain in the ephemeris",
    );
    const distance =
      apparent.positions[name].distanceTo(apparent.positions.Beacon) / 150;
    const body = bodies.find((b) => b.name === name)!;
    assert.ok(
      distance >=
        (body.orbitRadius! / 150) * (1 - (body.eccentricity ?? 0)) - 1e-6,
    );
    assert.ok(
      distance <=
        (body.orbitRadius! / 150) * (1 + (body.eccentricity ?? 0)) + 1e-6,
    );
  }
  const a = observe(start, 0, 0),
    b = observe(start, 0, 180);
  for (const body of a.sky) {
    assert.ok(
      Math.abs(
        body.altitude + b.sky.find((x) => x.name === body.name)!.altitude,
      ) < 0.01,
      "Opposite observers must see opposite horizons",
    );
  }
  const found = await nextGathering(
    start,
    24,
    0,
    new AbortController().signal,
    () => {},
  );
  assert.notEqual(found, null);
  assert.ok(found! > start && found! <= start + DAY * YEAR);
  assert.ok(observe(found!).visibleWitnesses.length >= 3);
  const cancelled = new AbortController();
  cancelled.abort();
  assert.equal(
    await nextGathering(start, 24, 0, cancelled.signal, () => {}),
    null,
  );
  console.log(
    JSON.stringify(
      {
        result: "passed",
        openingHour: start,
        openingDate: calendar(start),
        gatheringHour: found,
        gatheringDate: calendar(found!),
        witnesses: observe(found!).visibleWitnesses.map((b) => b.name),
      },
      null,
      2,
    ),
  );
}
verify().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
