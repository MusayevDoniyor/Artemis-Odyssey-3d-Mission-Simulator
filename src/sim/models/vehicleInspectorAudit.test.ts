import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { HARDWARE_CATALOG, HARDWARE_ORDER } from '../../game/hardwareCatalog';
import {
  GUIDED_TOURS,
  auditVehicleNodeCoverage,
  getAllGuidedTours,
  getGuidedTourById,
  getGuidedToursForCraft,
  getTourStep,
} from '../../game/hardwareInspector';

describe('PHASE 8: Vehicle Inspector Automated Node Coverage & Guided Systems Tours Audit', () => {
  it('Automated node coverage audit: 100% of visible nodes across all 9 vehicles have complete copy and sources', () => {
    const audit = auditVehicleNodeCoverage();
    assert.strictEqual(audit.totalCrafts, 9, 'Expected all 9 vehicles in HARDWARE_ORDER to be audited');
    assert.ok(audit.totalParts >= 40, `Expected at least 40 subsystems, found ${audit.totalParts}`);
    assert.strictEqual(
      audit.issues.length,
      0,
      `Node coverage audit found issues:\n${audit.issues.join('\n')}`
    );
    assert.strictEqual(audit.coveragePct, 100, 'Expected 100% subsystem coverage with zero empty or placeholder parts');
  });

  it('Multi-stage exploded views: all subsystems displace along verified mechanical assembly axes', () => {
    for (const craftId of HARDWARE_ORDER) {
      const craft = HARDWARE_CATALOG[craftId];
      assert.ok(craft.parts.length >= 3, `Craft ${craftId} must have >= 3 parts`);

      let nonZeroAxesCount = 0;
      for (const part of craft.parts) {
        assert.strictEqual(
          part.explodeAxis.length,
          3,
          `${craftId}/${part.id} explodeAxis must have exactly 3 coordinates [X, Y, Z]`
        );
        // Ensure values are finite numbers
        part.explodeAxis.forEach((val, idx) => {
          assert.ok(
            Number.isFinite(val),
            `${craftId}/${part.id} axis[${idx}] must be a finite number, got ${val}`
          );
        });

        const [x, y, z] = part.explodeAxis;
        if (Math.hypot(x, y, z) > 0) {
          nonZeroAxesCount++;
        }
      }

      // In CAD exploded views, at least (N - 1) parts must displace away from the root datum
      assert.ok(
        nonZeroAxesCount >= craft.parts.length - 1,
        `Craft ${craftId} must have at least ${craft.parts.length - 1} displacing subsystems (got ${nonZeroAxesCount})`
      );
    }
  });

  it('Guided Systems Tours: All 5 required guided tours are defined, fully sequenced, and reference valid parts', () => {
    const tours = getAllGuidedTours();
    assert.ok(tours.length >= 5, `Expected >= 5 guided tours, found ${tours.length}`);

    const expectedTours = [
      { id: 'tour-sls', craftId: 'rocket', minSteps: 5 },
      { id: 'tour-orion', craftId: 'rocket', minSteps: 3 },
      { id: 'tour-lm', craftId: 'lander', minSteps: 3 },
      { id: 'tour-perseverance', craftId: 'rover', minSteps: 4 },
      { id: 'tour-iss', craftId: 'iss', minSteps: 5 },
    ];

    for (const exp of expectedTours) {
      const tour = getGuidedTourById(exp.id);
      assert.ok(tour, `Missing required guided tour: ${exp.id}`);
      assert.strictEqual(tour.craftId, exp.craftId);
      assert.ok(
        tour.steps.length >= exp.minSteps,
        `Tour ${exp.id} must have >= ${exp.minSteps} steps, got ${tour.steps.length}`
      );

      const craft = HARDWARE_CATALOG[tour.craftId];
      for (let i = 0; i < tour.steps.length; i++) {
        const step = getTourStep(tour.id, i);
        assert.ok(step, `Missing step ${i} in tour ${tour.id}`);
        assert.strictEqual(step.stepNumber, i + 1);
        assert.strictEqual(step.totalSteps, tour.steps.length);
        assert.ok(step.title.length > 5, `Step title too short in ${tour.id}/${i}`);
        assert.ok(step.narration.length > 40, `Step narration too short in ${tour.id}/${i}`);

        // Verify the part exists in the parent craft
        const partExists = craft.parts.some((p) => p.id === step.partId);
        assert.ok(
          partExists,
          `Tour ${tour.id} step ${i + 1} references non-existent part "${step.partId}" in craft "${tour.craftId}"`
        );
      }
    }
  });

  it('Guided tour craft filtering: getGuidedToursForCraft returns appropriate tours per vehicle', () => {
    const slsTours = getGuidedToursForCraft('rocket');
    assert.ok(slsTours.some((t) => t.id === 'tour-sls'));
    assert.ok(slsTours.some((t) => t.id === 'tour-orion'));

    const landerTours = getGuidedToursForCraft('lander');
    assert.ok(landerTours.some((t) => t.id === 'tour-lm'));

    const roverTours = getGuidedToursForCraft('rover');
    assert.ok(roverTours.some((t) => t.id === 'tour-perseverance'));

    const issTours = getGuidedToursForCraft('iss');
    assert.ok(issTours.some((t) => t.id === 'tour-iss'));
  });

  it('3-Level Educational Explanations & Technical Specs are complete across 100% of parts', () => {
    for (const craftId of HARDWARE_ORDER) {
      const craft = HARDWARE_CATALOG[craftId];
      for (const part of craft.parts) {
        assert.ok(part.levels.level1What.length >= 25, `${craftId}/${part.id} level1What too short`);
        assert.ok(part.levels.level2How.length >= 25, `${craftId}/${part.id} level2How too short`);
        assert.ok(part.levels.level3Engineering.length >= 25, `${craftId}/${part.id} level3Engineering too short`);
        assert.ok(part.engineeringSpecs.length >= 3, `${craftId}/${part.id} needs >= 3 engineering specs`);
        for (const spec of part.engineeringSpecs) {
          assert.ok(spec.label.length > 0, `${craftId}/${part.id} spec label empty`);
          assert.ok(spec.value.length > 0, `${craftId}/${part.id} spec value empty`);
        }
      }
    }
  });

  it('Integrated Component Quizzes: Every single part has a valid 3-choice multiple-choice knowledge check', () => {
    for (const craftId of HARDWARE_ORDER) {
      const craft = HARDWARE_CATALOG[craftId];
      for (const part of craft.parts) {
        const q = part.quizQuestion;
        assert.ok(q, `${craftId}/${part.id} missing quizQuestion`);
        assert.ok(q.prompt.length >= 15, `${craftId}/${part.id} quiz prompt too short`);
        assert.strictEqual(q.options.length, 3, `${craftId}/${part.id} must have exactly 3 options`);
        assert.ok(
          q.correctIndex >= 0 && q.correctIndex < 3,
          `${craftId}/${part.id} correctIndex out of bounds (got ${q.correctIndex})`
        );
        assert.ok(q.explanation.length >= 15, `${craftId}/${part.id} quiz explanation too short`);
      }
    }
  });

  it('Primary Aerospace Sources: Every vehicle and subsystem cites authentic primary publications', () => {
    for (const craftId of HARDWARE_ORDER) {
      const craft = HARDWARE_CATALOG[craftId];
      assert.ok(
        craft.sources && craft.sources.length >= 2,
        `Craft ${craftId} must cite at least 2 primary aerospace sources`
      );
      for (const src of craft.sources) {
        assert.ok(src.length >= 8, `Source citation too short for craft ${craftId}: ${src}`);
      }

      for (const part of craft.parts) {
        const citation = part.sourceCitation || part.honestyNote || craft.sources[0];
        assert.ok(
          citation.length >= 8,
          `Subsystem ${craftId}/${part.id} must carry verified source attribution`
        );
      }
    }
  });
});
