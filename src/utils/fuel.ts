export enum FuelKind {
  Diesel = 0,
  Unleaded = 1,
  Premium = 2,
  DEF = 3,
  Midgrade = 4,
  Propane = 5,
  Super = 6,
  UnleadedPlus = 7,
}

export const FUEL_OPTIONS = [
  { label: 'Diesel', value: FuelKind.Diesel },
  { label: 'Unleaded', value: FuelKind.Unleaded },
  { label: 'Premium', value: FuelKind.Premium },
  { label: 'DEF', value: FuelKind.DEF },
  { label: 'Midgrade', value: FuelKind.Midgrade },
  { label: 'Propane', value: FuelKind.Propane },
  { label: 'Super', value: FuelKind.Super },
  { label: 'Unleaded Plus', value: FuelKind.UnleadedPlus },
]