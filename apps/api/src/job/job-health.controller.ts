import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AdapterRegistry } from './sources';

interface SourceHealth {
  name: string;
  displayName: string;
  type: string;
  healthy: boolean;
  message?: string;
  responseTimeMs?: number;
  lastChecked: string;
}

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  sources: SourceHealth[];
  summary: {
    total: number;
    healthy: number;
    unhealthy: number;
  };
}

@ApiTags('Health')
@Controller('jobs/health')
export class JobHealthController {
  constructor(private readonly adapterRegistry: AdapterRegistry) {}

  @Get()
  @ApiOperation({ summary: 'Check health of all job sources' })
  @ApiResponse({
    status: 200,
    description: 'Health check results',
  })
  async checkHealth(): Promise<HealthResponse> {
    const adapters = this.adapterRegistry.getAllAdapters();
    const sources: SourceHealth[] = [];

    // Run health checks in parallel
    const healthPromises = adapters.map(async (adapter) => {
      try {
        const health = await adapter.healthCheck();
        return {
          name: adapter.sourceName,
          displayName: adapter.displayName,
          type: adapter.sourceType,
          healthy: health.healthy,
          message: health.message,
          responseTimeMs: health.responseTimeMs,
          lastChecked: health.lastChecked.toISOString(),
        };
      } catch (error) {
        return {
          name: adapter.sourceName,
          displayName: adapter.displayName,
          type: adapter.sourceType,
          healthy: false,
          message: error instanceof Error ? error.message : 'Health check failed',
          lastChecked: new Date().toISOString(),
        };
      }
    });

    const healthResults = await Promise.all(healthPromises);
    sources.push(...healthResults);

    // Calculate summary
    const healthySources = sources.filter((s) => s.healthy).length;
    const unhealthySources = sources.length - healthySources;

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (unhealthySources === 0) {
      status = 'healthy';
    } else if (healthySources > 0) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      sources,
      summary: {
        total: sources.length,
        healthy: healthySources,
        unhealthy: unhealthySources,
      },
    };
  }

  @Get('sources')
  @ApiOperation({ summary: 'List available job sources and their status' })
  @ApiResponse({
    status: 200,
    description: 'List of job sources',
  })
  async listSources(): Promise<{
    sources: Array<{
      name: string;
      displayName: string;
      type: string;
      supportsAutoApply: boolean;
      sourceId: string | null;
    }>;
  }> {
    const adapters = this.adapterRegistry.getAllAdapters();

    return {
      sources: adapters.map((adapter) => ({
        name: adapter.sourceName,
        displayName: adapter.displayName,
        type: adapter.sourceType,
        supportsAutoApply: adapter.supportsAutoApply,
        sourceId: adapter.getSourceId(),
      })),
    };
  }
}
