import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import fs from 'fs';
import path from 'path';
import { Logger, LogLevel } from '../logger';

// Mock fs module
vi.mock('fs');
vi.mock('path');

// Mock fetch for remote logging
global.fetch = vi.fn();

describe('Logger', () => {
  let logger: Logger;
  let mockFs: {
    existsSync: Mock;
    mkdirSync: Mock;
    appendFileSync: Mock;
    statSync: Mock;
    unlinkSync: Mock;
    renameSync: Mock;
  };
  let mockPath: {
    join: Mock;
    dirname: Mock;
    basename: Mock;
  };
  let consoleSpy: {
    error: Mock;
    warn: Mock;
    info: Mock;
    debug: Mock;
  };

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Setup fs mocks
    mockFs = {
      existsSync: vi.mocked(fs.existsSync),
      mkdirSync: vi.mocked(fs.mkdirSync),
      appendFileSync: vi.mocked(fs.appendFileSync),
      statSync: vi.mocked(fs.statSync),
      unlinkSync: vi.mocked(fs.unlinkSync),
      renameSync: vi.mocked(fs.renameSync)
    };
    
    // Setup path mocks
    mockPath = {
      join: vi.mocked(path.join),
      dirname: vi.mocked(path.dirname),
      basename: vi.mocked(path.basename)
    };
    
    // Setup console spies
    consoleSpy = {
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {})
    };
    
    // Setup default mock implementations
    mockFs.existsSync.mockReturnValue(true);
    mockPath.join.mockImplementation((...args) => args.join('/'));
    mockPath.dirname.mockReturnValue('/logs');
    mockPath.basename.mockReturnValue('app-2024-01-01');
    
    // Mock process.cwd
    vi.spyOn(process, 'cwd').mockReturnValue('/test');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor and Initialization', () => {
    it('should create logger with default configuration', () => {
      logger = new Logger();
      expect(mockPath.join).toHaveBeenCalledWith('/test', 'logs');
    });

    it('should create logger with custom configuration', () => {
      const config = {
        level: LogLevel.ERROR,
        enableConsole: false,
        logDir: '/custom/logs'
      };
      
      logger = new Logger(config);
      expect(mockPath.join).not.toHaveBeenCalledWith('/test', 'logs');
    });

    it('should create log directory if it does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);
      
      logger = new Logger();
      
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(
        expect.any(String),
        { recursive: true }
      );
    });

    it('should handle log directory creation error', () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.mkdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });
      
      logger = new Logger();
      
      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Log dizini oluşturulamadı:',
        expect.any(Error)
      );
    });
  });

  describe('Log Level Filtering', () => {
    beforeEach(() => {
      logger = new Logger({ level: LogLevel.WARN, enableConsole: true });
    });

    it('should log ERROR when level is WARN', () => {
      logger.error('Test error');
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('should log WARN when level is WARN', () => {
      logger.warn('Test warning');
      expect(consoleSpy.warn).toHaveBeenCalled();
    });

    it('should not log INFO when level is WARN', () => {
      logger.info('Test info');
      expect(consoleSpy.info).not.toHaveBeenCalled();
    });

    it('should not log DEBUG when level is WARN', () => {
      logger.debug('Test debug');
      expect(consoleSpy.debug).not.toHaveBeenCalled();
    });
  });

  describe('Console Logging', () => {
    beforeEach(() => {
      logger = new Logger({ enableConsole: true, level: LogLevel.DEBUG });
    });

    it('should log error to console', () => {
      const error = new Error('Test error');
      logger.error('Error message', { data: 'test' }, error);
      
      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR] Error message'),
        error.stack
      );
    });

    it('should log warning to console', () => {
      logger.warn('Warning message', { data: 'test' });
      
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('[WARN] Warning message')
      );
    });

    it('should log info to console', () => {
      logger.info('Info message');
      
      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('[INFO] Info message')
      );
    });

    it('should log debug to console', () => {
      logger.debug('Debug message');
      
      expect(consoleSpy.debug).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG] Debug message')
      );
    });

    it('should not log to console when disabled', () => {
      logger = new Logger({ enableConsole: false });
      logger.error('Error message');
      
      expect(consoleSpy.error).not.toHaveBeenCalled();
    });
  });

  describe('File Logging', () => {
    beforeEach(() => {
      logger = new Logger({ enableFile: true, level: LogLevel.DEBUG });
      mockFs.statSync.mockReturnValue({ size: 1024 } as any);
    });

    it('should write log to file', async () => {
      logger.info('Test message');
      
      // Wait for async file operations
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('[INFO] Test message')
      );
    });

    it('should not write to file when disabled', async () => {
      logger = new Logger({ enableFile: false });
      logger.info('Test message');
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockFs.appendFileSync).not.toHaveBeenCalled();
    });

    it('should handle file write errors', async () => {
      mockFs.appendFileSync.mockImplementation(() => {
        throw new Error('Write error');
      });
      
      logger.info('Test message');
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Log dosyasına yazma hatası:',
        expect.any(Error)
      );
    });
  });

  describe('Log Rotation', () => {
    beforeEach(() => {
      logger = new Logger({ 
        enableFile: true, 
        maxFileSize: 1, // 1MB
        maxFiles: 3
      });
    });

    it('should rotate log file when size limit exceeded', async () => {
      // Mock file size to exceed limit
      mockFs.statSync.mockReturnValue({ size: 2 * 1024 * 1024 } as any); // 2MB
      
      logger.info('Test message');
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockFs.renameSync).toHaveBeenCalled();
    });

    it('should handle rotation errors', async () => {
      mockFs.statSync.mockReturnValue({ size: 2 * 1024 * 1024 } as any);
      mockFs.renameSync.mockImplementation(() => {
        throw new Error('Rotation error');
      });
      
      logger.info('Test message');
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Log dosyası rotasyonu hatası:',
        expect.any(Error)
      );
    });
  });

  describe('Remote Logging', () => {
    beforeEach(() => {
      logger = new Logger({ 
        enableRemote: true,
        remoteEndpoint: 'https://api.example.com/logs'
      });
      (global.fetch as Mock).mockResolvedValue({
        ok: true,
        status: 200
      });
    });

    it('should send log to remote endpoint', async () => {
      logger.info('Test message');
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/logs',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('Test message')
        })
      );
    });

    it('should handle remote logging errors', async () => {
      (global.fetch as Mock).mockResolvedValue({
        ok: false,
        statusText: 'Server Error'
      });
      
      logger.info('Test message');
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Remote logging hatası:',
        'Server Error'
      );
    });

    it('should handle network errors', async () => {
      (global.fetch as Mock).mockRejectedValue(new Error('Network error'));
      
      logger.info('Test message');
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Remote logging bağlantı hatası:',
        expect.any(Error)
      );
    });

    it('should not send to remote when disabled', async () => {
      logger = new Logger({ enableRemote: false });
      logger.info('Test message');
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Context Logging', () => {
    beforeEach(() => {
      logger = new Logger({ enableConsole: true });
    });

    it('should log with user context', () => {
      logger.withContext({ userId: 'user123' }).info('User action');
      
      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('User action')
      );
    });

    it('should log with session context', () => {
      logger.withContext({ sessionId: 'session456' }).warn('Session warning');
      
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('Session warning')
      );
    });

    it('should log with request context', () => {
      logger.withContext({ requestId: 'req789' }).error('Request error');
      
      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('Request error'),
        ''
      );
    });
  });

  describe('Performance and Memory', () => {
    beforeEach(() => {
      logger = new Logger({ enableFile: true, enableConsole: false });
    });

    it('should handle high volume logging', async () => {
      const promises = [];
      
      for (let i = 0; i < 100; i++) {
        promises.push(logger.info(`Message ${i}`));
      }
      
      await Promise.all(promises);
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(mockFs.appendFileSync).toHaveBeenCalledTimes(100);
    });

    it('should process log queue sequentially', async () => {
      logger.info('Message 1');
      logger.info('Message 2');
      logger.info('Message 3');
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(mockFs.appendFileSync).toHaveBeenCalledTimes(3);
    });
  });
});