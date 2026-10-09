/**
 * Database Layer Exports
 * Entry point centralizado para acesso a dados
 */

export { SupabaseClientService, supabase } from "./client";
export { BaseRepository, RepositoryError } from "./repositories/base";
export { MonitoringRepository } from "./repositories/monitoringRepository";
export { EventsRepository } from "./repositories/eventsRepository";
export { SnapshotsRepository } from "./repositories/snapshotsRepository";

// Initialize repos
export function initializeRepositories() {
  return {
    monitoring: new (require("./repositories/monitoringRepository")).MonitoringRepository(),
    events: new (require("./repositories/eventsRepository")).EventsRepository(),
    snapshots: new (require("./repositories/snapshotsRepository")).SnapshotsRepository(),
  };
}
