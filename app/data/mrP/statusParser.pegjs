{
  let parsedNumberString = null;

  // Hack: Suppress warnings about unused functions.
  location;
  expected;
  error;
  peg$anyExpectation;

  function getX() {
    return options.xValue != null ? options.xValue : NaN;
  }
  function getElementPlaceholder() {
    // HACK: EnlirElement requires *something*, and we don't want to complicate
    // callers by making them deal with absence, so fall back to NE.
    return options.element != null ? options.element : 'NE';
  }
}

StatusEffect
  = head:EffectClause tail:(',' _ EffectClause)* {
    return util.pegList(head, tail, 2);
  }
  / "" { return []; }

EffectClause
  = StatMod / CritChance / CritDamage / StatusChance
  / Instacast / CastSpeed / InstantAtb / AtbSpeed
  / PhysicalBlink / MagicBlink / ElementBlink / Stoneskin / MagiciteStoneskin / FixedStoneskin / DamageBarrier
  / Awoken
  / SwitchDraw / SwitchDrawAlt / SwitchDrawStacking
  / ElementAttack / ElementResist / EnElement / EnElementWithStacking / LoseEnElement / LoseAnyEnElement
  / AbilityBuildup / DamageUp / Doublecast / Dualcast / Dualcast100
  / DoomTimer
  / CastSkill / GrantStatus
  / Counter
  / GainSb / SbGainUp
  / Taunt / Runic / ImmuneAttackSkills / ImmuneAttacks / ZeroDamage / EvadeAll / MultiplyDamage
  / TurnDuration / RemovedUnlessStatus / OnceOnly
  / BurstToggle / TrackUses / BurstOnly / BurstReset / ReplaceAttack / ReplaceAttackDefend / DisableAttacks / Ai


// --------------------------------------------------------------------------
// Stat mods

StatMod
  = stats:StatList _ value:SignedIntegerOrX "%" ignoreBuffCaps:(_ "(ignoring the buff stacking caps)")? {
    const result = { type: 'statMod', stats, value };
    if (ignoreBuffCaps) {
      result.ignoreBuffCaps = true;
    }
    return result;
  }

CritChance
  = "Critical chance =" value:IntegerOrX "%" { return { type: 'critChance', value }; }

CritDamage
  = "Critical hits deal" _ value:IntegerOrX "% more damage (additive with the base critical coefficient)" { return { type: 'critDamage', value }; }

StatusChance
  = "Increases the chance of inflicting Status by" _ value:IntegerOrX "%" { return { type: 'statusChance', value }; }


// --------------------------------------------------------------------------
// Cast speed

Instacast
  = "Cast"i _ "speed x999" "9"* _ forAbilities:ForAbilities? { return Object.assign({ type: 'instacast' }, forAbilities); }

CastSpeed
  = "Cast"i _ "speed x" value:DecimalNumber _ forAbilities:ForAbilities? { return Object.assign({ type: 'castSpeed', value }, forAbilities); }

InstantAtb
  = "Increase"i _ "ATB charge speed by x999" "9"* { return { type: 'instantAtb' }; }

AtbSpeed
  = "Increase"i _ "ATB charge speed by" _ value:DecimalNumber { return { type: 'atbSpeed', value }; }

ForAbilities
  = "for" _ what:ElementOrSchoolList _ "abilities" { return what; }
  / "for abilities that deal" _ element:ElementList _ "damage" { return { element }; }


// --------------------------------------------------------------------------
// Blinks and barriers

PhysicalBlink
  = "Evades"i _ "the next" _ level:Integer? _ "PHY" _ AttacksThatDeal _ "physical, missing HP or fixed damage or NAT" _ AttacksThatDeal _ "physical or fractional damage" { return { type: 'magicBlink', level: level || 1 }; }

MagicBlink
  = "Evades"i _ "the next" _ level:Integer? _ "non-PHY, non-NIN" _ AttacksThatDeal _ "magical, fractional or missing HP damage" { return { type: 'magicBlink', level: level || 1 }; }

