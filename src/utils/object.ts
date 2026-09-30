export const deepClone = (obj: any): any => {
  return JSON.parse(JSON.stringify(obj))
}

export function unproxify<T>(val: T): T {
  if (Array.isArray(val)) {
    return val.map(unproxify) as T
  }

  if (val !== null && typeof val === 'object') {
    const result: any = {}
    for (const [key, value] of Object.entries(val)) {
      result[key] = unproxify(value)
    }
    return result
  }

  return val
}

export const capitalizeKeys = <T extends Record<string, any>>(
  obj: T
): Record<Capitalize<keyof T & string>, T[keyof T]> => {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [
      (key.charAt(0).toUpperCase() + key.slice(1)) as Capitalize<typeof key>,
      value,
    ])
  ) as Record<Capitalize<keyof T & string>, T[keyof T]>
}

export const clearObject = <T extends Record<string, any>>(
  obj: T,
  doNotKeys: Array<string> = []
): void => {
  for (const key in obj) {
    if (doNotKeys.includes(key)) continue
    if (typeof obj[key] === 'string') {
      obj[key] = null as T[typeof key]
    } else if (Array.isArray(obj[key])) {
      obj[key] = [] as T[typeof key]
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      clearObject(obj[key])
    } else {
      obj[key] = null as T[typeof key]
    }
  }
}
