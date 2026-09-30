export class ApiEndpoints {
  // Base URLs
  private static readonly BASE_URL = '/api'
  private static readonly MONITORING_URL = `${this.BASE_URL}/monitoring`
  static readonly MONITORING_PROVIDER = `${this.MONITORING_URL}/provider`
  static readonly MONITORING_CARRIER = `${this.MONITORING_URL}/carrier`
  private static readonly TRACKING_URL = `${this.BASE_URL}/tracking`
  private static readonly FUEL_URL = `${this.BASE_URL}/fuel`
  private static readonly GEO_URL = `${this.BASE_URL}/geo-locations`
  private static readonly BOOST_EVENTS_URL = `${this.BASE_URL}/boost-events`
  private static readonly BOOST_URL = `${this.BASE_URL}/boost`
  private static readonly OPTIMIZE_URL = `${this.BASE_URL}/optimize`
  private static readonly SESSIONS_URL = `${this.BASE_URL}/sessions`
  private static readonly TABS_URL = `${this.BASE_URL}/tabs`
  private static readonly DRIVERS_URL = `${this.BASE_URL}/drivers`
  private static readonly CARRIERS_URL = `${this.BASE_URL}/carriers`

  // Tracking endpoints
  static readonly TRACKING_DRIVER_DAILY_EVENTS = `${this.TRACKING_URL}/driver-daily-events`
  static readonly TRACKING_DRIVERS_LAST_EVENTS = `${this.TRACKING_URL}/drivers-last-events`
  static readonly TRACKING_DRIVERS_EVERY = `${this.TRACKING_URL}/driver-events-with-status`
  static readonly TRACKING_DRIVER_LAST_EVENT = `${this.TRACKING_URL}/driver-last-event-after`
  static readonly TRACKING_CREATE_LIVE_SHARE = `${this.TRACKING_URL}/create-live-share`
  static readonly TRACKING_DRIVER_RECENT_EVENTS = `${this.TRACKING_URL}/driver-recent-events`

  // Driver [Id] endpoints
  private static readonly DRIVER_LOGS_URL = `${this.BASE_URL}/driver-logs`
  static readonly DRIVER_LOGS_PROCESSING_EVENTS_NEW = `${this.DRIVER_LOGS_URL}/processing-events-new`
  static readonly DRIVER_LOGS_GRAPH = `${this.DRIVER_LOGS_URL}/daily-graph`
  static readonly DRIVER_LOGS_DAILY_GRAPH = `${this.DRIVER_LOGS_URL}/daily-graph`
  static readonly DRIVER_LOGS_DAILY_EVENTS = `${this.DRIVER_LOGS_URL}/daily-events`
  static readonly DRIVER_LOGS_DAILY_SUMMARY = `${this.DRIVER_LOGS_URL}/daily-summary`
  static readonly DRIVER_LOGS_DAILY_PIXEL_VIOLATIONS = `${this.DRIVER_LOGS_URL}/daily-pixel-violations`
  static readonly DRIVER_LOGS_WEEKLY_VIOLATIONS = `${this.DRIVER_LOGS_URL}/weekly-violations`
  static readonly DRIVER_LOGS_DAILY_TIME_REMAINDER = `${this.DRIVER_LOGS_URL}/daily-time-remainder`
  static readonly DRIVER_LOGS_BOOST_FREE_TIMES = `${this.DRIVER_LOGS_URL}/boost-free-times`
  static readonly DRIVER_LOGS_DOWNLOAD_CSV = `${this.DRIVER_LOGS_URL}/download-csv`

  // Driver Infos endpoints
  static readonly DRIVER_INFOS = `${this.BASE_URL}/driver-infos`
  static readonly DRIVER_INFOS_TIME_ZONE = (driverId: string) => `${this.DRIVER_INFOS}/${driverId}/time-zone`

  // Sessions endpoints (used by Boost)
  static readonly SESSIONS = this.SESSIONS_URL
  static readonly SESSIONS_FILTER = `${this.SESSIONS_URL}/filter`

  // Tabs endpoints (used by Boost)
  static readonly TABS = this.TABS_URL
  static readonly TABS_ADD = `${this.TABS_URL}/add`
  static readonly TABS_SESSION = (sessionId: string) => `${this.TABS_URL}/session/${sessionId}`
  static readonly TABS_UPDATE = (tabId: string) => `${this.TABS_URL}/update/${tabId}`

  // Boost Events endpoints
  static readonly BOOST_EVENTS = this.BOOST_EVENTS_URL
  static readonly BOOST_EVENTS_LATEST = `${this.BOOST_EVENTS_URL}/latest`
  static readonly BOOST_EVENTS_HISTORY = `${this.BOOST_EVENTS_URL}/history`
  static readonly BOOST_EVENTS_LATEST_GRAPH = `${this.BOOST_EVENTS_URL}/latest-graph`
  static readonly BOOST_EVENTS_HISTORY_GRAPH = `${this.BOOST_EVENTS_URL}/history-graph`
  static readonly BOOST_EVENTS_LATEST_RESET_PIN_TIMES = `${this.BOOST_EVENTS_URL}/latest-reset-pin-times`
  static readonly BOOST_EVENTS_HISTORY_RESET_PIN_TIMES = `${this.BOOST_EVENTS_URL}/history-reset-pin-times`
  static readonly BOOST_EVENTS_ADD = `${this.BOOST_EVENTS_URL}/add`
  static readonly BOOST_EVENTS_UPDATE = (eventId: string) => `${this.BOOST_EVENTS_URL}/update/${eventId}`
  static readonly BOOST_EVENTS_DELETE = `${this.BOOST_EVENTS_URL}/delete`
  static readonly BOOST_EVENTS_MULTI_DELETE = `${this.BOOST_EVENTS_URL}/multi-delete`
  static readonly BOOST_EVENTS_MULTI_UPDATE = `${this.BOOST_EVENTS_URL}/multi-update`
  static readonly BOOST_EVENTS_COPY = `${this.BOOST_EVENTS_URL}/copy`
  static readonly BOOST_EVENTS_REVERT = `${this.BOOST_EVENTS_URL}/revert`
  static readonly BOOST_EVENTS_MOVE_TIME = `${this.BOOST_EVENTS_URL}/move-time`
  static readonly BOOST_EVENTS_SUBMIT = (sessionId: string) => `${this.BOOST_EVENTS_URL}/submit/${sessionId}`
  static readonly BOOST_EVENTS_ROLLBACK = (sessionId: string) => `${this.BOOST_EVENTS_URL}/rollback/${sessionId}`
  static readonly BOOST_EVENTS_LOCATION_SEARCH = `${this.BOOST_EVENTS_URL}/location-search`
  static readonly BOOST_EVENTS_REASSIGN = `${this.BOOST_EVENTS_URL}/reassign`
  static readonly BOOST_EVENTS_REPLICATE = `${this.BOOST_EVENTS_URL}/replicate`
  static readonly BOOST_EVENTS_HISTORY_REASSIGN_GRAPH = `${this.BOOST_EVENTS_URL}/history-reassign-graph`

  // Boost summaries/violations/free-times endpoints
  static readonly BOOST_LATEST_TIME_REMAINDER = `${this.BOOST_URL}/latest-time-remainder`
  static readonly BOOST_HISTORY_TIME_REMAINDER = `${this.BOOST_URL}/history-time-remainder`
  static readonly BOOST_LATEST_SUMMARIES = `${this.BOOST_URL}/latest-summaries`
  static readonly BOOST_HISTORY_SUMMARIES = `${this.BOOST_URL}/history-summaries`
  static readonly BOOST_LATEST_VIOLATIONS = `${this.BOOST_URL}/latest-violations`
  static readonly BOOST_HISTORY_VIOLATIONS = `${this.BOOST_URL}/history-violations`
  static readonly BOOST_LATEST_FREE_TIMES = `${this.BOOST_URL}/latest-free-times`
  static readonly BOOST_HISTORY_FREE_TIMES = `${this.BOOST_URL}/history-free-times`
  static readonly BOOST_PIXEL_VIOLATIONS = `${this.BOOST_URL}/pixel-violations`

  // Optimize endpoints (used by Boost)
  static readonly OPTIMIZE = this.OPTIMIZE_URL
  static readonly OPTIMIZE_CATEGORIES = `${this.OPTIMIZE_URL}/categories`

  // Drivers / Carriers (used by Reassign)
  static readonly DRIVERS = this.DRIVERS_URL
  static readonly DRIVERS_FILTER = `${this.DRIVERS_URL}/filter`
  static readonly CARRIERS = this.CARRIERS_URL
  static readonly CARRIERS_FILTER = `${this.CARRIERS_URL}/filter`
  static readonly CARRIERS_BY_ID = (id: string) => `${ApiEndpoints.CARRIERS_URL}/${id}`
  static readonly CARRIERS_TIME_ZONES = `${this.CARRIERS_URL}/time-zones`

  // Driver Daily Forms endpoints
  private static readonly DRIVER_DAILY_FORMS_URL = `${this.BASE_URL}/driver-daily-forms`
  static readonly DRIVER_DAILY_FORMS_BY_DATE = (driverId: string) =>
    `${this.DRIVER_DAILY_FORMS_URL}/${driverId}/by-date`
  static readonly DRIVER_DAILY_FORMS_UPDATE = `${this.DRIVER_DAILY_FORMS_URL}/save`

  // Edit Driver Daily Forms endpoints
  private static readonly EDIT_DRIVER_DAILY_FORMS_URL = `${this.BASE_URL}/edit-driver-daily-forms`
  static readonly EDIT_DRIVER_DAILY_FORMS = this.EDIT_DRIVER_DAILY_FORMS_URL
  static readonly EDIT_DRIVER_DAILY_FORMS_BY_DATE = `${this.EDIT_DRIVER_DAILY_FORMS_URL}/by-date`
  static readonly EDIT_DRIVER_DAILY_FORMS_UPDATE = (id: string) => `${this.EDIT_DRIVER_DAILY_FORMS_URL}/${id}`
  static readonly EDIT_DRIVER_DAILY_FORMS_REVERT = `${this.EDIT_DRIVER_DAILY_FORMS_URL}/revert`
  static readonly EDIT_DRIVER_DAILY_FORMS_SUBMIT = `${this.EDIT_DRIVER_DAILY_FORMS_URL}/submit`

  // Fuel endpoints
  static readonly FUEL_CHEAPEST_STATIONS = `${this.FUEL_URL}/cheapest`

  // Geo endpoints
  static readonly GEO_REVERSE_GEOCODE = `${this.GEO_URL}/reverse`
  static readonly GEO_CALCULATE_ADDRESS = `${this.GEO_URL}/calculate`

  // Configuration endpoints
  static readonly ISSUER_STATE_URL = `${this.BASE_URL}/issuer-states`
  static readonly ISSUER_STATE_PARENT_URL = `${this.ISSUER_STATE_URL}/parents`
  static readonly HOS_RULE_URL = `${this.BASE_URL}/hos-roles`
  static readonly RESTART_URL = `${this.BASE_URL}/restarts`
  static readonly REST_BREAK_URL = `${this.BASE_URL}/rest-breaks`
  static readonly CARGO_TYPE_URL = `${this.BASE_URL}/cargo-types`
  static readonly VEHICLE_FUEL_URL = `${this.BASE_URL}/vehicle-fuels`
  static readonly ELD_CONNECTION_URL = `${this.BASE_URL}/eld-vehicle-connections`
  static readonly MAINTENANCE_TYPES_URL = `${this.BASE_URL}/maintenanceServiceType`

  // UserManager endpoints
  static readonly ROLES_URL = `${this.BASE_URL}/roles`
  static readonly PERMISSIONS_URL = `${this.BASE_URL}/permissions`

  // Provider Users endpoints
  private static readonly PROVIDER_USERS_URL = `${this.BASE_URL}/provider-users`
  static readonly PROVIDER_USERS = this.PROVIDER_USERS_URL
  static readonly PROVIDER_USERS_FILTER = `${this.PROVIDER_USERS_URL}/filter`
  static readonly PROVIDER_USERS_BY_ID = (id: string) => `${ApiEndpoints.PROVIDER_USERS_URL}/${id}`
  static readonly PROVIDER_USERS_STATE = (id: string) => `${ApiEndpoints.PROVIDER_USERS_URL}/${id}/state`

  // DOT Inspection endpoints
  private static readonly DOT_INSPECTION_URL = `${this.BASE_URL}/dot-inspections`
  static readonly DOT_INSPECTIONS = this.DOT_INSPECTION_URL
  static readonly DOT_INSPECTION_BY_ID = (id: string) => `${this.DOT_INSPECTION_URL}/${id}`
  static readonly DOT_INSPECTION_STATUS = (id: string) => `${this.DOT_INSPECTION_URL}/${id}/status`

  // Deletion Menu endpoints
  private static readonly DELETION_MENU_URL = `${this.BASE_URL}/deletion-menu`
  static readonly DELETION_MENU_PROVIDERS = `${this.DELETION_MENU_URL}/providers`
  static readonly DELETION_MENU_CARRIERS = `${this.DELETION_MENU_URL}/carriers`
  static readonly DELETION_MENU_ASSIGN_TEST_DRIVER = `${this.DELETION_MENU_URL}/assign-test-driver`

  // Event By Others endpoints (used for Edit/Add Status)
  private static readonly EVENT_BY_OTHERS_URL = `${this.BASE_URL}/eld-event-by-other-users`
  static readonly EVENT_BY_OTHERS = this.EVENT_BY_OTHERS_URL
  static readonly EVENT_BY_OTHERS_GET = (eventId: string) => `${this.EVENT_BY_OTHERS_URL}/${eventId}`
  static readonly EVENT_BY_OTHERS_ADD = `${this.EVENT_BY_OTHERS_URL}/add`
  static readonly EVENT_BY_OTHERS_UPDATE = (eventId: string) => `${this.EVENT_BY_OTHERS_URL}/update/${eventId}`

  // Transfer Events endpoints (used by History)
  private static readonly TRANSFER_EVENTS_URL = `${this.BASE_URL}/transfer-events`
  static readonly TRANSFER_EVENTS_REASSIGN = `${this.TRANSFER_EVENTS_URL}/reassign`
  static readonly TRANSFER_EVENTS_ORIGINAL = `${this.TRANSFER_EVENTS_URL}/original`
  static readonly TRANSFER_EVENTS_DATE_RANGE = `${this.TRANSFER_EVENTS_URL}/date-range`
  static readonly TRANSFER_EVENTS_IDS = `${this.TRANSFER_EVENTS_URL}/ids`
  static readonly TRANSFER_EVENTS_GRAPH = `${this.TRANSFER_EVENTS_URL}/graph`
  static readonly TRANSFER_EVENTS_DAILY_SUMMARY = `${this.TRANSFER_EVENTS_URL}/daily-summary`

  // Audit endpoints
  private static readonly AUDIT_URL = `${this.BASE_URL}/audit`
  static readonly AUDIT = this.AUDIT_URL
  static readonly AUDIT_EVENTS = `${this.AUDIT_URL}/events`
  static readonly AUDIT_SUMMARY = `${this.AUDIT_URL}/summary`
  static readonly AUDIT_GRAPH = `${this.AUDIT_URL}/graph`
  static readonly AUDIT_VIOLATIONS = `${this.AUDIT_URL}/violations`
  static readonly AUDIT_WEIGHT_STATIONS = `${this.AUDIT_URL}/weight-stations`
  static readonly AUDIT_TRACKING = `${this.AUDIT_URL}/tracking`

  // Unidentified Events endpoints
  private static readonly UNIDENTIFIED_EVENTS_URL = `${this.BASE_URL}/unidentified-events`
  static readonly UNIDENTIFIED_EVENTS_FILTER = `${this.UNIDENTIFIED_EVENTS_URL}/filter`
  static readonly UNIDENTIFIED_EVENTS_SELECT = `${this.UNIDENTIFIED_EVENTS_URL}/select`
  static readonly UNIDENTIFIED_EVENTS_REASSIGN = `${this.UNIDENTIFIED_EVENTS_URL}/reassign`
  static readonly UNIDENTIFIED_EVENTS_DELETE = `${this.UNIDENTIFIED_EVENTS_URL}/delete`

  // Portal Users endpoints
  private static readonly PORTAL_USERS_URL = `${this.BASE_URL}/portal-users`
  static readonly PORTAL_USERS = this.PORTAL_USERS_URL
  static readonly PORTAL_USERS_FILTER = `${this.PORTAL_USERS_URL}/filter`
  static readonly PORTAL_USERS_BY_ID = (id: string) => `${ApiEndpoints.PORTAL_USERS_URL}/${id}`
  static readonly PORTAL_USERS_STATE = (id: string) => `${ApiEndpoints.PORTAL_USERS_URL}/${id}/state`

  // Vehicles endpoints
  private static readonly VEHICLES_URL = `${this.BASE_URL}/vehicles`
  static readonly VEHICLES = this.VEHICLES_URL
  static readonly VEHICLES_FILTER = `${this.VEHICLES_URL}/filter`
  static readonly VEHICLES_BY_ID = (id: string) => `${ApiEndpoints.VEHICLES_URL}/${id}`
  static readonly VEHICLES_STATE = (id: string) => `${ApiEndpoints.VEHICLES_URL}/${id}/state`
  static readonly VEHICLES_SLEEP_STATE = (id: string) => `${ApiEndpoints.VEHICLES_URL}/${id}/sleep-state`
  static readonly VEHICLES_DECODE_VIN = `${this.VEHICLES_URL}/multi-decode-vin`

  // Drivers endpoints (CRUD)
  static readonly DRIVERS_BY_ID = (id: string) => `${ApiEndpoints.DRIVERS_URL}/${id}`
  static readonly DRIVERS_STATE = (id: string) => `${ApiEndpoints.DRIVERS_URL}/${id}/state`
  static readonly DRIVERS_LOGOUT = `${this.DRIVERS_URL}/logout`
  static readonly DRIVERS_LOGOUT_BY_ID = (id: string) => `${ApiEndpoints.DRIVERS_URL}/logout/${id}`

  // IFTA endpoints
  private static readonly IFTA_URL = `${this.BASE_URL}/ifta`
  static readonly IFTA_FILTER = `${this.IFTA_URL}/filter`
  static readonly IFTA_GENERATE = `${this.IFTA_URL}/generate`

  // DVIR endpoints
  private static readonly DVIRS_URL = `${this.BASE_URL}/edit-dvirs`
  static readonly DVIRS = this.DVIRS_URL
  static readonly DVIRS_FILTER = `${this.DVIRS_URL}/filter`
  static readonly DVIRS_BY_ID = (id: string) => `${ApiEndpoints.DVIRS_URL}/${id}`
  static readonly DVIRS_LOCATION_SIGNATURES = `${this.DVIRS_URL}/location-signatures`
  static readonly DVIRS_LOCATION_SIGNATURES_BY_DRIVER = (id: string) =>
    `${ApiEndpoints.DVIRS_LOCATION_SIGNATURES}/${id}`
  static readonly DVIRS_STATUSES = `${this.BASE_URL}/dvir-statuses`
  static readonly DVIRS_DOWNLOAD_PDF = `${this.BASE_URL}/dvirs/download-dvir-pdf`

  // Defects endpoints (used by DVIR)
  static readonly DEFECTS = `${this.BASE_URL}/defects`

  // Statistics Company endpoints
  private static readonly STATISTICS_COMPANY_URL = `${this.BASE_URL}/companies/statistics`
  static readonly STATISTICS_COMPANY = this.STATISTICS_COMPANY_URL
  static readonly STATISTICS_COMPANY_NAMES = `${this.STATISTICS_COMPANY_URL}/names`
  static readonly STATISTICS_COMPANY_SESSION = `${this.STATISTICS_COMPANY_URL}/session-statistics`
  static readonly STATISTICS_COMPANY_DETAILED = (id: string) =>
    `${ApiEndpoints.STATISTICS_COMPANY_URL}/${id}/detailed`
  static readonly STATISTICS_COMPANY_DETAILED_SESSION = (id: string) =>
    `${ApiEndpoints.STATISTICS_COMPANY_URL}/${id}/detailed-session-statistics`

  // Admin Statistics endpoints
  private static readonly STATISTIC_ADMIN_URL = `${this.BASE_URL}/statistic-admin`
  static readonly ADMIN_STATISTICS_COMPANIES = (adminId: string) =>
    `${ApiEndpoints.STATISTIC_ADMIN_URL}/companies?adminId=${adminId}`

  // External APIs
  static readonly TELEGRAM_SEND_MESSAGE = 'https://dev-new.routeeld.uz/bot/send_message/'
  static readonly OPEN_METEO_GEOCODING = 'https://geocoding-api.open-meteo.com/v1/search'
}