ElementBlink
  = "Reduces"i _ "the damage of the next" _ AttacksThatDeal _ element:Element _ "damage to 0" { return { type: 'elementBlink', element, level: 1 }; }

AttacksThatDeal
  = "attack" "s"? _ "that deal" "s"?

Stoneskin
  = "Reduces" _ element:Element? _ "damage taken to 0, up to an amount" _ ("of damage")? _ "equal to" _ percentHp:Integer "% of the character's maximum HP" {
    return { type: 'stoneskin', element, percentHp };
  }

MagiciteStoneskin
  = "Reduces" _ element:Element _ "damage taken to 0, up to an amount" _ ("of damage")? _ "equal to" _ percentHp:Integer "% of the Magicite's maximum HP" {
    return { type: 'magiciteStoneskin', element, percentHp };
  }

FixedStoneskin
  = "Reduces damage taken from" _ skillType:SkillTypeAndList _ "attacks to 0, up to" _ damage:Integer _ "damage" {
    return { type: 'fixedStoneskin', skillType, damage };
  }

DamageBarrier
  = "Reduces damage taken by" _ value:Integer "% for the next" _
    attackCount:(
      count:Integer _ "attack" "s"? { return count; }
      / "attack" { return 1; }
    ) { return { type: 'damageBarrier', value, attackCount }; }


// --------------------------------------------------------------------------
// Awoken modes - These are mostly broken down within Enlir, but we treat them
// specially both because of their frequency and to handle their multiple
// references to individual schools or elements.

Awoken
  = type:AwokenType _ "abilities don't consume uses" _ rankBoost:AwokenRankBoost? rankCast:AwokenRankCast? dualcast:AwokenDualcast?
  & { return !rankCast || util.isEqual(type, rankCast); }
  & { return !dualcast || util.isEqual(type, dualcast); }
  { return { type: 'awoken', type, rankBoost: !!rankBoost, rankCast: !!rankCast, dualcast: !!dualcast }; }

AwokenType
  = element:ElementAndList { return { element }; }
  / school:SchoolAndList { return { school }; }

AwokenRankBoost
  = "and deal 5/10/15/20/30% more damage at ability rank 1/2/3/4/5"

AwokenRankCast
  = ", cast speed x2.00/2.25/2.50/2.75/3.00 for" _ type:AwokenType _ "abilities at ability rank 1/2/3/4/5" { return type; }

AwokenDualcast
  = ", dualcasts" _ type:AwokenType _ "abilities" { return type; }


// --------------------------------------------------------------------------
// Switch draw - These are described as broken down within Enlir, but we treat
// them specially because of how common they are.

SwitchDraw
  = part1:SwitchDrawPart "," _ part2:SwitchDrawPart ", lasts 1 turn" { return { type: 'switchDraw', elements: [part1, part2] }; }

SwitchDrawPart
  = "Grants"i _ "Attach" _ element1:Element _ "after using a" "n"? _ element2:Element _ "ability"
  & { return element1 === element2; } { return element1; }

SwitchDrawAlt
  = "Grants"i _ "Attach" _ elements1:ElementSlashList _ "after using a" "n"? _ elements2:ElementSlashList _ "ability, lasts 1 turn"
  & { return util.isEqual(elements1, elements2); }
    { return { type: 'switchDraw', elements: elements1 }; }

SwitchDrawStacking
  = "Grants Attach" _ elements1:ElementSlashList _ level:Integer? _ "with Stacking after using a"
    _ elements2:ElementSlashList _ "ability, lasts 1 turn"
    & { return util.isEqual(elements1, elements2); }
    { return { type: 'switchDrawStacking', elements: elements1, level }; }


// --------------------------------------------------------------------------
// Element buffs and debuffs

ElementAttack
  = sign:IncreasesOrReduces _ element:Element _ "damage dealt by" _ value:Integer _ "%" ", cumulable"? { return { type: 'elementAttack', element, value: value * sign }; }

