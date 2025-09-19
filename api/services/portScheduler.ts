import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  PortConfig,
  PortCheckResult,
  SchedulerJob,
  PortMonitorEvent,
  EventType,
  PortStatus
} from '../types/portMonitor.js';
import { PortMonitorService } from './portMonitor.js';

export class PortSchedulerService extends EventEmitter {
  private jobs: Map<string, SchedulerJob> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private portMonitor: PortMonitorService;
  private isRunning: boolean = false;
  private checkHistory: Map<string, PortCheckResult[]> = new Map();
  private maxHistorySize: number = 100;

  constructor(portMonitor: PortMonitorService) {
    super();
    this.portMonitor = portMonitor;
    
    // Port monitor event'lerini dinle
    this.portMonitor.on('portCheck', this.handlePortCheckEvent.bind(this));
  }

  /**
   * Scheduler'ı başlat
   */
  start(): void {
    if (this.isRunning) {
      console.log('Port scheduler is already running');
      return;
    }

    this.isRunning = true;
    console.log('Port scheduler started');
    
    this.emit('schedulerStarted', {
      type: EventType.MONITOR_STARTED,
      portConfigId: '',
      data: { timestamp: new Date() },
      timestamp: new Date()
    });

    // Mevcut job'ları başlat
    this.jobs.forEach((job, jobId) => {
      this.scheduleJob(jobId, job);
    });
  }

  /**
   * Scheduler'ı durdur
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('Port scheduler is not running');
      return;
    }

    this.isRunning = false;
    
    // Tüm timer'ları temizle
    this.timers.forEach((timer) => {
      clearTimeout(timer);
    });
    this.timers.clear();

    // Çalışan job'ları durdur
    this.jobs.forEach((job) => {
      job.isRunning = false;
    });

    console.log('Port scheduler stopped');
    
    this.emit('schedulerStopped', {
      type: EventType.MONITOR_STOPPED,
      portConfigId: '',
      data: { timestamp: new Date() },
      timestamp: new Date()
    });
  }

  /**
   * Port konfigürasyonu için job ekle
   */
  addJob(portConfig: PortConfig): string {
    const jobId = uuidv4();
    const job: SchedulerJob = {
      id: jobId,
      portConfigId: portConfig.id,
      nextRun: new Date(Date.now() + portConfig.interval),
      isRunning: false,
      consecutiveFailures: 0
    };

    this.jobs.set(jobId, job);
    
    // Eğer scheduler çalışıyorsa job'ı hemen planla
    if (this.isRunning && portConfig.enabled) {
      this.scheduleJob(jobId, job);
    }

    console.log(`Job added for port ${portConfig.host}:${portConfig.port} (ID: ${jobId})`);
    return jobId;
  }

  /**
   * Job'ı kaldır
   */
  removeJob(jobId: string): boolean {
    const timer = this.timers.get(jobId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(jobId);
    }

    const removed = this.jobs.delete(jobId);
    if (removed) {
      console.log(`Job removed: ${jobId}`);
    }
    
    return removed;
  }

  /**
   * Port konfigürasyonu için job'ı kaldır
   */
  removeJobByPortConfig(portConfigId: string): boolean {
    const jobEntry = Array.from(this.jobs.entries())
      .find(([_, job]) => job.portConfigId === portConfigId);
    
    if (jobEntry) {
      return this.removeJob(jobEntry[0]);
    }
    
    return false;
  }

  /**
   * Job'ı planla
   */
  private scheduleJob(jobId: string, job: SchedulerJob): void {
    const now = Date.now();
    const delay = Math.max(0, job.nextRun.getTime() - now);

    const timer = setTimeout(async () => {
      await this.executeJob(jobId, job);
    }, delay);

    this.timers.set(jobId, timer);
  }

