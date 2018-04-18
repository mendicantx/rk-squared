import enlir from '../data/enlir';
import * as urls from '../data/urls';
import * as schemas from './schemas';
import { Handler } from './types';

import { Store } from 'redux';

import { clearDropItems, DropItem, setDropItems } from '../actions/battle';
import { itemsById, ItemType } from '../data/items';
import { IState } from '../reducers';

// FIXME: Proper logging
// tslint:disable no-console

enum DropItemType {
  Gil = 11,
  Potion = 21,
  HiPotion = 22,
  XPotion = 23,
  Ether = 31,
  HiEther = 32,
  Treasure = 41,  // includes relics (unconfirmed), upgrade materials (unconfirmed), magicite, growth eggs
  Orb = 51,
  Gysahl = 61,    // item ID 95001014, rarity 1
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
  [DropItemType.Gysahl]: 'Gysahl Greens'
};

const toNumber = (x: number | string | undefined) => x == null ? undefined : +x;

function normalizeItem(item: schemas.DropItem) {
  return {
    ...item,
    item_id: toNumber(item.item_id),
    type: +item.type,
    amount: item.num != null ? toNumber(item.num) : item.amount,
  };
}

function assetKey({ type, rarity }: { type: number, rarity: number }) {
  return `drop_item_${type}_${rarity}`;
}

function generateItemName({ item_id, rarity, type }: { item_id?: number, type: number, rarity: number }) {
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

function convertDropItemList(data: schemas.GetBattleInit, dropItemData: schemas.DropItem[], dropItems: DropItem[]) {
  for (const i of dropItemData) {
    const item = normalizeItem(i);
    let imageUrl = urls.asset(data.battle.assets[assetKey(item)]);
    switch (item.type) {
      case DropItemType.Gil:
      case DropItemType.Gysahl:
        if (item.type === DropItemType.Gil) {
          imageUrl = urls.url('image/common_item/92000000.png');
        }
        dropItems.push({
          amount: item.amount,
          type: item.type,
          rarity: item.rarity,
          name: `${item.amount} ${dropItemTypeName[item.type]}`,
          imageUrl,
        });
        break;
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
        const id = item.item_id as number;
        let name: string;
        if (enlir.magicites[id]) {
          name = enlir.magicites[id].MagiciteName;
          imageUrl = urls.magiciteImage(id);
        } else if (enlir.relics[id]) {
          name = enlir.relics[id].Description;
          imageUrl = urls.relicImage(id, item.rarity);
        } else {
          name = generateItemName(item);
        }
        // FIXME: Growth eggs, motes
        dropItems.push({
          amount: item.amount,
          rarity: item.rarity,
          type: item.type,
          name: nameWithAmount(name, item.amount),
          itemId: item.item_id,
          imageUrl,
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
            imageUrl: urls.itemImage(id, ItemType.Orb),
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

function convertBattleDropItems(data: schemas.GetBattleInit): DropItem[] {
  const dropItems: DropItem[] = [];
  for (const round of data.battle.rounds) {
    convertDropItemList(data, round.drop_item_list, dropItems);
    for (const enemy of round.enemy) {
      for (const children of enemy.children) {
        convertDropItemList(data, children.drop_item_list, dropItems);
      }
    }
  }
  return dropItems;
}

const battle: Handler = {
  escape_battle(data: schemas.GetBattleInit, store: Store<IState>) {
    store.dispatch(clearDropItems());
  },

  get_battle_init_data(data: schemas.GetBattleInit, store: Store<IState>) {
    const items = convertBattleDropItems(data);
    store.dispatch(setDropItems(items));
  },

  lose_battle(data: schemas.GetBattleInit, store: Store<IState>) {
    store.dispatch(clearDropItems());
  },

  win_battle(data: schemas.GetBattleInit, store: Store<IState>) {
    store.dispatch(clearDropItems());
  },
};

export default battle;