ElementResist
  = element:ElementOrPlaceholder _ "Resistance"i _ value:SignedIntegerOrX "%" ", cumulable"? { return { type: 'elementResist', element, value }; }

EnElement
  = "Replaces Attack command, increases" _ element:Element _ "damage dealt by 50/80/120% (abilities) or 80/100/120% (Soul Breaks)," _ element2:Element _ "resistance +20%" {
    return { type: 'enElement', element };
  }

EnElementWithStacking
  = "Increase Attach" _ element:Element _ "Level by" _ level:Integer _ "and increase Max Attach Element Level by 2, up to Attach" _ element2:Element _ "3" {
    return { type: 'enElementWithStacking', element, level };
  }

LoseEnElement
  = "Decrease Attach" _ element:Element _ "Level by" _ level:Integer { return { type: 'loseEnElement', element, level }; }

LoseAnyEnElement
  = "Decrease any attached element's level by" _ level:Integer { return { type: 'loseEnElement', level }; }


// --------------------------------------------------------------------------
// Abilities and elements

AbilityBuildup
  = school:School _ "abilities deal" _ increment:Integer "% more damage for each" _ schoolUsed:School _ "ability used, up to +" max:Integer "%" {
    return { type: 'abilityBuildup', school, schoolUsed, increment, max };
  }

DamageUp
  = what:ElementOrSchoolList _ ("attacks" / "abilities") _ "deal" _ value:Integer "% more damage" { return Object.assign({ type: 'damageUp', value }, what); }

Doublecast
  = "dualcasts"i _ what:ElementOrSchoolList _ ("abilities" / "attacks") _ "consuming an extra ability use" { return Object.assign({ type: 'doublecast' }, what); }

Dualcast100
  = "dualcasts"i _ what:ElementOrSchoolList _ ("abilities" / "attacks") { return Object.assign({ type: 'dualcast', chance: 100 }, what); }

Dualcast
  = chance:Integer "% chance to dualcast" _ what:ElementOrSchoolList _ ("abilities" / "attacks") { return Object.assign({ type: 'dualcast', chance }, what); }


// --------------------------------------------------------------------------
// Doom

DoomTimer
  = sign:IncreasesOrReduces _ "the character's Doom timer by" _ value:Integer _ "when set" { return { type: 'doomTimer', value: value * sign }; }


// --------------------------------------------------------------------------
// Abilities and status effects

CastSkill
  = "casts"i _ skill:AnySkillName _ trigger:Trigger? _ condition:Condition? { return util.addCondition({ type: 'castSkill', skill, trigger }, condition); }

GrantStatus
  = verb:StatusVerb _ status:StatusName _ who:Who? _ trigger:Trigger? _ condition:Condition? { return util.addCondition({ type: 'grantsStatus', status, trigger, who }, condition); }


// --------------------------------------------------------------------------
// Counter

Counter
  = when:CounterWhen _ enemy:"enemy"? _ skillType:SkillType _ "attacks with" _ counter:CounterResponse {
    return Object.assign({ type: 'counter', skillType, enemyOnly: !!enemy, counter }, when);
  }

CounterWhen
  = "counters" { return {}; }
  // Statuses use "chance of countering", legend materia use "chance to counter"
  / chance:Integer ("% chance of countering" / "% chance to counter") { return { chance }; }

CounterResponse
  = "Attack" { return undefined; }
  / skill:AnySkillName { return { skill }; }
  / "an ability (single," _ attackMultiplier:DecimalNumber _ damageType:("physical" / "magical") _ ")" {
    const overrideSkillType = damageType === 'physical' ? 'PHY' : 'BLK';
    return { attack: { type: 'attack', numAttacks: 1, attackMultiplier, overrideSkillType } };
  }


// --------------------------------------------------------------------------
// Soul Break points

GainSb
  = "Grants"i _ value:Integer _ "SB points" _ trigger:Trigger { return { type: 'gainSb', value, trigger}; }

SbGainUp
  = what:ElementOrSchoolList _ "attacks grant" _ value:Integer _ "% more SB points" { return Object.assign({ type: 'sbGainUp', value }, what); }


