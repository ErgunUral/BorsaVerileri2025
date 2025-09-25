import crypto from 'crypto';
import { supabase } from '../config/supabase';

// Types for Figma API responses
interface FigmaConnection {
  id: string;
  user_id: string;
  file_id: string;
  file_name: string;
  api_key_hash: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface DesignToken {
  id: string;
  connection_id: string;
  token_type: 'colors' | 'typography' | 'spacing' | 'shadows';
  token_name: string;
  token_value: any;
  figma_node_id?: string;
  created_at: string;
  updated_at: string;
}

interface ComponentMapping {
  id?: string;
  connectionId: string;
  figmaComponentId: string;
  reactComponentName: string;
  propMappings: Record<string, any>;
  autoSync?: boolean;
}

interface SyncResult {
  tokensUpdated: number;
  tokensAdded: number;
  tokensRemoved: number;
  syncedAt: Date;
}

interface FigmaFileResponse {
  document: {
    id: string;
    name: string;
    type: string;
    children: any[];
  };
  components: Record<string, any>;
  styles: Record<string, any>;
}

interface FigmaStylesResponse {
  meta: {
    styles: Array<{
      key: string;
      file_key: string;
      node_id: string;
      style_type: string;
      thumbnail_url: string;
      name: string;
      description: string;
      created_at: string;
      updated_at: string;
      user: {
        id: string;
        handle: string;
        img_url: string;
      };
      sort_position: string;
    }>;
  };
}

class FigmaService {
  private baseUrl = 'https://api.figma.com/v1';

  // Hash API key for secure storage
  private hashApiKey(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }

  // Make authenticated request to Figma API
  private async makeRequest(endpoint: string, apiKey: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'X-Figma-Token': apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Figma API error: ${response.status} - ${errorData.message || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Figma API request failed:', error);
      throw error;
    }
  }

