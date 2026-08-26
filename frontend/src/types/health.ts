export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface ComponentHealth {
  status: HealthStatus;
  details?: string;
}

export interface HealthResponse {
  status: HealthStatus;
  app_name: string;
  version: string;
  environment: string;
  components: Record<string, ComponentHealth>;
}
