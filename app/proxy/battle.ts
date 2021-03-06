/**
 * @file
 * Support for tracking battle status, such as item drops
 */

import { Store } from 'redux';

import * as _ from 'lodash';

import { LangType } from '../api/apiUrls';
import * as schemas from '../api/schemas';
import { enlir } from '../data';
import { formatRelicName, Item, itemsById, ItemType } from '../data/items';
import * as urls from '../data/urls';
import { getRequestLang, Handler, HandlerRequest } from './common';

import { clearDropItems, DropItem, setDropItems } from '../actions/battle';
import { IState } from '../reducers';
import { localItemsById } from './itemUpdates';

enum DropItemType {
  Gil = 11,
  Potion = 21,
  HiPotion = 22,
  XPotion = 23,
  Ether = 31,
  HiEther = 32,
  Treasure = 41, // Includes relics (unconfirmed), upgrade materials, magicite, growth eggs
  Orb = 51,
  Currency = 61, // E.g., Gysahl Greens (item ID 95001014, rarity 1), Prismatic Seeds (ID 95001029, rarity 1)
}

const dropItemTypeName = {
  [DropItemType.Gil]: 'Gil',
  [DropItemType.Potion]: 'Potion',
  [DropItemType.HiPotion]: 'Hi-Potion',
  [DropItemType.XPotion]: 'X-Potion',
  [DropItemType.Ether]: 'Ether',
  [DropItemType.HiEther]: 'Hi-Ether',
  [DropItemType.Treasure]: 'Treasure',
  [DropItemType.Orb]: 'Orb',
  [DropItemType.Currency]: 'Currency',
};

const toNumber = (x: number | string | undefined) => (x == null ? undefined : +x);

interface NormalizedItem {
  rarity: number;
  uid?: string;
  type: number;
  round?: number;
  amount?: number;
  num?: string;
  item_id: number | undefined;
}

function normalizeItem(item: schemas.DropItem): NormalizedItem {
  return {
    ...item,
    item_id: toNumber(item.item_id),
    type: +item.type,
    amount: item.num != null ? toNumber(item.num) : item.amount,
  };
}

function assetKey({ type, rarity }: { type: number; rarity: number }) {
  return `drop_item_${type}_${rarity}`;
}

function generateItemName({
  item_id,
  rarity,
  type,
}: {
  item_id?: number;
  type: number;
  rarity: number;
}) {
  if (item_id != null) {
    return `Item ${item_id}`;
  } else {
    return `Item ${type}_${rarity}`;
  }
}

function nameWithAmount(name: string, amount?: number) {
  if (amount == null || amount === 1) {
    return name;
  } else {
    return `${amount}× ${name}`;
  }
}

function getTreasureItemDetails(lang: LangType, realItem: Item) {
  return {
    name: realItem.name,
    imageUrl: urls.itemImage(lang, realItem.id, realItem.type),
  };
}

function getTreasureDetails(lang: LangType, id: number, item: NormalizedItem) {
  if (enlir.magicites[id]) {
    return {
      name: enlir.magicites[id].name,
      imageUrl: urls.magiciteImage(lang, id),
    };
  } else if (enlir.relics[id]) {
    return {
      name: formatRelicName(enlir.relics[id]),
      imageUrl: urls.relicImage(lang, id, item.rarity),
    };
  } else if (itemsById[id]) {
    return getTreasureItemDetails(lang, itemsById[id]);
  } else if (localItemsById[id]) {
    return getTreasureItemDetails(lang, localItemsById[id]);
  } else {
    return {
      name: generateItemName(item),
    };
  }
}

