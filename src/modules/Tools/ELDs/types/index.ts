export interface EldVehicle {
  id: string
  vehicleId: string
  // Add other vehicle properties if needed
}

export interface EldDriver {
  id: string
  name: string
  // Add other driver properties if needed
}

export interface EldFile {
  id: string
  eldInfoId: string
  versionLabel: string
  versionLevel: number
}

export interface EldInfo {
  id: string
  name: string
  macAddress: string
  serialNumber: string
  mainVersionInfo: string
  bleVersionInfo: string
  malfunctions: string
  dateTime: string
  isConnected: boolean
  vehicle: EldVehicle
  driver: EldDriver
  files: EldFile[]
  hosTimeRemainder?: {
    cycleDuration: number
  }
}

export interface EldsListResponse {
  successResult: {
    totalCount: number
    data: EldInfo[]
    pageNumber: number
    pageSize: number
    isFirst: boolean
    isLast: boolean
  }
}

export interface UpdateEldFileRequest {
  eldDeviceId: string
  eldFileId: string
}
