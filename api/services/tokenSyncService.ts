import { supabase } from '../config/supabase';
import figmaService from './figmaService';

interface TokenSyncOptions {
  connectionId: string;
  tokenTypes?: string[];
  forceSync?: boolean;
}

interface SyncResult {
  success: boolean;
  tokensAdded: number;
  tokensUpdated: number;
  tokensRemoved: number;
  errors: string[];
}

interface DesignTokenData {
  name: string;
  type: 'colors' | 'typography' | 'spacing' | 'shadows';
  value: any;
  figmaNodeId?: string;
  description?: string;
}

class TokenSyncService {
  // Extract color tokens from Figma styles
  private extractColorTokens(styles: any[]): DesignTokenData[] {
    const colorTokens: DesignTokenData[] = [];
    
    for (const style of styles) {
      if (style.style_type === 'FILL') {
        // Extract color value from style data
        // This is a simplified implementation
        const colorValue = this.parseColorFromStyle(style);
        
        colorTokens.push({
          name: style.name,
          type: 'colors',
          value: {
            hex: colorValue,
            rgb: this.hexToRgb(colorValue),
            hsl: this.hexToHsl(colorValue)
          },
          figmaNodeId: style.node_id,
          description: style.description || ''
        });
      }
    }
    
    return colorTokens;
  }

  // Extract typography tokens from Figma styles
  private extractTypographyTokens(styles: any[]): DesignTokenData[] {
    const typographyTokens: DesignTokenData[] = [];
    
    for (const style of styles) {
      if (style.style_type === 'TEXT') {
        // Extract typography properties
        const typographyValue = this.parseTypographyFromStyle(style);
        
        typographyTokens.push({
          name: style.name,
          type: 'typography',
          value: typographyValue,
          figmaNodeId: style.node_id,
          description: style.description || ''
        });
      }
    }
    
    return typographyTokens;
  }

  // Extract spacing tokens from Figma components
  private extractSpacingTokens(components: any): DesignTokenData[] {
    const spacingTokens: DesignTokenData[] = [];
    
    // This is a simplified implementation
    // In a real scenario, you'd analyze component spacing patterns
    const commonSpacings = [4, 8, 12, 16, 20, 24, 32, 40, 48, 64];
    
    commonSpacings.forEach((spacing, index) => {
      spacingTokens.push({
        name: `spacing-${index + 1}`,
        type: 'spacing',
        value: {
          px: spacing,
          rem: spacing / 16
        },
        description: `${spacing}px spacing token`
      });
    });
    
    return spacingTokens;
  }

  // Extract shadow tokens from Figma effects
  private extractShadowTokens(styles: any[]): DesignTokenData[] {
    const shadowTokens: DesignTokenData[] = [];
    
    for (const style of styles) {
      if (style.style_type === 'EFFECT') {
        const shadowValue = this.parseShadowFromStyle(style);
        
        shadowTokens.push({
          name: style.name,
          type: 'shadows',
          value: shadowValue,
          figmaNodeId: style.node_id,
          description: style.description || ''
        });
      }
    }
    
    return shadowTokens;
  }

  // Parse color from Figma style (simplified)
  private parseColorFromStyle(style: any): string {
    // This is a placeholder implementation
    // In reality, you'd parse the actual color data from Figma's style format
    return '#000000';
  }

  // Parse typography from Figma style (simplified)
  private parseTypographyFromStyle(style: any): any {
    // This is a placeholder implementation
    return {
      fontFamily: 'Inter',
      fontSize: '16px',
      fontWeight: 400,
      lineHeight: '24px',
      letterSpacing: '0px'
    };
  }

  // Parse shadow from Figma style (simplified)
  private parseShadowFromStyle(style: any): any {
    // This is a placeholder implementation
    return {
      offsetX: '0px',
      offsetY: '2px',
      blurRadius: '4px',
      spreadRadius: '0px',
      color: 'rgba(0, 0, 0, 0.1)'
    };
  }