// --------------------------------------------------------------------------
// Taunt, runic, immunities

Taunt
  = "Taunts"i _ "single-target" _ skillType:SkillTypeAndList _ "attacks" { return { type: 'taunt', skillType }; }

Runic
  = "Absorbs"i _ skillType:SkillTypeAndList _ "attacks to restore 1 consumed ability use" { return { type: 'runic', skillType }; }

ImmuneAttackSkills
  = "Can't"i _ "be hit by" _ ranged:("ranged")? _ nonRanged:("non-ranged")? _ skillType:SkillTypeList _ "attacks" {
    return {
      type: 'immune',
      attacks: true,
      skillType,
      ranged: !!ranged,
      nonRanged: !!nonRanged,
    }
  }

ImmuneAttacks
  = "Can't be hit by any attack" {
    return {
      type: 'immune',
      attacks: true,
    }
  }

ZeroDamage
  = "Reduces"i _ what:("physical" / "magical" / "all") _ "damage received to 0" { return { type: 'zeroDamage', what }; }

EvadeAll
  // Galuf's status; aka Peerless
  = "Evades"i _ "all attacks" { return { type: 'evadeAll' }; }

MultiplyDamage
  = "Multiplies all damage received by" _ value:IntegerOrX { return { type: 'multipleDamage', value }; }


// --------------------------------------------------------------------------
// Special durations

TurnDuration
  = "lasts" _ "for"? _ value:Integer _ "turn" "s"? { return { type: 'duration', duration: { value, units: 'turns' } }; }

RemovedUnlessStatus
  = "Removed"i _ "if" _ "the"? _ "user" _ ("hasn't" / "doesn't have") _ any:"any"? _ status:StatusName { return { type: 'removedUnlessStatus', any: !!any, status }; }

OnceOnly
  = "Removed"i _ "after triggering" { return { type: 'onceOnly' }; }


// --------------------------------------------------------------------------
// Other

BurstToggle
  = "Affects"i _ "certain Burst Commands"

TrackUses
  = "Keeps"i _ "track of the" _ ("number of")? _ "uses of" _ skill:AnySkillName { return { type: 'trackUses', skill }; }

BurstOnly
  = "removed if the user hasn't Burst Mode" { return { type: 'burstOnly' }; }

BurstReset
  = "reset upon refreshing Burst Mode" { return { type: 'burstReset' }; }

ReplaceAttack
  = "Replaces"i _ "the Attack command" { return { type: 'replaceAttack' }; }

ReplaceAttackDefend
  = "Replaces"i _ "the Attack and Defend commands" { return { type: 'replaceAttackDefend' }; }

DisableAttacks
  = "Disables"i _ skillType:(SkillTypeAndList / "Jump") _ "attacks" { return { type: 'disableAttacks', skillType }; }

Ai
  = "Affects"i _ GenericName _ "behaviour" { return { type: 'ai' }; }


// --------------------------------------------------------------------------
// Triggers

Trigger
  = "after using" _ count:TriggerCount _ element:ElementList _ requiresAttack:AbilityOrAttack { return { type: 'elementAbility', element, count, requiresAttack }; }
  / "after using" _ count:TriggerCount _ ("ability" / "abilities") { return { type: 'anyAbility', count }; }
  / "after using" _ count:TriggerCount _ school:SchoolList _ requiresAttack:AbilityOrAttack { return { type: 'schoolAbility', school, count, requiresAttack }; }
  / "after dealing a critical hit" { return { type: 'crit' }; }
  / "when removed" { return { type: 'whenRemoved' }; }

AbilityOrAttack
  = ("ability" / "abilities") { return false; }
  / "attack" "s"? { return true; }

TriggerCount
  = ArticleOrNumberString
  / UseCount
  / values:IntegerSlashList "+" { return values; }
  / Integer
  / "" { return 1; }


// --------------------------------------------------------------------------
// Conditions

