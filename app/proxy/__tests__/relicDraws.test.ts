import { convertRelicDrawBanners, convertRelicDrawProbabilities } from '../relicDraws';

import * as _ from 'lodash';

import { RelicDrawBanner } from '../../actions/relicDraws';
import { LangType } from '../../api/apiUrls';

describe('gacha proxy handler', () => {
  describe('gacha/show', () => {
    it('converts relic draws with Realms on Parade', () => {
      const { data } = require('./data/gacha_show.json');
      const { banners, groups } = convertRelicDrawBanners(LangType.Gl, data);

      expect(_.values(banners).length).toEqual(45);

      const ff5BannerRelics = _.find(banners, i => i.id === 788)!.bannerRelics!;
      expect(ff5BannerRelics.length).toEqual(14);
      expect(ff5BannerRelics).toEqual([
        21004035,
        21008209,
        21010068,
        21008231,
        21001136,
        22053274,
        22056183,
        22055051,
        22056216,
        21009074,
        21006060,
        22053364,
        22050094,
        22051121,
      ]);

      expect(_.values(groups)).toEqual([
        {
          groupName: 'group4',
          imageUrl:
            'http://ffrk.denagames.com/dff/static/lang/ww/compile/en/image/gacha_series/lineup_image/series_happy_805.png',
          sortOrder: 1903081700,
        },
        {
          groupName: 'archive',
          imageUrl:
            'http://ffrk.denagames.com/dff/static/lang/ww/compile/en/image/gacha_series/lineup_image/book_mission_gacha.png',
          sortOrder: -100,
        },
        {
          groupName: 'realmRelicDraws',
          imageUrl:
            'http://ffrk.denagames.com/dff/static/lang/ww/compile/en/image/gacha_series/lineup_image/series_687.png',
          sortOrder: -99,
        },
      ]);
    });

    it('checks canPull and canSelect', () => {
      const { data } = require('./data/gacha_show2.json');
      const { banners } = convertRelicDrawBanners(LangType.Gl, data);

      const filteredIds = (items: RelicDrawBanner[], filter?: (i: RelicDrawBanner) => boolean) =>
        _.filter(items, filter || _.constant(true))
          .map(i => i.id)
          .sort();

      const archiveBanners = _.filter(banners, i => i.group === 'archive');
      // Acolyte Archives are 9 banners starting at ID 7001.
      expect(filteredIds(archiveBanners)).toEqual(_.times(9, i => i + 7001));
      // All Acolyte Archive banners have been pulled.
      expect(filteredIds(archiveBanners, i => i.canPull)).toEqual([]);
      // Banners 4, 5, 6, 8 and 9 still have selections available.
      expect(filteredIds(archiveBanners, i => i.canSelect)).toEqual([7004, 7005, 7006, 7008, 7009]);

      const luckOfTheRealms = _.filter(banners, i => i.group === 'group4');
      // This capture was taken when all 17 banners were available.
      expect(filteredIds(luckOfTheRealms)).toEqual(_.times(17, i => i + 805));
      // All but FF1 have been used.
      expect(filteredIds(luckOfTheRealms, i => i.canPull)).toEqual([821]);
      // None of these banners have selections.
      expect(filteredIds(luckOfTheRealms, i => i.canSelect)).toEqual([]);
    });
  });

  describe('gacha/probability', () => {
    it('converts gacha probabilities', () => {
      const { data } = require('./data/gacha_probability.json');
      const probabilities = convertRelicDrawProbabilities(data);
      expect(probabilities).toBeTruthy();
      const { byRarity, byRelic } = probabilities!;
      expect(byRarity).toEqual({
        '3': 60.96,
        '4': 25.0,
        '5': 8.01999,
        '6': 6.01999,
      });
      expect(_.filter(byRelic, value => value >= 1).length).toEqual(14);
      expect(_.keys(byRelic).length).toEqual(42);
    });
  });
});