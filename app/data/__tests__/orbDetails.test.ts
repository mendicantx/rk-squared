import { getOrbCosts, parseOrb } from '../orbDetails';

import { enlir } from '../enlir';

describe('orbDetails', () => {
  describe('parseOrb', () => {
    it('parses orbs', () => {
      expect(parseOrb('Minor Non-Elemental')).toEqual(['NE', 1]);
    });
  });

  describe('getOrbCosts', () => {
    it('gets orb costs', () => {
      expect(getOrbCosts(enlir.abilitiesByName['Chain Firaja'])).toEqual([
        {
          orbType: 'Black',
          cost: '10-',
          rarity: 6,
          id: 40000068,
        },
        {
          orbType: 'NE',
          cost: '6',
          rarity: 6,
          id: 40000071,
        },
        {
          orbType: 'Fire',
          cost: '6',
          rarity: 6,
          id: 40000072,
        },
      ]);
    });
  });
});