Condition
  = "when" _ "equipping" _ article:("a" "n"? { return text(); }) _ equipped:[a-z- ]+ { return { type: 'equipped', article, equipped: equipped.join('') }; }

  // "Level-like" or "counter-like" statuses, as seen on newer moves like
  // Thief (I)'s glint or some SASBs.  These are more specialized, so they need
  // to go before general statuses.
  / "scaling" _ "with" _ status:StatusName _ "level" { return { type: 'scaleWithStatusLevel', status }; }
  / "at" _ status:StatusName _ "levels" _ value:IntegerAndList { return { type: 'statusLevel', status, value }; }
  / "if" _ "the"? _ "user" _ "has" _ status:StatusName _ "level" _ value:IntegerSlashList { return { type: 'statusLevel', status, value }; }
  / "if" _ "the"? _ "user" _ "has" _ "at" _ "least" _ value:Integer _ status:StatusName { return { type: 'statusLevel', status, value }; }

  // If Doomed - overlaps with the general status support below
  / ("if" _ "the" _ "user" _ "has" _ "any" _ "Doom" / "with" _ "any" _ "Doom") { return { type: 'ifDoomed' }; }

  // General status
  / "if" _ "the"? _ who:("user" / "target") _ "has" _ any:"any"? _ status:(StatusName (OrList StatusName)* { return text(); }) {
    return {
      type: 'status',
      status,  // In string form - callers must separate by comma, "or", etc.
      who: who === 'user' ? 'self' : 'target',
      any: !!any
    };
  }

  // Beginning of attacks and skills (like Passionate Salsa)

  // Scaling with uses - both specific counts and generically
  / ("at" / "scaling" _ "with") _ useCount:IntegerSlashList _ "uses" { return { type: 'scaleUseCount', useCount }; }
  / "scaling" _ "with" _ "uses" { return { type: 'scaleWithUses' }; }
  / ("scaling" / "scal.") _ "with" _ skill:AnySkillName _ "uses" { return { type: 'scaleWithSkillUses', skill }; }

  / "after" _ useCount:UseCount _ skill:AnySkillName _ "uses" { return { type: 'afterUseCount', skill, useCount }; }
  / "on" _ "first" _ "use" { return { type: 'afterUseCount', useCount: { from: 1, to: 1 } }; }
  / "on" _ first:Integer "+" _ "use" "s"? { return { type: 'afterUseCount', useCount: { from: first } }; }

  // Beginning of attack-specific conditions
  / "if" _ "all" _ "allies" _ "are" _ "alive" { return { type: 'alliesAlive' }; }
  / "if" _ character:CharacterNameList _ ("is" / "are") _ "alive" { return { type: 'characterAlive', character }; }
  / "if" _ count:IntegerSlashList _ "of" _ character:CharacterNameList _ "are" _ "alive" { return { type: 'characterAlive', character, count }; }
  / "if" _ count:IntegerSlashList? _ character:CharacterNameList _ ("is" / "are") _ "in" _ "the" _ "party" { return { type: 'characterInParty', character, count }; }
  / "if" _ count:IntegerSlashList _ "females" _ "are" _ "in" _ "the" _ "party" { return { type: 'females', count }; }
  / "if" _ count:Integer _ "or" _ "more" _ "females" _ "are" _ "in" _ "the" _ "party" { return { type: 'females', count }; }

  / "if" _ count:IntegerSlashList _ "allies" _ "in" _ "air" { return { type: 'alliesJump', count }; }

  / "if" _ "the" _ "user's" _ "Doom" _ "timer" _ "is" _ "below" _ value:IntegerSlashList { return { type: 'doomTimer', value }; }
  / "if" _ "the" _ "user's" _ "HP" _ ("is" / "are") _ "below" _ value:IntegerSlashList "%" { return { type: 'hpBelowPercent', value }; }
  / "if" _ "the" _ "user" _ "has" _ value:IntegerSlashList _ SB _ "points" { return { type: 'soulBreakPoints', value }; }

  / "if" _ count:IntegerSlashList _ "of" _ "the" _ "target's" _ "stats" _ "are" _ "lowered" { return { type: 'targetStatBreaks', count }; }
  / "if" _ "the" _ "target" _ "has" _ count:IntegerSlashList _ "ailments" { return { type: 'targetStatusAilments', count }; }

  / "if" _ "exploiting" _ "elemental" _ "weakness" { return { type: 'vsWeak' }; }
  / "if" _ "the"? _ "user" _ "is" _ "in" _ "the"? _ "front" _ "row" { return { type: 'inFrontRow' }; }

  / "if" _ "the" _ "user" _ ("took" / "has" _ "taken") _ count:IntegerSlashList _ skillType:SkillTypeList _ "hits" { return { type: 'hitsTaken', count, skillType }; }
  / "if" _ "the" _ "user" _ ("took" / "has" _ "taken") _ count:IntegerSlashList _ "attacks" { return { type: 'attacksTaken', count }; }

  / "if" _ "the" _ "user" _ "used" _ count:IntegerSlashList _ "damaging" _ "actions" { return { type: 'damagingActions', count }; }
  / "with" _ count:IntegerSlashList _ "other" _ school:School _ "users" { return { type: 'otherAbilityUsers', count, school }; }
  / "at" _ count:IntegerSlashList _ "different" _ school:School _ "abilities" _ "used" { return { type: 'differentAbilityUses', count, school }; }
  / "if" _ "the" _ "user" _ "used" _ count:IntegerSlashList _ school:SchoolList _ "abilities" _ "during" _ "the" _ "status" { return { type: 'abilitiesUsedDuringStatus', count, school }; }
  / "if" _ "the" _ "user" _ "used" _ count:IntegerSlashList _ school:SchoolList _ "abilities" { return { type: 'abilitiesUsed', count, school }; }
  / "if" _ "the" _ "user" _ "used" _ count:IntegerSlashList _ element:ElementList _ "attacks" _ "during" _ "the" _ "status" { return { type: 'attacksDuringStatus', count, element }; }
  / "if" _ value:IntegerSlashList _ "damage" _ "was" _ "dealt" _ "during" _ "the" _ "status" {
    lastDamageDuringStatus = util.lastValue(value);
    lastDamageDuringStatusElement = undefined;
    return { type: 'damageDuringStatus', value };
  }
  / "if" _ "the" _ "user" _ "dealt" _ value:IntegerSlashList _ "damage" _ "during" _ "the" _ "status" {
    lastDamageDuringStatus = util.lastValue(value);
    lastDamageDuringStatusElement = undefined;
    return { type: 'damageDuringStatus', value };
  }
  / "if" _ "the" _ "user" _ "dealt" _ value:IntegerSlashList _ "damage" _ "with" _ element:ElementList _ "attacks" _ "during" _ "the" _ "status" {
    lastDamageDuringStatus = util.lastValue(value);
    lastDamageDuringStatusElement = element;
    return { type: 'damageDuringStatus', value, element };
  }
  / "if" _ "the" _ "final" _ "damage" _ "threshold" _ "was" _ "met" { return { type: 'damageDuringStatus', value: lastDamageDuringStatus, element: lastDamageDuringStatusElement }; }
  // Alternate phrasing - this appears to be an error, so we smooth it out. TODO: Fix upstream.
  / "scaling" _ "with" _ school:School _ "attacks" _ "used" _ "(" _ count:IntegerSlashList _ ")" { return { type: 'abilitiesUsed', count, school }; }

  / "at" _ "rank" _ "1/2/3/4/5" (_ "of" _ "the" _ "triggering" _ "ability")? { return { type: 'rankBased' }; }
  / "at" _ "ability" _ "rank" _ "1/2/3/4/5" { return { type: 'rankBased' }; }

  // Alternate status phrasing.  For example, Stone Press:
  // "One single attack (3.00/4.00/7.00) capped at 99999 at Heavy Charge 0/1/2")
  / "at" _ status:StatusName { return { type: 'status', status, who: 'self' }; }

  // Stat thresolds (e.g., Tiamat, Guardbringer)
  / "at" _ value:IntegerSlashList _ stat:Stat { return { type: 'statThreshold', stat, value }; }