  /**
   * Job'ı çalıştır
   */
  private async executeJob(jobId: string, job: SchedulerJob): Promise<void> {
    if (!this.isRunning || job.isRunning) {
      return;
    }

    job.isRunning = true;
    job.lastRun = new Date();

    try {
      // Port konfigürasyonunu al (normalde database'den gelecek)
      const portConfig = await this.getPortConfig(job.portConfigId);
      
      if (!portConfig || !portConfig.enabled) {
        console.log(`Port config not found or disabled: ${job.portConfigId}`);
        this.removeJob(jobId);
        return;
      }

      // Port kontrolü yap
      const result = await this.portMonitor.checkPortConfig(portConfig);
      
      // Sonucu history'ye ekle
      this.addToHistory(job.portConfigId, result);
      
      // Başarısızlık sayacını güncelle
      if (result.status === PortStatus.ONLINE) {
        job.consecutiveFailures = 0;
      } else {
        job.consecutiveFailures++;
      }

      // Bir sonraki çalışma zamanını ayarla
      job.nextRun = new Date(Date.now() + portConfig.interval);
      
      // Job'ı yeniden planla
      if (this.isRunning && portConfig.enabled) {
        this.scheduleJob(jobId, job);
      }

      console.log(
        `Port check completed: ${portConfig.host}:${portConfig.port} - ${result.status} ` +
        `(${result.responseTime}ms) - Consecutive failures: ${job.consecutiveFailures}`
      );

    } catch (error) {
      console.error(`Error executing job ${jobId}:`, error);
      job.consecutiveFailures++;
      
      // Hata durumunda da job'ı yeniden planla
      const portConfig = await this.getPortConfig(job.portConfigId);
      if (portConfig && portConfig.enabled) {
        job.nextRun = new Date(Date.now() + portConfig.interval);
        this.scheduleJob(jobId, job);
      }
    } finally {
      job.isRunning = false;
    }
  }

  /**
   * Port check event'ini handle et
   */
  private handlePortCheckEvent(event: PortMonitorEvent): void {
    // Event'i yeniden emit et
    this.emit('portCheckResult', event);
  }

  /**
   * History'ye sonuç ekle
   */
  private addToHistory(portConfigId: string, result: PortCheckResult): void {
    if (!this.checkHistory.has(portConfigId)) {
      this.checkHistory.set(portConfigId, []);
    }

    const history = this.checkHistory.get(portConfigId)!;
    history.push(result);

    // History boyutunu sınırla
    if (history.length > this.maxHistorySize) {
      history.splice(0, history.length - this.maxHistorySize);
    }
  }

  /**
   * Port konfigürasyonunu al (mock implementation)
   * Gerçek uygulamada database'den gelecek
   */
  private async getPortConfig(portConfigId: string): Promise<PortConfig | null> {
    // Bu method gerçek uygulamada database service'i kullanacak
    // Şimdilik mock data döndürüyoruz
    return null;
  }

  /**
   * Job durumunu al
   */
  getJobStatus(jobId: string): SchedulerJob | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Tüm job'ları al
   */
  getAllJobs(): SchedulerJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Tüm job'ları al (alias)
   */
  getJobs(): SchedulerJob[] {
    return this.getAllJobs();
  }

  /**
   * Port için job'ı al
   */
  getJobByPortConfig(portConfigId: string): SchedulerJob | null {
    const jobEntry = Array.from(this.jobs.entries())
      .find(([_, job]) => job.portConfigId === portConfigId);
    
    return jobEntry ? jobEntry[1] : null;
  }

  /**
   * Port için history al
   */
  getPortHistory(portConfigId: string, limit?: number): PortCheckResult[] {
    const history = this.checkHistory.get(portConfigId) || [];
    
    if (limit && limit > 0) {
      return history.slice(-limit);
    }
    
    return [...history];
  }

  /**
   * Scheduler istatistiklerini al
   */
  getStats() {
    const totalJobs = this.jobs.size;
    const runningJobs = Array.from(this.jobs.values())
      .filter(job => job.isRunning).length;
    const failedJobs = Array.from(this.jobs.values())
      .filter(job => job.consecutiveFailures > 0).length;

    return {
      isRunning: this.isRunning,
      totalJobs,
      runningJobs,
      failedJobs,
      activeTimers: this.timers.size,
      totalChecks: Array.from(this.checkHistory.values())
        .reduce((sum, history) => sum + history.length, 0)
    };
  }

  /**
   * Job'ı hemen çalıştır
   */
  async runJobNow(jobId: string): Promise<PortCheckResult | null> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    if (job.isRunning) {
      throw new Error(`Job is already running: ${jobId}`);
    }

    const portConfig = await this.getPortConfig(job.portConfigId);
    if (!portConfig) {
      throw new Error(`Port config not found: ${job.portConfigId}`);
    }

    const result = await this.portMonitor.checkPortConfig(portConfig);
    this.addToHistory(job.portConfigId, result);
    
    return result;
  }

  /**
   * Scheduler durumunu al
   */
  isSchedulerRunning(): boolean {
    return this.isRunning;
  }

  /**
   * History boyutunu ayarla
   */
  setMaxHistorySize(size: number): void {
    this.maxHistorySize = Math.max(1, size);
  }
}

// Singleton instance
export const portSchedulerService = new PortSchedulerService(
  new PortMonitorService()
);