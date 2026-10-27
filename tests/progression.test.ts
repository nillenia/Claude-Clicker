import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/core/state';
import { MACHINE_LIST } from '../src/data/machines';
import { PLANET_LIST } from '../src/data/planets';
import { RECIPE_LIST } from '../src/data/recipes';
import { RESEARCH, RESEARCH_LIST } from '../src/data/research';
import { RESOURCES } from '../src/data/resources';
import { COLONY_KIT, COLONY_COST } from '../src/systems/logistics';

describe('Datenkonsistenz', () => {
  it('alle Verweise zeigen auf existierende Einträge', () => {
    for (const r of RESEARCH_LIST) for (const p of r.prereqs) expect(RESEARCH[p], `${r.id} → ${p}`).toBeDefined();
    for (const r of RECIPE_LIST) {
      if (r.unlock) expect(RESEARCH[r.unlock], `Rezept ${r.id}`).toBeDefined();
      for (const res of [...Object.keys(r.inputs), ...Object.keys(r.outputs)]) expect(RESOURCES[res], `Rezept ${r.id}: ${res}`).toBeDefined();
    }
    for (const p of PLANET_LIST) if (p.unlock) expect(RESEARCH[p.unlock], `Planet ${p.id}`).toBeDefined();
    for (const r of RESEARCH_LIST) for (const pack of Object.keys(r.packs)) expect(RESOURCES[pack]).toBeDefined();
  });
});

/**
 * Spielt den Fortschritt abstrakt durch: Was ist vom Start aus erreichbar?
 * Rezepte brauchen ihre Zutaten und eine passende Maschine (oder Handfertigung),
 * Forschung braucht Datenkerne, ein Labor und Strom, Planeten brauchen Expedition, Silo und Raketenteile.
 */
describe('Fortschritt ohne Sackgassen', () => {
  it('alle Forschungen, Planeten und Items sind erreichbar', () => {
    const state = createInitialState();
    const have = new Set<string>(Object.keys(state.planets.kepler.inventory));
    const done = new Set<string>();
    const planets = new Set<string>(['kepler']);
    const machineFor = { smelting: ['furnace_stone', 'furnace_elec'], assembling: ['assembler_1'], chemistry: ['chem_1'] } as const;
    const power = () => (have.has('gen_coal') && have.has('coal')) || have.has('gen_solar');

    let changed = true;
    while (changed) {
      changed = false;
      const add = (id: string) => {
        if (!have.has(id)) {
          have.add(id);
          changed = true;
        }
      };
      // Rohstoffe der Planeten
      for (const pid of planets) {
        const planet = PLANET_LIST.find((p) => p.id === pid)!;
        for (const ore of planet.ores) {
          const fluid = RESOURCES[ore.resource].category === 'fluid';
          if (!fluid) add(ore.resource); // Handabbau
          else if (have.has('pump') && power()) add(ore.resource);
        }
      }
      // Rezepte
      for (const r of RECIPE_LIST) {
        if (r.unlock && !done.has(r.unlock)) continue;
        if (!Object.keys(r.inputs).every((i) => have.has(i))) continue;
        const byHand = !!r.hand;
        const byMachine = machineFor[r.category].some((m) => have.has(m)) && (r.category === 'smelting' || power());
        if (!byHand && !byMachine) continue;
        for (const out of Object.keys(r.outputs)) add(out);
      }
      // Forschung
      if (have.has('lab_1') && power()) {
        for (const r of RESEARCH_LIST) {
          if (done.has(r.id) || !r.prereqs.every((p) => done.has(p))) continue;
          if (!Object.keys(r.packs).every((p) => have.has(p))) continue;
          done.add(r.id);
          changed = true;
        }
      }
      // Kolonien
      for (const p of PLANET_LIST) {
        if (planets.has(p.id) || (p.unlock && !done.has(p.unlock))) continue;
        if (have.has('silo') && have.has('rocket_part') && power()) {
          planets.add(p.id);
          for (const res of Object.keys(COLONY_KIT)) add(res);
          changed = true;
        }
      }
    }
    void COLONY_COST;

    const missingResearch = RESEARCH_LIST.filter((r) => !done.has(r.id)).map((r) => r.id);
    expect(missingResearch, 'nicht erreichbare Forschung').toEqual([]);
    expect([...planets].sort()).toEqual(PLANET_LIST.map((p) => p.id).sort());
    const missingMachines = MACHINE_LIST.filter((m) => m.buildable && !have.has(m.id)).map((m) => m.id);
    expect(missingMachines, 'nicht baubare Maschinen').toEqual([]);
    const missingItems = Object.values(RESOURCES)
      .filter((r) => r.category !== 'currency' && !have.has(r.id))
      .map((r) => r.id);
    expect(missingItems, 'nicht herstellbare Items').toEqual([]);
  });
});