// --------------------------------------------------------------------------
// Lower-level game rules

StatusVerb
  = ("grants"i / "causes"i / "removes"i / "doesn't"i _ "remove") {
    return text().toLowerCase().replace(/\s+/g, ' ');
  }

StatusName "status effect"
  = (
    // Stat mods in particular have a distinctive format.
    ([A-Z] [a-z]+ _)? StatList _ SignedInteger '%'
  / GenericName
  / "?"
  ) {
    return text();
  }

// These probably don't cover all abilities and characters, but it works for now.
AbilityName
  = UppercaseWord (_ UppercaseWord)* { return text(); }
CharacterName
  = UppercaseWord (_ (UppercaseWord / "of"))* (_ "(" [A-Z] [A-Za-z0-9-]+ ")")? { return text(); }

// Character names, for "if X are in the party."  Return these as text so that
// higher-level code can process them.
CharacterNameList
  = CharacterName ((_ "&" _ / "/" / _ "or" _) CharacterName)* { return text(); }

// Any skill - burst commands, etc. ??? is referenced in one particular status.
AnySkillName
  = GenericName / '???'

// Generic names.  Somewhat complex expression to match these.  Developed for
// statuses, so the rules may need revision for other uses.
GenericName
  = (
    (GenericNameWord
      // Names can start with numbers, but require a word after that, so that
      // "100%" doesn't get parsed as a status name by itself.
      / IntegerSlashList '%' !(_ "hit" _ "rate") _ GenericNameWord
      / SignedIntegerSlashList [%+]? _ GenericNameWord
    )
    (_
      (
        GenericNameWord

        // Articles, etc., are okay, but use &' ' to make sure they're at a
        // word bounary.
        / (('in' / 'or' / 'of' / 'the' / 'with' / '&' / 'a') & ' ')
        // "for" in particular needs extra logic to ensure that it's part of
        // status words instead of part of the duration.
        / "for" _ GenericNameWord

        / SignedIntegerSlashList [%+]?
        / [=*]? IntegerSlashList [%+]?
        / '(' ("Black Magic" / "White Magic" / [A-Za-z-0-9/]+) ')'
      )
    )*
  ) {
    return text();
  }
