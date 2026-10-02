# Sebaka Astronomy Specification v1 (research baseline)

Status: implementation baseline. Orbital parameters remain tunable until the
Triune and Triple Cascade searches are validated in the observer model.

## Calendar

- A week is 9 days.
- A month is 27 days (three 9-day weeks), tied to Viridis's physical cycle.
- The leading year is 13 months, or 351 days. The year length is centralized
  so alternative calendars can still be tested.

## Physical architecture

- Alpha and Twilight are a close binary with a shared barycenter.
- Sebaka is an independent circumbinary planet, never a moon.
- Rutilis, Spectris, Viridis, and Aetheris are the four major planets used by
  the historical alignment predicates.
- Beacon is a distant third star. Its hidden subsystem contains Gelidis and
  Liminis; those bodies are physically represented but are not part of the
  current naked-eye Triune predicates.
- Distances, masses, radii, eccentricities, and phases are tunable design
  variables constrained by stability, visibility, and lore.

## Observer layer

The engine separates physical positions from what an observer on Sebaka sees:
geometric horizon position, practical visibility against the suns, and
Weave-enhanced apparent size/clarity. The Weave may make planets appear huge,
but it does not alter orbital positions or masses.

## Event hierarchy

### Gathering of Witnesses

Recurring loose planetary parade. Several bodies may be visible together or
within a short observing season. It is not the rare historical alignment.

### Full Triune Alignment

The rare historical event associated with Year 0 and approximately Year 2454:

- all four major planets participate;
- their apparent order forms the characteristic loose crescent/parade;
- a sequential occultation or shadow-chain effect produces staged darkening;
- Beacon provides the late/final light in the sequence;
- the episode lasts approximately two months.

The two historical appearances need not be exact physical repeats.

### Triple Cascade

Separate rare event predicate for a sequence involving Viridis, Spectris, and
Aetheris. Pairwise occultations may be stages of the cascade, but it must not
be confused with ordinary conjunctions.

Great Conjunction, Twin Conjunction, Triad Alignment, Quadrant Convergence,
Pre-Conjunction Prelude, Aetheris Dominance, and pairwise occultations are
secondary reports derived from the authoritative observer model.

## Implementation rule

The renderer consumes the authoritative ephemeris and observer-event results;
it must not invent a second astronomy model from display radii, pairwise
synodic shortcuts, or the inclusion of Sebaka as a sky body.

## Observatory implementation (October 2026)

The new sky and orbital views consume the same `calculateBodyPositions`
ephemeris and simulation hour. The observer adapter converts the radius metadata
to kilometers rather than treating exaggerated legacy mesh sizes as physical
radii. The reference location is 24° north, 0° longitude, with the baseline
23.5° axial tilt and 24-hour rotation treated as sidereal. Surface topocentric
offsets are included. The Weave scales angular diameters using the existing
600× multipliers and per-planet caps, without changing directions or distances.

The opening hour is chosen by a documented search for a scenic Aetheris view,
not as a Year 0 alignment or a fabricated event. The Gathering finder samples
hourly for up to one year, requiring at least three witnesses above 3°, both
suns below −4°, and each witness separated from both suns by more than 10°.
This explicit observing interpretation is provisional.

Known unresolved contradictions in the legacy baseline include its mesh/radius
unit mismatch, Spectris's old calendar description, Beacon's fixed giant-star
classification despite its unknown lore status, inconsistent period text, and
the event solver's use of historical recurrence values as search hints. The
observatory does not present these descriptions or search hints as established
facts. Its journal labels Full Triune Alignment and Triple Cascade unverified.
No full-sequence recurrence or long-term gravitational stability was proved by
the application tests. Those remain astronomy research tasks.

Terrain, background stars, atmospheric color, and point-source glow are visual
interpretations. Apparent disc sizes and horizon readouts use the observer
adapter; lighting is illustrative, not a radiometric visibility calculation.
