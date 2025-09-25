import express from 'express';
import { Request, Response } from 'express';
import figmaService from '../services/figmaService';
import { validateFigmaConnection, validateTokenSync } from '../middleware/figmaValidation';

const router = express.Router();

// GET /api/figma/connections - Get all Figma connections
router.get('/connections', async (req: Request, res: Response) => {
  try {
    // For now, return empty array since we need user authentication
    // In a real implementation, you'd get userId from auth middleware
    const connections: any[] = [];
    res.json({ success: true, data: connections });
  } catch (error) {
    console.error('Error fetching Figma connections:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch Figma connections' 
    });
  }
});

// POST /api/figma/connections - Create new Figma connection
router.post('/connections', validateFigmaConnection, async (req: Request, res: Response) => {
  try {
    const { fileId, apiKey, fileName } = req.body;
    
    // Test connection first
    const testResult = await figmaService.testConnection(apiKey);
    if (!testResult.success) {
      return res.status(400).json({
        success: false,
        error: testResult.message
      });
    }

    // For now, use a placeholder user ID
    // In a real implementation, you'd get this from auth middleware
    const userId = 'placeholder-user-id';
    
    const connection = await figmaService.createConnection(userId, fileId, fileName, apiKey);

    res.status(201).json({ success: true, data: connection });
  } catch (error) {
    console.error('Error creating Figma connection:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create Figma connection' 
    });
  }
});

// GET /api/figma/files/:fileId - Get Figma file information
router.get('/files/:fileId', async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    const apiKey = req.headers['x-figma-api-key'] as string;

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'Figma API key is required'
      });
    }

    const fileInfo = await figmaService.getFileInfo(fileId, apiKey);
    res.json({ success: true, data: fileInfo });
  } catch (error) {
    console.error('Error fetching Figma file:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch Figma file information' 
    });
  }
});

// POST /api/figma/tokens/sync - Synchronize design tokens
router.post('/tokens/sync', validateTokenSync, async (req: Request, res: Response) => {
  try {
    const { connectionId, tokenTypes } = req.body;
    
    const syncResult = await figmaService.syncDesignTokens(connectionId, tokenTypes);
    
    res.json({ success: true, data: syncResult });
  } catch (error) {
    console.error('Error syncing design tokens:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to sync design tokens' 
    });
  }
});

// GET /api/figma/tokens/:connectionId - Get design tokens for a connection
router.get('/tokens/:connectionId', async (req: Request, res: Response) => {
  try {
    const { connectionId } = req.params;
    const { tokenType } = req.query;
    
    const tokens = await figmaService.getDesignTokens(connectionId, tokenType as string);
    res.json({ success: true, data: tokens });
  } catch (error) {
    console.error('Error fetching design tokens:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch design tokens' 
    });
  }
});

// POST /api/figma/components/map - Create component mapping
router.post('/components/map', async (req: Request, res: Response) => {
  try {
    const { connectionId, figmaComponentId, reactComponentName, propMappings } = req.body;
    
    const mapping = await figmaService.createComponentMapping({
      connectionId,
      figmaComponentId,
      reactComponentName,
      propMappings
    });
    
    res.status(201).json({ success: true, data: mapping });
  } catch (error) {
    console.error('Error creating component mapping:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create component mapping' 
    });
  }
});

// GET /api/figma/components/:connectionId - Get component mappings
router.get('/components/:connectionId', async (req: Request, res: Response) => {
  try {
    const { connectionId } = req.params;
    
    const mappings = await figmaService.getComponentMappings(connectionId);
    res.json({ success: true, data: mappings });
  } catch (error) {
    console.error('Error fetching component mappings:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch component mappings' 
    });
  }
});

// GET /api/figma/sync-history/:connectionId - Get synchronization history
router.get('/sync-history/:connectionId', async (req: Request, res: Response) => {
  try {
    const { connectionId } = req.params;
    const { limit = 10 } = req.query;
    
    const history = await figmaService.getSyncHistory(connectionId, Number(limit));
    res.json({ success: true, data: history });
  } catch (error) {
    console.error('Error fetching sync history:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch sync history' 
    });
  }
});

// DELETE /api/figma/connections/:id - Delete Figma connection
router.delete('/connections/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await figmaService.deleteConnection(id);
    res.json({ success: true, message: 'Connection deleted successfully' });
  } catch (error) {
    console.error('Error deleting Figma connection:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete Figma connection' 
    });
  }
});

export default router;