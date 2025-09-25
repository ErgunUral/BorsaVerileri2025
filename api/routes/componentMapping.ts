import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { validateComponentMapping } from '../middleware/figmaValidation.js';
import { authenticateUser } from '../middleware/auth.js';

const router = Router();

// Get all component mappings for a connection
router.get('/connections/:connectionId/mappings', authenticateUser, async (req, res) => {
  try {
    const { connectionId } = req.params;
    const userId = req.user?.id;

    // Verify connection belongs to user
    const { data: connection, error: connectionError } = await supabaseAdmin
      .from('figma_connections')
      .select('id')
      .eq('id', connectionId)
      .eq('user_id', userId)
      .single();

    if (connectionError || !connection) {
      return res.status(404).json({ message: 'Connection not found' });
    }

    const { data: mappings, error } = await supabaseAdmin
      .from('component_mappings')
      .select(`
        id,
        figma_component_id,
        figma_component_name,
        local_component_path,
        mapping_config,
        status,
        created_at,
        updated_at
      `)
      .eq('connection_id', connectionId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching component mappings:', error);
      return res.status(500).json({ message: 'Failed to fetch component mappings' });
    }

    res.json(mappings || []);
  } catch (error) {
    console.error('Error in get component mappings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create a new component mapping
router.post('/connections/:connectionId/mappings', authenticateUser, validateComponentMapping, async (req, res) => {
  try {
    const { connectionId } = req.params;
    const userId = req.user?.id;
    const {
      figmaComponentId,
      figmaComponentName,
      localComponentPath,
      mappingConfig
    } = req.body;

    // Verify connection belongs to user
    const { data: connection, error: connectionError } = await supabaseAdmin
      .from('figma_connections')
      .select('id')
      .eq('id', connectionId)
      .eq('user_id', userId)
      .single();

    if (connectionError || !connection) {
      return res.status(404).json({ message: 'Connection not found' });
    }

    // Check if mapping already exists
    const { data: existingMapping } = await supabaseAdmin
      .from('component_mappings')
      .select('id')
      .eq('connection_id', connectionId)
      .eq('figma_component_id', figmaComponentId)
      .single();

    if (existingMapping) {
      return res.status(409).json({ message: 'Component mapping already exists' });
    }

    const { data: mapping, error } = await supabaseAdmin
      .from('component_mappings')
      .insert({
        connection_id: connectionId,
        figma_component_id: figmaComponentId,
        figma_component_name: figmaComponentName,
        local_component_path: localComponentPath,
        mapping_config: mappingConfig || {},
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating component mapping:', error);
      return res.status(500).json({ message: 'Failed to create component mapping' });
    }

    res.status(201).json(mapping);
  } catch (error) {
    console.error('Error in create component mapping:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update a component mapping
router.put('/mappings/:mappingId', authenticateUser, validateComponentMapping, async (req, res) => {
  try {
    const { mappingId } = req.params;
    const userId = req.user?.id;
    const {
      figmaComponentName,
      localComponentPath,
      mappingConfig,
      status
    } = req.body;

    // Verify mapping belongs to user's connection
    const { data: mapping, error: mappingError } = await supabaseAdmin
      .from('component_mappings')
      .select(`
        id,
        connection_id,
        figma_connections!inner(user_id)
      `)
      .eq('id', mappingId)
      .single();

    if (mappingError || !mapping || mapping.figma_connections.user_id !== userId) {
      return res.status(404).json({ message: 'Component mapping not found' });
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (figmaComponentName !== undefined) updateData.figma_component_name = figmaComponentName;
    if (localComponentPath !== undefined) updateData.local_component_path = localComponentPath;
    if (mappingConfig !== undefined) updateData.mapping_config = mappingConfig;
    if (status !== undefined) updateData.status = status;

    const { data: updatedMapping, error } = await supabaseAdmin
      .from('component_mappings')
      .update(updateData)
      .eq('id', mappingId)
      .select()
      .single();

    if (error) {
      console.error('Error updating component mapping:', error);
      return res.status(500).json({ message: 'Failed to update component mapping' });
    }

    res.json(updatedMapping);
  } catch (error) {
    console.error('Error in update component mapping:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete a component mapping
router.delete('/mappings/:mappingId', authenticateUser, async (req, res) => {
  try {
    const { mappingId } = req.params;
    const userId = req.user?.id;

    // Verify mapping belongs to user's connection
    const { data: mapping, error: mappingError } = await supabaseAdmin
      .from('component_mappings')
      .select(`
        id,
        connection_id,
        figma_connections!inner(user_id)
      `)
      .eq('id', mappingId)
      .single();

    if (mappingError || !mapping || mapping.figma_connections.user_id !== userId) {
      return res.status(404).json({ message: 'Component mapping not found' });
    }

    const { error } = await supabaseAdmin
      .from('component_mappings')
      .delete()
      .eq('id', mappingId);

    if (error) {
      console.error('Error deleting component mapping:', error);
      return res.status(500).json({ message: 'Failed to delete component mapping' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error in delete component mapping:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get Figma components from a file
router.get('/connections/:connectionId/figma-components', authenticateUser, async (req, res) => {
  try {
    const { connectionId } = req.params;
    const userId = req.user?.id;

    // Verify connection belongs to user
    const { data: connection, error: connectionError } = await supabaseAdmin
      .from('figma_connections')
      .select('id, figma_file_id, api_key_hash')
      .eq('id', connectionId)
      .eq('user_id', userId)
      .single();

    if (connectionError || !connection) {
      return res.status(404).json({ message: 'Connection not found' });
    }

    // Get API key from environment or request
    const apiKey = req.headers['x-figma-api-key'] as string;
    if (!apiKey) {
      return res.status(400).json({ message: 'Figma API key required' });
    }

    // Fetch components from Figma
    const figmaResponse = await fetch(
      `https://api.figma.com/v1/files/${connection.figma_file_id}/components`,
      {
        headers: {
          'X-Figma-Token': apiKey,
        },
      }
    );

    if (!figmaResponse.ok) {
      const errorText = await figmaResponse.text();
      console.error('Figma API error:', errorText);
      return res.status(figmaResponse.status).json({ 
        message: 'Failed to fetch components from Figma',
        details: errorText
      });
    }

    const figmaData = await figmaResponse.json();
    
    // Transform components data
    const components = Object.entries(figmaData.meta?.components || {}).map(([id, component]: [string, any]) => ({
      id,
      name: component.name,
      description: component.description || '',
      componentSetId: component.componentSetId,
      documentationLinks: component.documentationLinks || []
    }));

    res.json(components);
  } catch (error) {
    console.error('Error fetching Figma components:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get local component suggestions
router.get('/local-components', authenticateUser, async (req, res) => {
  try {
    const { search } = req.query;
    
    // This is a simplified implementation
    // In a real application, you would scan the actual file system
    // or maintain a registry of available components
    const mockComponents = [
      { path: 'src/components/Button.tsx', name: 'Button' },
      { path: 'src/components/Card.tsx', name: 'Card' },
      { path: 'src/components/Input.tsx', name: 'Input' },
      { path: 'src/components/Modal.tsx', name: 'Modal' },
      { path: 'src/components/Badge.tsx', name: 'Badge' },
      { path: 'src/components/Avatar.tsx', name: 'Avatar' },
      { path: 'src/components/Dropdown.tsx', name: 'Dropdown' },
      { path: 'src/components/Tooltip.tsx', name: 'Tooltip' },
      { path: 'src/components/Tabs.tsx', name: 'Tabs' },
      { path: 'src/components/Alert.tsx', name: 'Alert' }
    ];

    let filteredComponents = mockComponents;
    
    if (search && typeof search === 'string') {
      const searchLower = search.toLowerCase();
      filteredComponents = mockComponents.filter(component => 
        component.name.toLowerCase().includes(searchLower) ||
        component.path.toLowerCase().includes(searchLower)
      );
    }

    res.json(filteredComponents);
  } catch (error) {
    console.error('Error fetching local components:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Sync component mappings with Figma
router.post('/connections/:connectionId/sync-components', authenticateUser, async (req, res) => {
  try {
    const { connectionId } = req.params;
    const userId = req.user?.id;

    // Verify connection belongs to user
    const { data: connection, error: connectionError } = await supabaseAdmin
      .from('figma_connections')
      .select('id, figma_file_id')
      .eq('id', connectionId)
      .eq('user_id', userId)
      .single();

    if (connectionError || !connection) {
      return res.status(404).json({ message: 'Connection not found' });
    }

    // Get API key from request
    const apiKey = req.headers['x-figma-api-key'] as string;
    if (!apiKey) {
      return res.status(400).json({ message: 'Figma API key required' });
    }

    // Fetch current components from Figma
    const figmaResponse = await fetch(
      `https://api.figma.com/v1/files/${connection.figma_file_id}/components`,
      {
        headers: {
          'X-Figma-Token': apiKey,
        },
      }
    );

    if (!figmaResponse.ok) {
      return res.status(figmaResponse.status).json({ 
        message: 'Failed to fetch components from Figma'
      });
    }

    const figmaData = await figmaResponse.json();
    const figmaComponents = Object.entries(figmaData.meta?.components || {});

    // Get existing mappings
    const { data: existingMappings } = await supabaseAdmin
      .from('component_mappings')
      .select('figma_component_id')
      .eq('connection_id', connectionId);

    const existingIds = new Set(existingMappings?.map(m => m.figma_component_id) || []);
    
    // Find new components that don't have mappings yet
    const newComponents = figmaComponents.filter(([id]) => !existingIds.has(id));

    // Create suggested mappings for new components
    const suggestions = newComponents.map(([id, component]: [string, any]) => ({
      figmaComponentId: id,
      figmaComponentName: component.name,
      suggestedLocalPath: `src/components/${component.name.replace(/[^a-zA-Z0-9]/g, '')}.tsx`,
      description: component.description || ''
    }));

    // Record sync in history
    await supabaseAdmin
      .from('sync_history')
      .insert({
        connection_id: connectionId,
        sync_type: 'component_discovery',
        status: 'success',
        details: {
          totalComponents: figmaComponents.length,
          newComponents: newComponents.length,
          existingMappings: existingIds.size
        }
      });

    res.json({
      totalComponents: figmaComponents.length,
      newComponents: newComponents.length,
      existingMappings: existingIds.size,
      suggestions
    });
  } catch (error) {
    console.error('Error syncing components:', error);
    
    // Record error in history
    await supabaseAdmin
      .from('sync_history')
      .insert({
        connection_id: req.params.connectionId,
        sync_type: 'component_discovery',
        status: 'error',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });

    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;