GenericNameWord = ([A-Z] [a-zA-Z-'/]* (':' / '...' / '!' / '+')?)

Stat "stat"
  = ("ATK" / "DEF" / "MAG" / "RES" / "MND" / "SPD" / "ACC" / "EVA") {
    return text().toLowerCase();
  }

StatList "stat list"
  = head:Stat tail:(AndList Stat)* { return util.pegList(head, tail, 1, true); }

Who
  = "to" _ "the"? _ "user" { return 'self'; }
  / "to" _ "the" _ "target" { return 'target'; }
  / "to" _ "all" _ "enemies" { return 'enemies'; }
  / "to" _ "all" _ "allies" row:(_ "in" _ "the" _ row:("front" / "back" / "character's") _ "row" { return row === "character's" ? 'sameRow' : row + 'Row'; })? {
    return row || 'party';
  }
  / "to" _ "the" _ "lowest" _ "HP%" _ "ally" { return 'lowestHpAlly'; }
  / "to" _ "a" _ "random" _ "ally" _ "without" _ "status" { return 'allyWithoutStatus'; }
  / "to" _ "a" _ "random" _ "ally" _ "with" _ "negative" _ "status"? _ "effects" { return 'allyWithNegativeStatus'; }
  / "to" _ "a" _ "random" _ "ally" _ "with" _ "KO" { return 'allyWithKO'; }

SkillType "skill type"
  = "PHY"
  / "WHT"
  / "BLK"
  / "BLU"
  / "SUM"
  / "NAT"
  / "NIN"

SkillTypeList "skill type list"
  = head:SkillType tail:(OrList SkillType)* { return util.pegList(head, tail, 1, true); }

SkillTypeAndList "skill type list"
  = head:SkillType tail:(AndList SkillType)* { return util.pegList(head, tail, 1, true); }

Element "element"
  = "Fire"
  / "Ice"
  / "Lightning"
  / "Earth"
  / "Wind"
  / "Water"
  / "Holy"
  / "Dark"
  / "Poison"
  / "NE"

ElementOrPlaceholder
  = Element
  / "[Element]" { return getElementPlaceholder(); }

ElementList "element list"
  = head:Element tail:(OrList Element)* { return util.pegList(head, tail, 1, true); }

ElementAndList "element list"
  = head:Element tail:(AndList Element)* { return util.pegList(head, tail, 1, true); }

ElementSlashList "element list"
  = head:Element tail:("/" Element)* { return util.pegList(head, tail, 1, true); }

School "ability school"
  = "Bard"
  / "Black Magic"
  / "Celerity"
  / "Combat"
  / "Dancer"
  / "Darkness"
  / "Dragoon"
  / "Heavy"
  / "Knight"
  / "Machinist"
  / "Monk"
  / "Ninja"
  / "Samurai"
  / "Sharpshooter"
  / "Special"
  / "Spellblade"
  / "Summoning"
  / "Support"
  / "Thief"
  / "White Magic"
  / "Witch"

SchoolList "school list"
  = head:School tail:(OrList School)* { return util.pegList(head, tail, 1, true); }

SchoolAndList "school list"
  = head:School tail:(AndList School)* { return util.pegList(head, tail, 1, true); }

SB = "Soul" _ "Break" / "SB"
Maximum = "maximum" / "max" "."?

// "x + yn"
UseCount = x:IntegerSlashList y:(_ "+" _ y:Integer _ "n" { return y; }) { return { x, y }; }

ElementOrSchoolList
  = school:SchoolAndList { return { school }; }
  / element:ElementAndList { return { element }; }


// --------------------------------------------------------------------------
// Primitive types

IncreasesOrReduces
  = "increases"i { return 1; }
  / "reduces"i { return -1; }

AndList
  = (',' _ 'and'? _) / (_ 'and' _)

OrList
  = (',' _ 'or'? _) / (_ 'or' _)

NumberString "numeric text"
  = numberString:[a-zA-Z\-]+
  & { parsedNumberString = util.parseNumberString(numberString.join('')); return parsedNumberString != null; }
  { return parsedNumberString; }

ArticleOrNumberString
  = NumberString
  / ("a" "n"?) { return 1; }


DecimalNumber "decimal number"
  = ([0-9.]+ / '?') { return parseFloat(text()) }

Integer "integer"
  = ([0-9]+ / '?') { return parseInt(text(), 10); }

IntegerOrX "integer or X"
  = Integer / "X" { return getX(); }

SignedInteger "signed integer"
  = sign:[+-] _ value:[0-9]+ { return parseInt(sign + value.join(''), 10); }

SignedIntegerOrX "signed integer or X"
  = sign:[+-] _ value:([0-9]+ / "X") {
    if (value === 'X') {
      return getX();
    } else {
      return parseInt(sign + value.join(''), 10);
    }
  }

IntegerSlashList "slash-separated integers"
  = head:Integer tail:('/' Integer)* { return util.pegSlashList(head, tail); }

SignedIntegerSlashList "slash-separated signed integers"
  = sign:[+-] _ values:IntegerSlashList {
    const applySign = (i) => sign === '-' ? -i : i;
    if (Array.isArray(values)) {
      return values.map(applySign);
    } else {
      return applySign(values);
    }
  }



IntegerAndList "integers separated with commas and 'and'"
  = head:Integer tail:((','? _ 'and' _ /',' _) Integer)* { return util.pegSlashList(head, tail); }


UppercaseWord
  = [A-Z] [A-Za-z]+ { return text(); }

_ "whitespace"
  = [ \t\n\r]*
