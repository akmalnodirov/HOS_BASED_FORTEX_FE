export interface AiDriverChoice {
  driverId: string
  displayName: string
}

const nameWords = (name: string) =>
  name
    .toLowerCase()
    .split(/[^\p{L}]+/u)
    .filter((word) => word.length >= 3)

/**
 * Drivers whose name words appear in the request, best match first. It only suggests:
 * the dispatcher always picks the driver, even when there is a single match.
 */
export function matchDrivers(text: string, drivers: AiDriverChoice[], limit = 5): AiDriverChoice[] {
  const requestWords = new Set(nameWords(text))
  return drivers
    .map((driver) => ({
      driver,
      score: nameWords(driver.displayName).filter((word) => requestWords.has(word)).length,
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.driver.displayName.localeCompare(right.driver.displayName))
    .slice(0, limit)
    .map((entry) => entry.driver)
}