function convertDropItemList(
  lang: LangType,
  data: schemas.GetBattleInit,
  dropItemData: schemas.DropItem[],
  dropItems: DropItem[],
) {
  for (const i of dropItemData) {
    const item = normalizeItem(i);
    let imageUrl = urls.asset(lang, data.battle.assets[assetKey(item)]);
    switch (item.type) {
      case DropItemType.Gil:
        imageUrl = urls.url(lang, 'image/common_item/92000000.png');
        dropItems.push({
          amount: item.amount,
          type: item.type,
          rarity: item.rarity,
          name: `${item.amount} ${dropItemTypeName[item.type]}`,
          imageUrl,
        });
        break;
      case DropItemType.Currency: {
        let name: string | undefined;
        if (item.item_id != null) {
          name =
            _.get(itemsById, [item.item_id, 'name']) ||
            _.get(localItemsById, [item.item_id, 'name']);
        }
        name = name || generateItemName(item);
        dropItems.push({
          amount: item.amount,
          type: item.type,
          rarity: item.rarity,
          name: nameWithAmount(name, item.amount),
          imageUrl,
        });
        break;
      }
      case DropItemType.Potion:
      case DropItemType.HiPotion:
      case DropItemType.XPotion:
      case DropItemType.Ether:
      case DropItemType.HiEther:
        dropItems.push({
          amount: item.amount,
          type: item.type,
          rarity: item.rarity,
          name: `${dropItemTypeName[item.type]} (round ${item.round})`,
          imageUrl,
        });
        break;
      case DropItemType.Treasure: {
        const id = item.item_id!;
        const details = getTreasureDetails(lang, id, item);
        dropItems.push({
          amount: item.amount,
          rarity: item.rarity,
          type: item.type,
          name: nameWithAmount(details.name, item.amount),
          itemId: item.item_id,
          imageUrl: details.imageUrl || imageUrl,
        });
        break;
      }
      case DropItemType.Orb: {
        const id = item.item_id as number;
        if (itemsById[id]) {
          dropItems.push({
            amount: item.amount,
            rarity: item.rarity,
            type: item.type,
            name: nameWithAmount(itemsById[id].name, item.amount),
            itemId: item.item_id,
            imageUrl: urls.itemImage(lang, id, ItemType.Orb),
          });
        } else {
          // Treat as an unknown item
          dropItems.push({
            amount: item.amount,
            rarity: item.rarity,
            type: item.type,
            name: nameWithAmount(generateItemName(item), item.amount),
            itemId: item.item_id,
            imageUrl,
          });
        }
        break;
      }
      default:
        dropItems.push({
          amount: item.amount,
          rarity: item.rarity,
          type: item.type,
          name: nameWithAmount(generateItemName(item), item.amount),
          itemId: item.item_id,
          imageUrl,
        });
    }
  }
}

function convertDropMateria(
  lang: LangType,
  materia: { name: string; item_id: string | number },
  dropItems: DropItem[],
) {
  dropItems.push({
    name: materia.name,
    imageUrl: urls.recordMateriaDropImage(lang, +materia.item_id),
    rarity: 3,
  });
}

export function convertBattleDropItems(lang: LangType, data: schemas.GetBattleInit): DropItem[] {
  const dropItems: DropItem[] = [];
  for (const round of data.battle.rounds) {
    convertDropItemList(lang, data, round.drop_item_list, dropItems);
    for (const enemy of round.enemy) {
      for (const children of enemy.children) {
        convertDropItemList(lang, data, children.drop_item_list, dropItems);
      }
    }
    for (const materia of round.drop_materias) {
      convertDropMateria(lang, materia, dropItems);
    }
  }
  return dropItems;
}

function handleWinBattle(data: schemas.WinBattle, store: Store<IState>) {
  store.dispatch(clearDropItems());
}

// noinspection JSUnusedGlobalSymbols
const battleHandler: Handler = {
  escape_battle(data: schemas.GetBattleInit, store: Store<IState>) {
    store.dispatch(clearDropItems());
  },

  get_battle_init_data(data: schemas.GetBattleInit, store: Store<IState>, request: HandlerRequest) {
    const lang = getRequestLang(request);
    const items = convertBattleDropItems(lang, data);
    store.dispatch(setDropItems(items));
  },

  lose_battle(data: schemas.GetBattleInit, store: Store<IState>) {
    store.dispatch(clearDropItems());
  },

  quit_battle(data: {}, store: Store<IState>) {
    store.dispatch(clearDropItems());
  },

  win_battle: handleWinBattle,
  battle_win: handleWinBattle,
  'battle/win': handleWinBattle,
};

export default battleHandler;