  // Test Figma API connection
  async testConnection(apiKey: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/me`, {
        headers: {
          'X-Figma-Token': apiKey
        }
      });

      if (response.ok) {
        const userData = await response.json();
        return {
          success: true,
          message: `Connected successfully as ${userData.handle || 'Unknown User'}`
        };
      } else {
        return {
          success: false,
          message: 'Invalid API key or connection failed'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to connect to Figma API'
      };
    }
  }

  // Get Figma file information
  async getFileInfo(fileId: string, apiKey: string): Promise<FigmaFileResponse> {
    return await this.makeRequest(`/files/${fileId}`, apiKey);
  }

  // Create new Figma connection
  async createConnection(userId: string, fileId: string, fileName: string, apiKey: string): Promise<FigmaConnection> {
    // Test connection first
    const testResult = await this.testConnection(apiKey);
    if (!testResult.success) {
      throw new Error(testResult.message);
    }

    // Verify file access
    try {
      await this.getFileInfo(fileId, apiKey);
    } catch (error) {
      throw new Error('Cannot access the specified Figma file');
    }

    // Hash the API key for storage
    const apiKeyHash = this.hashApiKey(apiKey);

    // Save to Supabase
    const { data, error } = await supabase
      .from('figma_connections')
      .insert({
        user_id: userId,
        file_id: fileId,
        file_name: fileName,
        api_key_hash: apiKeyHash,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to save Figma connection:', error);
      throw new Error('Failed to save connection to database');
    }

    return data;
  }

  // Get connection by ID
  async getConnection(connectionId: string): Promise<FigmaConnection | null> {
    const { data, error } = await supabase
      .from('figma_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Failed to get Figma connection:', error);
      return null;
    }

    return data;
  }

  // Get user connections
  async getUserConnections(userId: string): Promise<FigmaConnection[]> {
    const { data, error } = await supabase
      .from('figma_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to get user connections:', error);
      return [];
    }

    return data || [];
  }

  // Delete connection
  async deleteConnection(connectionId: string, userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('figma_connections')
      .update({ is_active: false })
      .eq('id', connectionId)
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to delete Figma connection:', error);
      return false;
    }

    return true;
  }

  // Get file styles for design tokens
  async getFileStyles(fileId: string, apiKey: string): Promise<FigmaStylesResponse> {
    return await this.makeRequest(`/files/${fileId}/styles`, apiKey);
  }

  // Extract design tokens from Figma file
  async extractDesignTokens(connectionId: string, fileId: string, apiKey: string): Promise<DesignToken[]> {
    try {
      const fileData = await this.getFileInfo(fileId, apiKey);
      const stylesData = await this.getFileStyles(fileId, apiKey);
      
      const tokens: DesignToken[] = [];
      
      // Extract color tokens from styles
      if (stylesData.meta && stylesData.meta.styles) {
        for (const style of stylesData.meta.styles) {
          if (style.style_type === 'FILL') {
            tokens.push({
              id: crypto.randomUUID(),
              connection_id: connectionId,
              token_type: 'colors',
              token_name: style.name,
              token_value: {
                type: 'color',
                value: '#000000', // This would be extracted from actual style data
                description: style.description
              },
              figma_node_id: style.node_id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          }
        }
      }
      
      return tokens;
    } catch (error) {
      console.error('Failed to extract design tokens:', error);
      throw error;
    }
  }

  // Save design tokens to database
  async saveDesignTokens(tokens: DesignToken[]): Promise<boolean> {
    if (tokens.length === 0) return true;

    const { error } = await supabase
      .from('design_tokens')
      .insert(tokens.map(token => ({
        connection_id: token.connection_id,
        token_type: token.token_type,
        token_name: token.token_name,
        token_value: token.token_value,
        figma_node_id: token.figma_node_id
      })));

    if (error) {
      console.error('Failed to save design tokens:', error);
      return false;
    }

    return true;
  }



  // Sync design tokens
  async syncDesignTokens(connectionId: string, tokenTypes?: string[]): Promise<{ success: boolean; tokensCount: number }> {
    try {
      // Get connection from database
      const connection = await this.getConnection(connectionId);
      if (!connection) {
        throw new Error('Connection not found');
      }

      // For now, we'll use a placeholder API key since we can't decrypt the stored hash
      // In a real implementation, you'd need to store the API key encrypted, not hashed
      // This is a limitation of the current design
      throw new Error('API key retrieval not implemented - need to store encrypted keys instead of hashed');
      
      // TODO: Implement proper API key encryption/decryption
      // const apiKey = await this.decryptApiKey(connection.api_key_hash);
      // const tokens = await this.extractDesignTokens(connectionId, connection.file_id, apiKey);
      // const saved = await this.saveDesignTokens(tokens);
      
      // return {
      //   success: saved,
      //   tokensCount: tokens.length
      // };
    } catch (error) {
      console.error('Failed to sync design tokens:', error);
      throw error;
    }
  }

  // Record sync history
  async recordSyncHistory(connectionId: string, syncType: string, status: 'success' | 'error', details?: any): Promise<void> {
    const { error } = await supabase
      .from('sync_history')
      .insert({
        connection_id: connectionId,
        sync_type: syncType,
        status,
        details
      });

    if (error) {
      console.error('Failed to record sync history:', error);
    }
  }

  async getDesignTokens(connectionId: string, tokenType?: string): Promise<any[]> {
    try {
      let query = supabase
        .from('design_tokens')
        .select('*')
        .eq('connection_id', connectionId);

      if (tokenType) {
        query = query.eq('token_type', tokenType);
      }

      const { data, error } = await query.order('token_name');

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching design tokens:', error);
      throw error;
    }
  }

  async createComponentMapping(mapping: ComponentMapping): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('component_mappings')
        .insert({
          connection_id: mapping.connectionId,
          figma_component_id: mapping.figmaComponentId,
          react_component_name: mapping.reactComponentName,
          prop_mappings: mapping.propMappings,
          auto_sync: mapping.autoSync || false
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error creating component mapping:', error);
      throw error;
    }
  }

  async getComponentMappings(connectionId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('component_mappings')
        .select('*')
        .eq('connection_id', connectionId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching component mappings:', error);
      throw error;
    }
  }

  async getSyncHistory(connectionId: string, limit: number = 10): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('sync_history')
        .select('*')
        .eq('connection_id', connectionId)
        .order('synced_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching sync history:', error);
      throw error;
    }
  }

  async deleteConnection(connectionId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('figma_connections')
        .delete()
        .eq('id', connectionId);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('Error deleting connection:', error);
      throw error;
    }
  }

}

export default new FigmaService();
export { FigmaService };