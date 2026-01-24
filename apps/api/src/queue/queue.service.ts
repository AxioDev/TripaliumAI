import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { Queue, Worker, Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export type JobType =
  | 'cv.parse'
  | 'job.discover'
  | 'job.analyze'
  | 'document.generate'
  | 'email.send'
  | 'application.submit';

export interface JobPayload {
  type: JobType;
  data: Record<string, unknown>;
  userId?: string;
  testMode?: boolean;
}

type JobHandler = (job: Job<JobPayload>) => Promise<unknown>;

@Injectable()
export class QueueService implements OnModuleInit {
  private queue: Queue<JobPayload> | null = null;
  private worker: Worker<JobPayload> | null = null;
  private handlers: Map<JobType, JobHandler> = new Map();
  private inMemoryQueue: JobPayload[] = [];
  private isProcessing = false;

  constructor(
    @Inject('QUEUE_CONNECTION') private readonly redisUrl: string | null,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    if (this.redisUrl) {
      // Use BullMQ with Redis
      this.queue = new Queue('tripalium', {
        connection: { url: this.redisUrl },
      });

      this.worker = new Worker(
        'tripalium',
        async (job) => {
          const handler = this.handlers.get(job.data.type);
          if (handler) {
            return handler(job);
          }
          throw new Error(`No handler registered for job type: ${job.data.type}`);
        },
        {
          connection: { url: this.redisUrl },
          concurrency: 5,
        },
      );

      this.worker.on('completed', (job) => {
        console.log(`Job ${job.id} completed`);
      });

      this.worker.on('failed', (job, err) => {
        console.error(`Job ${job?.id} failed:`, err);
      });
    }
  }

  /**
   * Register a handler for a job type
   */
  registerHandler(type: JobType, handler: JobHandler) {
    this.handlers.set(type, handler);
  }

  /**
   * Add a job to the queue
   */
  async addJob(payload: JobPayload, options?: { delay?: number; priority?: number }) {
    // Also log to database for visibility
    await this.prisma.backgroundJob.create({
      data: {
        type: payload.type,
        payload: payload as unknown as Prisma.InputJsonValue,
        priority: options?.priority || 0,
        scheduledAt: options?.delay
          ? new Date(Date.now() + options.delay)
          : new Date(),
      },
    });

    if (this.queue) {
      // Use BullMQ
      return this.queue.add(payload.type, payload, {
        delay: options?.delay,
        priority: options?.priority,
      });
    }

    // Fallback to in-memory processing
    this.inMemoryQueue.push(payload);
    this.processInMemoryQueue();
  }

  /**
   * Process in-memory queue (fallback when Redis not available)
   */
  private async processInMemoryQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.inMemoryQueue.length > 0) {
      const payload = this.inMemoryQueue.shift();
      if (!payload) continue;

      const handler = this.handlers.get(payload.type);
      if (handler) {
        try {
          // Create a mock job object
          const mockJob = {
            data: payload,
            id: `inmem-${Date.now()}`,
          } as Job<JobPayload>;

          await handler(mockJob);
        } catch (error) {
          console.error(`In-memory job failed:`, error);
        }
      }
    }

    this.isProcessing = false;
  }

  /**
   * Get queue stats
   */
  async getStats() {
    if (this.queue) {
      const [waiting, active, completed, failed] = await Promise.all([
        this.queue.getWaitingCount(),
        this.queue.getActiveCount(),
        this.queue.getCompletedCount(),
        this.queue.getFailedCount(),
      ]);

      return { waiting, active, completed, failed };
    }

    return {
      waiting: this.inMemoryQueue.length,
      active: this.isProcessing ? 1 : 0,
      completed: 0,
      failed: 0,
      mode: 'in-memory',
    };
  }
}
