import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdapterRegistry } from './adapter-registry';
import { MockAdapter } from './mock-adapter';
import { RemoteOKAdapter } from './remoteok-adapter';
import { WTTJAdapter } from './wttj-adapter';
import { IndeedMCPAdapter } from './indeed-mcp-adapter';

@Module({
  imports: [ConfigModule],
  providers: [AdapterRegistry, MockAdapter, RemoteOKAdapter, WTTJAdapter, IndeedMCPAdapter],
  exports: [AdapterRegistry],
})
export class SourcesModule implements OnModuleInit {
  private readonly logger = new Logger(SourcesModule.name);

  constructor(
    private readonly registry: AdapterRegistry,
    private readonly mockAdapter: MockAdapter,
    private readonly remoteOKAdapter: RemoteOKAdapter,
    private readonly wttjAdapter: WTTJAdapter,
    private readonly indeedMCPAdapter: IndeedMCPAdapter,
  ) {}

  onModuleInit() {
    // Register all adapters
    this.logger.log('Registering job source adapters...');

    // Mock adapter (only active in development)
    this.registry.registerAdapter(this.mockAdapter);

    // RemoteOK RSS/API adapter
    this.registry.registerAdapter(this.remoteOKAdapter);

    // Welcome to the Jungle (WTTJ) adapter
    this.registry.registerAdapter(this.wttjAdapter);

    // Indeed via JobSpy MCP server
    this.registry.registerAdapter(this.indeedMCPAdapter);

    // Additional adapters can be registered here as they are implemented:
    // - LinkedInAdapter (requires partner API access)
    // etc.

    this.logger.log(`Registered ${this.registry.getAllAdapters().length} adapters`);
  }
}
