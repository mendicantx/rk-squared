/**
 * @file
 * URLs for FFRK APIs
 */

export enum LangType {
  Gl = 'gl',
  Jp = 'jp',
}

export type BaseUrl = { [lang in LangType]: string };

const baseUrl: BaseUrl = {
  [LangType.Jp]: 'http://dff.sp.mbga.jp/dff/',
  [LangType.Gl]: 'http://ffrk.denagames.com/dff/',
};

export const dungeons = (lang: LangType, worldId: number) =>
  `${baseUrl[lang]}world/dungeons?world_id=${worldId}`;