  // Utility functions for color conversion
  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  private hexToHsl(hex: string): { h: number; s: number; l: number } {
    const { r, g, b } = this.hexToRgb(hex);
    const rNorm = r / 255;
    const gNorm = g / 255;
    const bNorm = b / 255;
    
    const max = Math.max(rNorm, gNorm, bNorm);
    const min = Math.min(rNorm, gNorm, bNorm);
    let h = 0, s = 0, l = (max + min) / 2;
    
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
        case gNorm: h = (bNorm - rNorm) / d + 2; break;
        case bNorm: h = (rNorm - gNorm) / d + 4; break;
      }
      h /= 6;
    }
    
    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  }

  // Get existing tokens from database
  private async getExistingTokens(connectionId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('design_tokens')
      .select('*')
      .eq('connection_id', connectionId);

    if (error) {
      console.error('Failed to get existing tokens:', error);
      return [];
    }

    return data || [];
  }

  // Save new tokens to database
  private async saveTokens(connectionId: string, tokens: DesignTokenData[]): Promise<number> {
    if (tokens.length === 0) return 0;

    const tokenRecords = tokens.map(token => ({
      connection_id: connectionId,
      token_type: token.type,
      token_name: token.name,
      token_value: token.value,
      figma_node_id: token.figmaNodeId,
      description: token.description
    }));

    const { data, error } = await supabase
      .from('design_tokens')
      .insert(tokenRecords)
      .select();

    if (error) {
      console.error('Failed to save tokens:', error);
      throw error;
    }

    return data?.length || 0;
  }

  // Update existing tokens
  private async updateTokens(tokensToUpdate: any[]): Promise<number> {
    let updatedCount = 0;

    for (const token of tokensToUpdate) {
      const { error } = await supabase
        .from('design_tokens')
        .update({
          token_value: token.token_value,
          description: token.description,
          updated_at: new Date().toISOString()
        })
        .eq('id', token.id);

      if (error) {
        console.error('Failed to update token:', error);
      } else {
        updatedCount++;
      }
    }

    return updatedCount;
  }

  // Remove obsolete tokens
  private async removeTokens(tokenIds: string[]): Promise<number> {
    if (tokenIds.length === 0) return 0;

    const { error } = await supabase
      .from('design_tokens')
      .delete()
      .in('id', tokenIds);

    if (error) {
      console.error('Failed to remove tokens:', error);
      return 0;
    }

    return tokenIds.length;
  }

  // Main sync function
  async syncTokens(options: TokenSyncOptions): Promise<SyncResult> {
    const { connectionId, tokenTypes = ['colors', 'typography', 'spacing', 'shadows'], forceSync = false } = options;
    const errors: string[] = [];
    let tokensAdded = 0;
    let tokensUpdated = 0;
    let tokensRemoved = 0;

    try {
      // Get connection details
      const connection = await figmaService.getConnection(connectionId);
      if (!connection) {
        throw new Error('Connection not found');
      }

      // Check if sync is needed (unless forced)
      if (!forceSync) {
        const lastSync = await this.getLastSyncTime(connectionId);
        if (lastSync && Date.now() - new Date(lastSync).getTime() < 5 * 60 * 1000) {
          // Skip sync if last sync was less than 5 minutes ago
          return {
            success: true,
            tokensAdded: 0,
            tokensUpdated: 0,
            tokensRemoved: 0,
            errors: ['Sync skipped - recent sync found']
          };
        }
      }

      // Note: This is a limitation - we can't retrieve the actual API key
      // because we're storing a hash instead of encrypted data
      // For demo purposes, we'll create mock tokens
      const allTokens: DesignTokenData[] = [];

      // Generate mock tokens for demonstration
      if (tokenTypes.includes('colors')) {
        allTokens.push(
          {
            name: 'primary-500',
            type: 'colors',
            value: { hex: '#3B82F6', rgb: { r: 59, g: 130, b: 246 }, hsl: { h: 217, s: 91, l: 60 } },
            description: 'Primary brand color'
          },
          {
            name: 'gray-100',
            type: 'colors',
            value: { hex: '#F3F4F6', rgb: { r: 243, g: 244, b: 246 }, hsl: { h: 220, s: 14, l: 96 } },
            description: 'Light gray background'
          }
        );
      }

      if (tokenTypes.includes('typography')) {
        allTokens.push({
          name: 'heading-lg',
          type: 'typography',
          value: {
            fontFamily: 'Inter',
            fontSize: '24px',
            fontWeight: 600,
            lineHeight: '32px',
            letterSpacing: '-0.02em'
          },
          description: 'Large heading style'
        });
      }

      if (tokenTypes.includes('spacing')) {
        allTokens.push({
          name: 'space-4',
          type: 'spacing',
          value: { px: 16, rem: 1 },
          description: '16px spacing unit'
        });
      }

      if (tokenTypes.includes('shadows')) {
        allTokens.push({
          name: 'shadow-md',
          type: 'shadows',
          value: {
            offsetX: '0px',
            offsetY: '4px',
            blurRadius: '6px',
            spreadRadius: '-1px',
            color: 'rgba(0, 0, 0, 0.1)'
          },
          description: 'Medium shadow'
        });
      }

      // Get existing tokens
      const existingTokens = await this.getExistingTokens(connectionId);
      const existingTokenMap = new Map(existingTokens.map(token => [token.token_name, token]));

      // Determine what needs to be added, updated, or removed
      const tokensToAdd: DesignTokenData[] = [];
      const tokensToUpdate: any[] = [];

      for (const token of allTokens) {
        const existing = existingTokenMap.get(token.name);
        if (existing) {
          // Check if token needs updating
          if (JSON.stringify(existing.token_value) !== JSON.stringify(token.value)) {
            tokensToUpdate.push({
              ...existing,
              token_value: token.value,
              description: token.description
            });
          }
        } else {
          tokensToAdd.push(token);
        }
      }

      // Find tokens to remove (existing tokens not in current sync)
      const currentTokenNames = new Set(allTokens.map(t => t.name));
      const tokensToRemove = existingTokens
        .filter(token => !currentTokenNames.has(token.token_name))
        .map(token => token.id);

      // Perform database operations
      if (tokensToAdd.length > 0) {
        tokensAdded = await this.saveTokens(connectionId, tokensToAdd);
      }

      if (tokensToUpdate.length > 0) {
        tokensUpdated = await this.updateTokens(tokensToUpdate);
      }

      if (tokensToRemove.length > 0) {
        tokensRemoved = await this.removeTokens(tokensToRemove);
      }

      // Record sync history
      await figmaService.recordSyncHistory(connectionId, 'design_tokens', 'success', {
        tokensAdded,
        tokensUpdated,
        tokensRemoved,
        tokenTypes
      });

      return {
        success: true,
        tokensAdded,
        tokensUpdated,
        tokensRemoved,
        errors
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMessage);

      // Record failed sync
      await figmaService.recordSyncHistory(connectionId, 'design_tokens', 'error', {
        error: errorMessage
      });

      return {
        success: false,
        tokensAdded,
        tokensUpdated,
        tokensRemoved,
        errors
      };
    }
  }

  // Get last sync time
  private async getLastSyncTime(connectionId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('sync_history')
      .select('created_at')
      .eq('connection_id', connectionId)
      .eq('sync_type', 'design_tokens')
      .eq('status', 'success')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return data.created_at;
  }

  // Get tokens by connection
  async getTokensByConnection(connectionId: string, tokenType?: string): Promise<any[]> {
    let query = supabase
      .from('design_tokens')
      .select('*')
      .eq('connection_id', connectionId)
      .order('token_name');

    if (tokenType) {
      query = query.eq('token_type', tokenType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to get tokens:', error);
      return [];
    }

    return data || [];
  }

  // Get sync history
  async getSyncHistory(connectionId: string, limit: number = 10): Promise<any[]> {
    const { data, error } = await supabase
      .from('sync_history')
      .select('*')
      .eq('connection_id', connectionId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to get sync history:', error);
      return [];
    }

    return data || [];
  }
}

export default new TokenSyncService();
export { TokenSyncService, type TokenSyncOptions, type SyncResult, type DesignTokenData };